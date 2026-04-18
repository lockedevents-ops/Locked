import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server/server';
import { createAdminClient } from '@/lib/supabase/server/admin';

export async function PUT(
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

    // Check if caller has admin privileges
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
    const isAdmin = callerRoles.some((r: any) => r.role === 'admin');

    if (!isSuperAdmin && !isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get target admin's roles to check permissions
    const { data: targetRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', id);

    const targetIsSuperAdmin = targetRoles?.some((r: any) => r.role === 'super_admin');

    // Regular admins cannot edit super admins
    if (!isSuperAdmin && targetIsSuperAdmin) {
      return NextResponse.json(
        { error: 'Cannot edit super admin' },
        { status: 403 }
      );
    }

    // Cannot edit self
    if (id === user.id) {
      return NextResponse.json(
        { error: 'Cannot edit your own account' },
        { status: 403 }
      );
    }

    // Get update data
    const { full_name, phone_number } = await req.json();

    // Use admin client to update profile
    const adminClient = createAdminClient();
    const { data: updatedProfile, error: updateError } = await adminClient
      .from('profiles')
      .update({
        full_name,
        phone_number,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating admin profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to update admin profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
    });
  } catch (error) {
    console.error('Error in update admin route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
