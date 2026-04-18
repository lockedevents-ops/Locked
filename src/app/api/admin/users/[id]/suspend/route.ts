import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server/server';
import { createAdminClient } from '@/lib/supabase/server/admin';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if current user has admin privileges
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id);

    const roles = (rolesData || []).map((r: any) => r.role);
    const isAdmin = roles.some((r: string) => ['admin', 'super_admin', 'support_agent'].includes(r));

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { suspend } = await request.json();

    // Use admin client to update user status
    const adminSupabase = createAdminClient();
    
    // Update profile status
    const { error: updateError } = await adminSupabase
      .from('profiles')
      .update({ 
        status: suspend ? 'suspended' : 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating user status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user status' },
        { status: 500 }
      );
    }

    // Get target user's profile for audit log
    const { data: targetProfile } = await adminSupabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', id)
      .single();

    const targetUserName = targetProfile?.full_name || targetProfile?.email || 'Unknown User';

    // Get current admin's profile for audit log
    const { data: adminProfile } = await adminSupabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', currentUser.id)
      .single();

    // Create audit log
    try {
      await adminSupabase.from('admin_audit_logs').insert({
        action: suspend ? 'user_suspend' : 'user_reactivate',
        performed_by: currentUser.id,
        target_user: id,
        details: {
          action_type: suspend ? 'user_suspend' : 'user_reactivate',
          target_type: 'user',
          status: 'success',
          title: suspend ? `Suspended ${targetUserName}` : `Reactivated ${targetUserName}`,
          description: suspend 
            ? `User account suspended: ${targetUserName}` 
            : `User account reactivated: ${targetUserName}`,
          admin_user_name: adminProfile?.full_name || adminProfile?.email || 'Unknown Admin',
          admin_user_email: adminProfile?.email,
          target_name: targetProfile?.full_name,
          target_email: targetProfile?.email
        },
        created_at: new Date().toISOString()
      });
    } catch (auditError) {
      console.warn('Audit log failed (non-fatal):', auditError);
    }

    // Send notification to user
    try {
      await adminSupabase.rpc('notify_user', {
        p_user_id: id,
        p_title: suspend ? 'Account Suspended' : 'Account Reactivated',
        p_message: suspend 
          ? 'Your account has been suspended. Please contact support for more information.'
          : 'Your account has been reactivated. You can now access all features.',
        p_type: 'account_status',
        p_link: null,
        p_metadata: { 
          suspended: suspend,
          performed_by: currentUser.id 
        },
        p_priority: 'high',
        p_created_by: currentUser.id,
        p_is_admin_notification: false
      });
    } catch (notifError) {
      console.warn('Notification failed (non-fatal):', notifError);
    }

    return NextResponse.json({
      success: true,
      message: suspend ? 'User suspended successfully' : 'User reactivated successfully'
    });

  } catch (error: any) {
    console.error('Error in suspend user API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
