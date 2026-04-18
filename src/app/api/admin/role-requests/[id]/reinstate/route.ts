import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server/server';
import { createAdminClient } from '@/lib/supabase/server/admin';
import { emailService } from '@/services/emailService';
import { isVenuesEnabled } from '@/lib/network';

interface RoleRow { role: string }

/**
 * POST /api/admin/role-requests/:id/reinstate
 * Body: { note?: string }
 * Reinstates a revoked role request and re-grants the associated user role.
 * Sends notifications (best-effort) and writes audit log.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: requestId } = await params;
  
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Roles check - only admins can reinstate role requests (excluding revoked admins)
    const { data: rolesData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).is('revoked_at', null);
    const roles = (rolesData as RoleRow[] | null || []).map(r => r.role);
    const isAdmin = roles.some(r => ['admin','super_admin','support_agent'].includes(r));
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const note: string | null = (body?.note || '').trim() || null;

    // Fetch role request
    const { data: rr, error: rrErr } = await adminSupabase
      .from('role_requests')
      .select('*')
      .eq('id', requestId)
      .single();
      
    if (rrErr || !rr) {
      return NextResponse.json({ error: 'Role request not found' }, { status: 404 });
    }

    if (rr.request_type === 'venue_owner' && !isVenuesEnabled()) {
      return NextResponse.json({ error: 'Venue owner reinstatements are temporarily disabled' }, { status: 409 });
    }
    
    // Only revoked/cancelled requests can be reinstated
    // Note: 'cancelled' is used because database constraint doesn't allow 'revoked'
    // Revoked requests have rejection_reason starting with '[Revoked]'
    if (rr.status !== 'cancelled') {
      return NextResponse.json({ 
        error: `Cannot reinstate request with status '${rr.status}'. Only cancelled/revoked requests can be reinstated.` 
      }, { status: 400 });
    }

    // CRITICAL: Check role revocation status BEFORE updating role_requests
    // The role_requests table has a trigger that clears revoked_at when status='approved'
    // So we must query the role BEFORE changing the request status
    const desiredRole = rr.request_type === 'organizer' ? 'organizer' : 'venue_owner';
    
    let reinstatedAt: string | null = null;
    let reinstatementCount: number = 0;
    
    const { data: existingRole, error: roleQueryError } = await adminSupabase
      .from('user_roles')
      .select('user_id, role, revoked_at, reinstatement_count')
      .eq('user_id', rr.user_id)
      .eq('role', desiredRole)
      .maybeSingle();
    
    if (roleQueryError) {
      console.error('[Reinstate] Error querying existing role:', roleQueryError);
    }
    
    console.log(`[Reinstate] Existing role check (BEFORE status update): userId=${rr.user_id}, role=${desiredRole}, found=${!!existingRole}, revoked_at=${existingRole?.revoked_at}, reinstatement_count=${existingRole?.reinstatement_count}`);
    
    // Capture the revocation state NOW before the trigger clears it
    const wasRevoked = !!existingRole?.revoked_at;
    const currentReinstatementCount = existingRole?.reinstatement_count || 0;
    
    console.log(`[Reinstate] Captured state: wasRevoked=${wasRevoked}, currentCount=${currentReinstatementCount}`);

    // Update role request status to 'approved'
    // NOTE: This will trigger auto_grant_role_on_approval() which sets revoked_at=NULL
    const { data: updated, error: updErr } = await adminSupabase
      .from('role_requests')
      .update({ 
        status: 'approved', 
        reviewed_at: new Date().toISOString(), 
        reviewed_by: user.id, 
        review_notes: note // Match schema
      })
      .eq('id', requestId)
      .select('*')
      .single();
      
    if (updErr || !updated) {
      console.error('Reinstate update error:', updErr);
      return NextResponse.json({ error: 'Failed to update request', details: updErr }, { status: 500 });
    }

    // Now update reinstatement tracking (the trigger already cleared revoked_at)
    // We use the wasRevoked flag we captured BEFORE the trigger ran
    if (existingRole && wasRevoked) {
      const newReinstatedAt = new Date().toISOString();
      const newReinstatementCount = currentReinstatementCount + 1;
      
      console.log(`[Reinstate] Updating reinstatement tracking: reinstatedAt=${newReinstatedAt}, count=${newReinstatementCount}, adminUserId=${user.id}`);
      
      const { error: reinstateErr } = await adminSupabase
        .from('user_roles')
        .update({
          reinstated_at: newReinstatedAt,
          reinstated_by: user.id,
          reinstatement_count: newReinstatementCount
        })
        .eq('user_id', rr.user_id)
        .eq('role', desiredRole);
      
      if (reinstateErr) {
        console.error('[Reinstate] Failed to update reinstatement tracking:', reinstateErr);
      } else {
        // Successfully updated reinstatement tracking
        reinstatedAt = newReinstatedAt;
        reinstatementCount = newReinstatementCount;
        console.log(`[Reinstate] Successfully updated reinstatement tracking`);
      }
    } else if (!existingRole) {
      console.log(`[Reinstate] No existing role found, trigger should have created it`);
    } else {
      console.log(`[Reinstate] Role was not revoked (wasRevoked=${wasRevoked}), no reinstatement tracking needed`);
    }

    // Organizer profile handling - if organizer role is reinstated, we might want to reactivate organizer profile
    let organizerSync: { reactivated?: boolean } = {};
    if (updated.request_type === 'organizer') {
      
      try {
        // Update organizer status to active - use admin client
        const { error: orgErr } = await adminSupabase
          .from('organizers')
          .update({ 
            status: 'active'
          })
          .eq('user_id', updated.user_id);
        
        if (!orgErr) {
          organizerSync.reactivated = true;
        }
      } catch (orgError) {
        // Non-fatal, continue with reinstatement
      }
    }

    // 🔴 CRITICAL: Broadcast role reinstatement event for real-time listener
    try {
      const reinstatedRole = updated.request_type === 'organizer' ? 'organizer' : 'venue_owner';
      
      const channel = adminSupabase.channel(`role-reinstatement-${updated.user_id}`);
      
      // Subscribe to the channel first, then send the broadcast
      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.send({
            type: 'broadcast',
            event: 'role_reinstated',
            payload: {
              userId: updated.user_id,
              reinstatedRole: reinstatedRole,
              timestamp: new Date().toISOString(),
              reason: note || 'No reason provided'
            }
          });
          
          // Unsubscribe after sending
          await adminSupabase.removeChannel(channel);
        }
      });
    } catch (broadcastErr) {
      // Broadcast failed - non-fatal
    }

    // Notifications (best-effort)
    try {
      const roleLabel = updated.request_type === 'organizer' ? 'Event Organizer' : 'Venue Owner';
      
      // Notify the user whose role was reinstated
      await adminSupabase.rpc('notify_user', {
        p_user_id: updated.user_id,
        p_title: 'Role Reinstated',
        p_message: `Your ${roleLabel} role has been reinstated.${note ? ' Note: ' + note : ''}`,
        p_type: 'role_request',
        p_link: '/dashboards/user',
        p_metadata: { 
          requestId: updated.id, 
          requestType: updated.request_type, 
          status: 'approved', 
          reviewed_by: user.id 
        },
        p_priority: 'high',
        p_created_by: user.id,
        p_is_admin_notification: false
      });

      // Broadcast to all admins
      await adminSupabase.rpc('notify_admins', {
        p_title: 'Role Request Reinstated',
        p_message: `${roleLabel} role for ${updated.user_name} (${updated.user_email}) was reinstated by ${user.id}.`,
        p_type: 'role_request',
        p_link: `/admin/role-requests?requestId=${updated.id}`,
        p_metadata: { 
          requestId: updated.id, 
          userId: updated.user_id, 
          reviewed_by: user.id,
          reason: note 
        },
        p_priority: 'normal',
        p_created_by: user.id
      });
    } catch (notifErr) {
      // Notification failed - non-fatal
    }

    // Role Request Reinstatement Email
    try {
      const roleLabel = updated.request_type === 'organizer' ? 'Event Organizer' : 'Venue Owner';
      const { data: profile } = await adminSupabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', updated.user_id)
        .single();

      if (profile?.email) {
        await emailService.sendConfirmation({
          to: profile.email,
          subject: 'Access Restored: Your Role has been Reinstated!',
          type: 'auth',
          templateType: 'role_request_approved',
          templateData: {
            customerName: profile.full_name || 'there',
            roleLabel: roleLabel,
            note: note || undefined
          }
        });
        console.log(`✅ Reinstatement email sent to ${profile.email}`);
      }
    } catch (emailErr) {
      console.warn('⚠️ Reinstatement email failed (non-fatal):', emailErr);
    }

    // Audit log
    try {
      const roleLabel = updated.request_type === 'organizer' ? 'Event Organizer' : 'Venue Owner';
      const { error: auditError } = await adminSupabase.from('admin_audit_logs').insert({
        action: 'role_request_reinstate',
        performed_by: user.id,
        target_user: updated.user_id,
        details: { 
          requestId, 
          note,
          previousStatus: rr.status,
          organizerSync,
          title: 'Role Request Reinstated',
          description: `${roleLabel} role for ${updated.user_name || updated.user_email} was reinstated${note ? '. Note: ' + note : ''}`,
          action_type: 'role_request_reinstate',
          target_type: 'role_request',
          status: 'success',
          admin_user_name: user.email?.split('@')[0] || 'Admin',
          admin_user_role: roles.includes('super_admin') ? 'super_admin' : 'admin',
          target_name: updated.user_name,
          target_email: updated.user_email,
          reinstatement_count: reinstatementCount,
          reinstatement_note: note
        },
        created_at: new Date().toISOString()
      } as any);
      
      if (auditError) {
        console.warn('⚠️ Audit log failed:', auditError.message);
      }
    } catch (auditErr) {
      console.warn('⚠️ Audit log failed (non-fatal):', auditErr instanceof Error ? auditErr.message : String(auditErr));
    }

    return NextResponse.json({
      request: {
        id: updated.id,
        userId: updated.user_id,
        userName: updated.user_name,
        userEmail: updated.user_email,
        requestType: updated.request_type,
        companyName: updated.company_name,
        businessEmail: updated.business_email,
        businessPhone: updated.business_phone,
        idType: updated.id_type,
        idNumber: updated.id_number,
        idImage: updated.id_image_url,
        selfieWithId: updated.selfie_with_id_url,
        reason: updated.reason,
        status: updated.status,
        rejectionNote: updated.review_notes,
        submittedAt: updated.submitted_at,
        reviewedAt: updated.reviewed_at,
        reviewedBy: updated.reviewed_by,
        createdAt: updated.submitted_at,
        reinstatedAt: reinstatedAt,
        reinstatementCount: reinstatementCount,
      },
      organizerSync
    });
  } catch (e) {
    console.error('[Role Reinstate] Error:', e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
