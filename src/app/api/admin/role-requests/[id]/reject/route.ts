import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server/server';
import { emailService } from '@/services/emailService';
import { createAdminClient } from '@/lib/supabase/server/admin';

interface RoleRow { role: string }

/**
 * POST /api/admin/role-requests/:id/reject
 * Body: { note?: string }
 * Mirrors approve endpoint but sets status = 'rejected'.
 * Sends notifications (best-effort) and writes audit log.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: requestId } = await params;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Roles check (excluding revoked admins)
    const { data: rolesData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).is('revoked_at', null);
    const roles = (rolesData as RoleRow[] | null || []).map(r => r.role);
    const isAdmin = roles.some(r => ['admin','super_admin','support_agent'].includes(r));
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const note: string | null = (body?.note || '').trim() || null;

    // Fetch role request
    const { data: rr, error: rrErr } = await supabase
      .from('role_requests')
      .select('*')
      .eq('id', requestId)
      .single();
    if (rrErr || !rr) return NextResponse.json({ error: 'Role request not found' }, { status: 404 });
    if (rr.status !== 'pending') return NextResponse.json({ error: 'Already processed' }, { status: 400 });

    // Use admin client for bypass RLS
    const adminSupabase = createAdminClient();

    // Update -> rejected
    const { data: updated, error: updErr } = await adminSupabase
      .from('role_requests')
      .update({ 
        status: 'rejected', 
        reviewed_at: new Date().toISOString(), 
        reviewed_by: user.id, 
        rejection_reason: note
      })
      .eq('id', requestId)
      .select('*')
      .single();

    if (updErr || !updated) {
      console.error('[Reject API] Update error:', updErr);
      return NextResponse.json({ error: 'Failed to update request', details: updErr }, { status: 500 });
    }

    console.log(`[Reject API] Successfully updated request ${requestId} to rejected`);

    // Notifications (best-effort)
    try {
      const roleLabel = updated.request_type === 'organizer' ? 'Event Organizer' : 'Venue Owner';
      await supabase.rpc('notify_user', {
        p_user_id: updated.user_id,
        p_title: 'Role Request Rejected',
        p_message: `Your ${roleLabel} role request was rejected.${note ? ' Note: ' + note : ''}`,
        p_type: 'role_request',
        p_link: '/dashboards/user',
        p_metadata: { requestId: updated.id, requestType: updated.request_type, status: 'rejected', reviewed_by: user.id },
        p_priority: 'normal',
        p_created_by: user.id,
        p_is_admin_notification: false
      });
      await supabase.rpc('notify_admins', {
        p_title: 'Role Request Rejected',
        p_message: `${roleLabel} role request for ${updated.user_name} (${updated.user_email}) was rejected by ${user.id}.`,
        p_type: 'role_request',
        p_link: `/admin/role-requests?requestId=${updated.id}`,
        p_metadata: { requestId: updated.id, userId: updated.user_id, reviewed_by: user.id },
        p_priority: 'normal',
        p_created_by: user.id
      });
    } catch (notifErr) {
      console.warn('Notification RPC failed (non-fatal):', notifErr);
    }

    // Role Request Rejection Email
    try {
      const adminSupabase = createAdminClient();
      const roleLabel = updated.request_type === 'organizer' ? 'Event Organizer' : 'Venue Owner';
      const { data: profile } = await adminSupabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', updated.user_id)
        .single();

      if (profile?.email) {
        await emailService.sendConfirmation({
          to: profile.email,
          subject: 'Update on Your Role Request',
          type: 'auth',
          templateType: 'role_request_rejected',
          templateData: {
            customerName: profile.full_name || 'there',
            roleLabel: roleLabel,
            note: note || undefined
          }
        });
        console.log(`✅ Rejection email sent to ${profile.email}`);
      }
    } catch (emailErr) {
      console.warn('⚠️ Rejection email failed (non-fatal):', emailErr);
    }

    // Audit log
    try {
      // Get admin profile for display name
      const { data: adminProfile } = await adminSupabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      const adminName = adminProfile?.full_name || user.email?.split('@')[0] || 'Admin';
      const roleLabel = updated.request_type === 'organizer' ? 'Event Organizer' : 'Venue Owner';
      
      await adminSupabase.from('admin_audit_logs').insert({
        action: 'role_request_reject',
        performed_by: user.id,
        target_user: updated.user_id,
        details: {
          requestId,
          note,
          title: 'Role Request Rejected',
          description: `${roleLabel} role request for ${updated.user_name || updated.user_email} was rejected by ${adminName}${note ? ` (Reason: ${note})` : ''}`,
          action_type: 'role_request_reject',
          target_type: 'role_request',
          status: 'failure',
          admin_user_name: adminName,
          admin_user_role: 'admin',
          target_name: updated.user_name,
          target_email: updated.user_email
        },
        created_at: new Date().toISOString()
      } as any);
      console.log(`[Reject API] Audit log created`);
    } catch (auditErr) {
      console.warn('[Reject API] Audit log insert failed (non-fatal):', auditErr);
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
      }
    });
  } catch (e) {
    console.error('Reject role request API error:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
