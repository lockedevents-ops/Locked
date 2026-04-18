import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server/server';
import { createAdminClient } from '@/lib/supabase/server/admin';
import { emailService } from '@/services/emailService';
import { isVenuesEnabled } from '@/lib/network';

// Minimal row interfaces used for explicit typing without generics on Supabase client (Edge runtime limitation)
interface RoleRow { role: string }
interface RoleRequestRow {
  id: string; user_id: string; request_type: 'organizer' | 'venue_owner'; status: string;
  company_name?: string | null; user_name?: string | null; user_email?: string | null;
  business_email?: string | null; business_phone?: string | null; business_category?: string | null;
  id_type?: string | null; id_number?: string | null; id_image_url?: string | null; selfie_with_id_url?: string | null;
  organization_description?: string | null; review_notes?: string | null; submitted_at?: string | null; reviewed_at?: string | null; reviewed_by?: string | null;
}
interface OrganizerRow { id: string; business_name: string }

/**
 * POST /api/admin/role-requests/:id/approve
 * Centralized approval flow (server) to avoid client race conditions.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: requestId } = await params;
  
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 });
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Roles check (excluding revoked admins)
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .is('revoked_at', null);
    const roles = (rolesData as RoleRow[] | null || []).map(r => r.role);
    const isAdmin = roles.some(r => ['admin','super_admin','support_agent'].includes(r));
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch role request - use admin client to bypass RLS
    const { data: rr, error: rrErr } = await adminSupabase
      .from('role_requests')
      .select('*')
      .eq('id', requestId)
      .single();
    const roleRequest = rr as RoleRequestRow | null;
    
    if (rrErr || !roleRequest) {
      return NextResponse.json({ error: 'Role request not found' }, { status: 404 });
    }

    if (roleRequest.request_type === 'venue_owner' && !isVenuesEnabled()) {
      return NextResponse.json({ error: 'Venue owner approvals are temporarily disabled' }, { status: 409 });
    }
    
    if (roleRequest.status !== 'pending' && roleRequest.status !== 'revoked') {
      return NextResponse.json({ error: 'Already processed or not in a states that can be approved' }, { status: 400 });
    }

    // Idempotency guard: if another approved request already exists for this
    // user/type, deduplicate this request instead of failing with a 500 from
    // the unique (user_id, request_type, status) constraint.
    const { data: existingApproved } = await adminSupabase
      .from('role_requests')
      .select('*')
      .eq('user_id', roleRequest.user_id)
      .eq('request_type', roleRequest.request_type)
      .eq('status', 'approved')
      .neq('id', requestId)
      .maybeSingle();

    if (existingApproved) {
      const { error: deleteDuplicateErr } = await adminSupabase
        .from('role_requests')
        .delete()
        .eq('id', requestId);

      if (deleteDuplicateErr) {
        console.warn('[Approve API] Could not delete duplicate pending request:', deleteDuplicateErr);
      }

      return NextResponse.json({
        success: true,
        request: existingApproved,
        deduplicated: true,
        message: 'Request already approved previously; duplicate request removed.'
      });
    }

    // Pre-create organizer profile before status transition so legacy DB triggers
    // (user_roles -> organizers) cannot fail on missing contact data.
    if (roleRequest.request_type === 'organizer') {
      const { data: existingOrg } = await adminSupabase
        .from('organizers')
        .select('id')
        .eq('user_id', roleRequest.user_id)
        .maybeSingle();

      if (!existingOrg) {
        const { data: profile } = await adminSupabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', roleRequest.user_id)
          .maybeSingle();

        const seedName = roleRequest.company_name?.trim()
          || profile?.full_name
          || roleRequest.user_name
          || profile?.email?.split('@')[0]
          || 'Event Organizer';
        const seedEmail = profile?.email
          || roleRequest.user_email
          || roleRequest.business_email
          || 'no-reply@locked.local';

        const { error: seedOrgErr } = await adminSupabase
          .from('organizers')
          .insert({
            user_id: roleRequest.user_id,
            business_name: seedName,
            contact_email: seedEmail,
            business_description: 'Event organizer on Locked platform.',
            business_category: roleRequest.business_category || 'Events',
            status: 'active'
          });

        if (seedOrgErr && seedOrgErr.code !== '23505') {
          console.error('[Approve API] Failed to seed organizer profile:', seedOrgErr);
          return NextResponse.json({ error: 'Failed to prepare organizer profile', details: seedOrgErr.message }, { status: 500 });
        }
      }
    }

    // Update role request -> approved - use admin client to bypass RLS
    const { data: updated, error: updErr } = await adminSupabase
      .from('role_requests')
      .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: user.id })
      .eq('id', requestId)
      .select('*')
      .single();
      
    if (updErr || !updated) {
      // Handle race condition where another approval wins between pre-check and update.
      if (updErr?.code === '23505' && /role_requests_user_id_request_type_status_key/.test(updErr?.message || '')) {
        const { data: approvedAfterConflict } = await adminSupabase
          .from('role_requests')
          .select('*')
          .eq('user_id', roleRequest.user_id)
          .eq('request_type', roleRequest.request_type)
          .eq('status', 'approved')
          .neq('id', requestId)
          .maybeSingle();

        const { error: deleteDuplicateErr } = await adminSupabase
          .from('role_requests')
          .delete()
          .eq('id', requestId);

        if (deleteDuplicateErr) {
          console.warn('[Approve API] Could not delete duplicate pending request after conflict:', deleteDuplicateErr);
        }

        if (approvedAfterConflict) {
          return NextResponse.json({
            success: true,
            request: approvedAfterConflict,
            deduplicated: true,
            message: 'Request was already approved by another operation; duplicate request removed.'
          });
        }
      }

      console.error('[Approve API] Update error:', updErr);
      return NextResponse.json({ error: 'Failed to update request', details: updErr?.message || updErr }, { status: 500 });
    }

    // Insert role (idempotent) - use admin client to bypass RLS
    const desiredRole = (updated as RoleRequestRow).request_type === 'organizer' ? 'organizer' : 'venue_owner';
    
    const { data: existingRole, error: roleQueryError } = await adminSupabase
      .from('user_roles')
      .select('user_id, role, revoked_at')
      .eq('user_id', updated.user_id)
      .eq('role', desiredRole)
      .maybeSingle();
    
    if (roleQueryError) {
      console.error('Error querying existing role:', roleQueryError);
    }
      
    if (!existingRole) {
      // Role doesn't exist, insert it
      const { error: roleInsertError } = await adminSupabase.from('user_roles').insert({
        user_id: updated.user_id,
        role: desiredRole,
        granted_by: user.id,
        granted_at: new Date().toISOString()
      });
      
      if (roleInsertError) {
        if (roleInsertError.code !== '23505') {
          return NextResponse.json({ error: 'Failed to grant role', details: roleInsertError.message }, { status: 500 });
        }
      }
    } else if (existingRole.revoked_at) {
      // Role exists but was revoked, reinstate it
      const { error: reinstateError } = await adminSupabase
        .from('user_roles')
        .update({ 
          revoked_at: null,
          revoked_by: null,
          granted_by: user.id,
          granted_at: new Date().toISOString()
        })
        .eq('user_id', updated.user_id)
        .eq('role', desiredRole);
        
      if (reinstateError) {
        return NextResponse.json({ error: 'Failed to reinstate role', details: reinstateError.message }, { status: 500 });
      }
    }

    // Organizer profile sync
    let organizerSync: { created?: boolean; updatedName?: boolean } = {};
    if ((updated as RoleRequestRow).request_type === 'organizer') {
      const companyName: string | null = (updated as RoleRequestRow).company_name?.trim() || null;
      const { data: existingOrg } = await adminSupabase
        .from('organizers')
        .select('id,business_name')
        .eq('user_id', (updated as RoleRequestRow).user_id)
        .maybeSingle();
        
      if (!existingOrg) {
        const { data: profile } = await adminSupabase.from('profiles').select('email, full_name').eq('id', (updated as RoleRequestRow).user_id).maybeSingle();
        const resolvedName = companyName || profile?.full_name || profile?.email?.split('@')[0] || 'Event Organizer';
        const organizerData = {
          user_id: (updated as RoleRequestRow).user_id,
          business_name: resolvedName,
          contact_email: profile?.email || '',
          business_description: 'Event organizer on Locked platform.',
          business_category: (updated as RoleRequestRow).business_category || 'Events',
          status: 'active'
        };
        const { error: orgErr } = await adminSupabase.from('organizers').insert(organizerData);
        if (!orgErr) organizerSync.created = true;
      } else if (companyName && (existingOrg as OrganizerRow).business_name !== companyName) {
        const { error: nameErr } = await adminSupabase.from('organizers').update({ business_name: companyName }).eq('id', (existingOrg as OrganizerRow).id);
        if (!nameErr) organizerSync.updatedName = true;
      }
    }

    // Notifications (best-effort)
    try {
      const roleLabel = (updated as RoleRequestRow).request_type === 'organizer' ? 'Event Organizer' : 'Venue Owner';
      
      // User notification via RPC
      await adminSupabase.rpc('notify_user', {
        p_user_id: (updated as RoleRequestRow).user_id,
        p_title: 'Role Request Approved',
        p_message: `Your ${roleLabel} role request has been approved.`,
        p_type: 'role_request',
        p_link: '/dashboards/organizer',
        p_metadata: { requestId: (updated as RoleRequestRow).id, requestType: (updated as RoleRequestRow).request_type, status: 'approved', reviewed_by: user.id },
        p_priority: 'normal',
        p_created_by: user.id,
        p_is_admin_notification: false
      });
      
      // Admin notification via RPC
      await adminSupabase.rpc('notify_admins', {
        p_title: 'Role Request Approved',
        p_message: `${roleLabel} role request for ${(updated as RoleRequestRow).user_name} (${(updated as RoleRequestRow).user_email}) was approved by ${user.id}.`,
        p_type: 'role_request',
        p_link: `/admin/role-requests?requestId=${(updated as RoleRequestRow).id}`,
        p_metadata: { requestId: (updated as RoleRequestRow).id, userId: (updated as RoleRequestRow).user_id, reviewed_by: user.id },
        p_priority: 'normal',
        p_created_by: user.id
      });
    } catch (notifErr) {
      console.warn('[Approve API] Notification RPC failed:', notifErr);
    }

    // Email Notification
    try {
      const roleLabel = (updated as RoleRequestRow).request_type === 'organizer' ? 'Event Organizer' : 'Venue Owner';
      const { data: profile } = await adminSupabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', (updated as RoleRequestRow).user_id)
        .single();

      const targetEmail = profile?.email || (updated as RoleRequestRow).user_email || (updated as RoleRequestRow).business_email;
      const targetName = profile?.full_name || (updated as RoleRequestRow).user_name || 'there';

      if (targetEmail) {
        await emailService.sendConfirmation({
          to: targetEmail,
          subject: 'Access Granted: Your Role Request was Approved!',
          type: 'auth',
          templateType: 'role_request_approved',
          templateData: {
            customerName: targetName,
            roleLabel: roleLabel
          }
        });
        console.log(`✅ [Approve API] Approval email sent to ${targetEmail}`);
      }
    } catch (emailErr) {
      console.warn('⚠️ [Approve API] Approval email failed:', emailErr);
    }

    // Audit log (best-effort)
    try {
      const roleLabel = (updated as RoleRequestRow).request_type === 'organizer' ? 'Event Organizer' : 'Venue Owner';
      await adminSupabase.from('admin_audit_logs').insert({
        action: 'role_request_approve',
        performed_by: user.id,
        target_user: updated.user_id,
        details: {
          requestId, organizerSync,
          status: 'success',
          admin_user_name: user.email?.split('@')[0] || 'Admin',
          target_name: (updated as RoleRequestRow).user_name,
          target_email: (updated as RoleRequestRow).user_email
        },
        created_at: new Date().toISOString()
      } as any);
    } catch (auditErr) { console.warn('[Approve API] Audit log failed:', auditErr); }

    return NextResponse.json({
      success: true,
      request: updated,
      organizerSync
    });

  } catch (e) {
    console.error('[Role Approve] Error:', e);
    return NextResponse.json({ error: 'Internal Server Error', details: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
