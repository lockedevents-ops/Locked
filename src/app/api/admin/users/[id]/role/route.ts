import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server/server';
import { createAdminClient } from '@/lib/supabase/server/admin';

export async function POST(
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

    const isAdmin = callerRoles.some((r: any) => 
      ['admin', 'super_admin', 'support_agent'].includes(r.role)
    );

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get the role from request body
    const { role } = await req.json();

    if (!role) {
      return NextResponse.json(
        { error: 'Role is required' },
        { status: 400 }
      );
    }

  // Validate role
  const validRoles = ['organizer', 'venue_owner', 'admin', 'support_agent'];
  if (!validRoles.includes(role)) {
    return NextResponse.json(
      { error: 'Invalid role. Must be organizer, venue_owner, admin, or support_agent' },
      { status: 400 }
    );
  }    // Use admin client to add role
    const adminClient = createAdminClient();

    // Check if user already has this role
    const { data: existingRole } = await adminClient
      .from('user_roles')
      .select('id')
      .eq('user_id', id)
      .eq('role', role)
      .maybeSingle();

    if (existingRole) {
      return NextResponse.json({
        success: true,
        message: 'User already has this role',
      });
    }

    // Insert new role
    const { error: insertError } = await adminClient
      .from('user_roles')
      .insert({
        user_id: id,
        role: role,
        granted_by: user.id,
        granted_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error adding role:', insertError);
      return NextResponse.json(
        { error: 'Failed to add role' },
        { status: 500 }
      );
    }

    // Get user info for audit log
    const { data: userProfile } = await adminClient
      .from('profiles')
      .select('email, full_name')
      .eq('id', id)
      .single();

    const targetUserName = userProfile?.full_name || userProfile?.email || 'Unknown User';

    // Get current admin's profile for audit log
    const { data: adminProfile } = await adminClient
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    // Create audit log
    try {
      await adminClient.from('admin_audit_logs').insert({
        action: 'role_grant',
        performed_by: user.id,
        target_user: id,
        details: {
          action_type: 'role_grant',
          target_type: 'user',
          status: 'success',
          title: `Granted ${role} role to ${targetUserName}`,
          description: `User granted ${role} role`,
          admin_user_name: adminProfile?.full_name || adminProfile?.email || 'Unknown Admin',
          admin_user_email: adminProfile?.email,
          target_name: userProfile?.full_name,
          target_email: userProfile?.email,
          role_granted: role
        },
        created_at: new Date().toISOString()
      });
    } catch (auditError) {
      console.warn('Audit log failed (non-fatal):', auditError);
    }

    return NextResponse.json({
      success: true,
      message: 'Role added successfully',
    });
  } catch (error) {
    console.error('Error in add role route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
