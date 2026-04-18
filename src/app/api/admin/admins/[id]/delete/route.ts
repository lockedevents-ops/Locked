import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server/server';
import { createAdminClient } from '@/lib/supabase/server/admin';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Authenticate the caller
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if caller has super admin privileges (only super admins can delete)
    const { data: callerRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (roleError || !callerRoles || callerRoles.length === 0) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const isSuperAdmin = callerRoles.some((r: any) => r.role === 'super_admin');

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Super admin access required to delete admins' },
        { status: 403 }
      );
    }

    // Cannot delete self
    if (id === user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 403 }
      );
    }

    // Use admin client to delete admin
    const adminClient = createAdminClient();
    
    // Get admin info before deletion for audit log
    const { data: adminProfile } = await adminClient
      .from('profiles')
      .select('email, full_name')
      .eq('id', id)
      .single();

    const targetAdminName = adminProfile?.full_name || adminProfile?.email || 'Unknown Admin';

    // Get current admin's profile for audit log
    const { data: currentAdminProfile } = await adminClient
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    // Create audit log before deletion
    try {
      await adminClient.from('admin_audit_logs').insert({
        action: 'admin_delete',
        performed_by: user.id,
        target_user: id,
        details: {
          action_type: 'admin_delete',
          target_type: 'admin',
          status: 'success',
          title: `Deleted Admin: ${targetAdminName}`,
          target_email: adminProfile?.email,
          target_name: adminProfile?.full_name,
          description: `Admin account deleted: ${targetAdminName}`,
          admin_user_name: currentAdminProfile?.full_name || currentAdminProfile?.email || 'Unknown Admin',
          admin_user_email: currentAdminProfile?.email
        },
        created_at: new Date().toISOString()
      });
    } catch (auditError) {
      console.warn('Audit log failed (non-fatal):', auditError);
    }
    
    // Delete user_roles entries first (foreign key constraint)
    const { error: rolesDeleteError } = await adminClient
      .from('user_roles')
      .delete()
      .eq('user_id', id);

    if (rolesDeleteError) {
      console.error('Error deleting user roles:', rolesDeleteError);
      return NextResponse.json(
        { error: 'Failed to delete admin roles' },
        { status: 500 }
      );
    }

    // Delete profile
    const { error: profileDeleteError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', id);

    if (profileDeleteError) {
      console.error('Error deleting admin profile:', profileDeleteError);
      return NextResponse.json(
        { error: 'Failed to delete admin profile' },
        { status: 500 }
      );
    }

    // Delete from auth.users (hard delete)
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(
      id
    );

    if (authDeleteError) {
      console.error('Error deleting admin from auth:', authDeleteError);
      // Profile already deleted, so we continue but log the error
      console.warn('Auth user deletion failed, but profile was removed');
    }

    return NextResponse.json({
      success: true,
      message: 'Admin deleted successfully',
    });
  } catch (error) {
    console.error('Error in delete admin route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
