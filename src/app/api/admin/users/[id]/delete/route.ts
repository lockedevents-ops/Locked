import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server/server';
import { createAdminClient } from '@/lib/supabase/server/admin';

export async function DELETE(
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

    // Prevent deleting yourself
    if (id === currentUser.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Use admin client for deletion
    const adminSupabase = createAdminClient();

    // Get user info before deletion for audit log
    const { data: userProfile } = await adminSupabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', id)
      .single();

    const targetUserName = userProfile?.full_name || userProfile?.email || 'Unknown User';

    // Get current admin's profile for audit log
    const { data: adminProfile } = await adminSupabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', currentUser.id)
      .single();

    // Create audit log before deletion
    try {
      await adminSupabase.from('admin_audit_logs').insert({
        action: 'user_delete',
        performed_by: currentUser.id,
        target_user: id,
        details: {
          action_type: 'user_delete',
          target_type: 'user',
          status: 'success',
          title: `Deleted ${targetUserName}`,
          target_email: userProfile?.email,
          target_name: userProfile?.full_name,
          description: `User account deleted: ${targetUserName}`,
          admin_user_name: adminProfile?.full_name || adminProfile?.email || 'Unknown Admin',
          admin_user_email: adminProfile?.email
        },
        created_at: new Date().toISOString()
      });
    } catch (auditError) {
      console.warn('Audit log failed (non-fatal):', auditError);
    }

    // Delete user roles first (foreign key constraint)
    await adminSupabase
      .from('user_roles')
      .delete()
      .eq('user_id', id);

    // Delete user profile
    const { error: deleteProfileError } = await adminSupabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (deleteProfileError) {
      console.error('Error deleting user profile:', deleteProfileError);
      return NextResponse.json(
        { error: 'Failed to delete user profile' },
        { status: 500 }
      );
    }

    // Delete auth user using admin API
    try {
      const { error: deleteAuthError } = await adminSupabase.auth.admin.deleteUser(id);
      
      if (deleteAuthError) {
        console.error('Error deleting auth user:', deleteAuthError);
        // Continue anyway as profile is deleted
      }
    } catch (authError) {
      console.warn('Auth deletion failed (non-fatal):', authError);
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error: any) {
    console.error('Error in delete user API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
