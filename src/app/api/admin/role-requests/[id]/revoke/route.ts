import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server/server';
import { createAdminClient } from '@/lib/supabase/server/admin';
import { emailService } from '@/services/emailService';
import { isVenuesEnabled } from '@/lib/network';

interface RoleRow { role: string }

/**
 * POST /api/admin/role-requests/:id/revoke
 * Body: { note?: string }
 * Revokes an approved role request and removes the associated user role.
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

    // Roles check - only admins can revoke role requests (excluding revoked admins)
    const { data: rolesData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).is('revoked_at', null);
    const roles = (rolesData as RoleRow[] | null || []).map(r => r.role);
    const isAdmin = roles.some(r => ['admin','super_admin','support_agent'].includes(r));
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const note: string | null = (body?.note || '').trim() || null;

    // Fetch role request - use admin client to bypass RLS
    const { data: rr, error: rrErr } = await adminSupabase
      .from('role_requests')
      .select('*')
      .eq('id', requestId)
      .single();
    
    if (rrErr || !rr) {
      return NextResponse.json({ error: 'Role request not found' }, { status: 404 });
    }

    if (rr.request_type === 'venue_owner' && !isVenuesEnabled()) {
      return NextResponse.json({ error: 'Venue owner role workflow is temporarily disabled' }, { status: 409 });
    }
    
    // Only approved requests can be revoked
    if (rr.status !== 'approved') {
      return NextResponse.json({ 
        error: `Cannot revoke request with status '${rr.status}'. Only approved requests can be revoked.` 
      }, { status: 400 });
    }

    // Update role request status to 'cancelled' (database constraint doesn't allow 'revoked')
    // The 'cancelled' status is used for approved requests that are later revoked
    const { data: updated, error: updErr } = await adminSupabase
      .from('role_requests')
      .update({ 
        status: 'cancelled', 
        reviewed_at: new Date().toISOString(), 
        reviewed_by: user.id, 
        rejection_reason: note ? `[Revoked] ${note}` : '[Revoked by admin]'
      })
      .eq('id', requestId)
      .select('*')
      .single();
    
    if (updErr || !updated) {
      console.error('[Revoke API] Update error:', updErr);
      return NextResponse.json({ error: 'Failed to update request', details: updErr }, { status: 500 });
    }

    console.log(`[Revoke API] Successfully updated request ${requestId} to revoked`);

    // Set revoked_at timestamp on the user role instead of deleting it (preserves audit trail)
    const desiredRole = updated.request_type === 'organizer' ? 'organizer' : 'venue_owner';
    
    console.log(`[Revoke] Revoking role: userId=${updated.user_id}, role=${desiredRole}, revokedBy=${user.id}`);
    
    const { error: roleRevocationErr } = await adminSupabase
      .from('user_roles')
      .update({ 
        revoked_at: new Date().toISOString(),
        revoked_by: user.id
      })
      .eq('user_id', updated.user_id)
      .eq('role', desiredRole);
    
    if (roleRevocationErr) {
      console.error('[Revoke] Failed to revoke role:', roleRevocationErr);
      return NextResponse.json({ error: 'Failed to revoke role access', details: roleRevocationErr }, { status: 500 });
    }
    
    console.log(`[Revoke] Successfully revoked role`);

    // Organizer profile handling - if organizer role is revoked, we might want to deactivate organizer profile
    let organizerSync: { deactivated?: boolean } = {};
    if (updated.request_type === 'organizer') {
      try {
        // Update organizer status to inactive (don't delete, preserve data) - use admin client
        const { error: orgErr } = await adminSupabase
          .from('organizers')
          .update({ 
            status: 'inactive',
            verified: false
          })
          .eq('user_id', updated.user_id);
        
        if (!orgErr) {
          organizerSync.deactivated = true;
        }
      } catch (orgError) {
        // Non-fatal, continue with revocation
      }
    }

    // 🔴 CRITICAL: Broadcast role revocation event for real-time listener
    try {
      const revokedRole = updated.request_type === 'organizer' ? 'organizer' : 'venue_owner';
      const channel = adminSupabase.channel(`role-revocation-${updated.user_id}`);
      
      // Subscribe to the channel first, then send the broadcast
      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.send({
            type: 'broadcast',
            event: 'role_revoked',
            payload: {
              userId: updated.user_id,
              revokedRole: revokedRole,
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
      
      // Notify the user whose role was revoked
      await adminSupabase.rpc('notify_user', {
        p_user_id: updated.user_id,
        p_title: 'Role Revoked',
        p_message: `Your ${roleLabel} role has been revoked.${note ? ' Reason: ' + note : ''}`,
        p_type: 'role_request',
        p_link: '/dashboards/user',
        p_metadata: { 
          requestId: updated.id, 
          requestType: updated.request_type, 
          status: 'revoked', 
          reviewed_by: user.id 
        },
        p_priority: 'high',
        p_created_by: user.id,
        p_is_admin_notification: false
      });
      console.log(`[Revoke API] User notification sent`);

      // Broadcast to all admins
      await adminSupabase.rpc('notify_admins', {
        p_title: 'Role Request Revoked',
        p_message: `${roleLabel} role for ${updated.user_name} (${updated.user_email}) was revoked by ${user.id}.`,
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
      console.log(`[Revoke API] Admin notification sent`);
    } catch (notifErr) {
      console.warn('[Revoke API] Notification failed (non-fatal):', notifErr);
    }

    // Role Request Revocation Email
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
          subject: 'Administrative Action: Role Revoked',
          type: 'auth',
          templateType: 'role_request_revoked',
          templateData: {
            customerName: profile.full_name || 'there',
            roleLabel: roleLabel,
            note: note || undefined
          }
        });
        console.log(`✅ Revocation email sent to ${profile.email}`);
      }
    } catch (emailErr) {
      console.warn('⚠️ Revocation email failed (non-fatal):', emailErr);
    }

    // Audit log
    try {
      const roleLabel = updated.request_type === 'organizer' ? 'Event Organizer' : 'Venue Owner';
      const { error: auditError } = await adminSupabase.from('admin_audit_logs').insert({
        action: 'role_request_revoke',
        performed_by: user.id,
        target_user: updated.user_id,
        details: { 
          requestId, 
          note,
          previousStatus: rr.status,
          organizerSync,
          title: 'Role Request Revoked',
          description: `${roleLabel} role for ${updated.user_name || updated.user_email} was revoked${note ? '. Reason: ' + note : ''}`,
          action_type: 'role_request_revoke',
          target_type: 'role_request',
          status: 'success',
          admin_user_name: user.email?.split('@')[0] || 'Admin',
          admin_user_role: roles.includes('super_admin') ? 'super_admin' : 'admin',
          target_name: updated.user_name,
          target_email: updated.user_email,
          revocation_reason: note
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
        rejectionNote: updated.notes,
        submittedAt: updated.submitted_at,
        reviewedAt: updated.reviewed_at,
        reviewedBy: updated.reviewed_by,
        createdAt: updated.submitted_at,
      },
      organizerSync
    });
  } catch (e) {
    console.error('[Role Revoke] Error:', e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: 'Internal Server Error', details: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
