import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server/server';
import { createAdminClient } from '@/lib/supabase/server/admin';

/**
 * GET /api/admin/users/list
 * Fetches all NON-ADMIN users for User Management page
 * Uses admin client to bypass RLS and properly filter users
 */
export async function GET() {
  try {
    // Authenticate the requesting admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .is('revoked_at', null);
    
    const roles = (rolesData || []).map((r: any) => r.role);
    const isAdmin = roles.some((r: string) => ['admin', 'super_admin', 'support_agent'].includes(r));
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use admin client to fetch ALL profiles (bypassing RLS)
    const adminSupabase = createAdminClient();
    
    const { data: profiles, error: profilesError } = await adminSupabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    
    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      throw profilesError;
    }
    
    // Fetch ALL active roles for these users
    const ids = (profiles || []).map((p: any) => p.id);
    let roleMap = new Map<string, string[]>();
    
    if (ids.length) {
      const { data: rolesData, error: rolesError } = await adminSupabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', ids)
        .is('revoked_at', null); // Only get ACTIVE roles
      
      if (rolesError) {
        console.error('❌ Error fetching roles:', rolesError);
        throw rolesError;
      }
      
      rolesData?.forEach((r: any) => {
        const list = roleMap.get(r.user_id) || [];
        list.push(r.role);
        roleMap.set(r.user_id, list);
      });
    }

    // Map profiles to users and filter out admin-level users
    const allUsers = await Promise.all((profiles || []).map(async (p: any) => {
      const userRoles = roleMap.get(p.id);
      const roles = userRoles && userRoles.length > 0 ? userRoles : ['user'];
      
      // Determine primary role
      let primaryRole = 'user';
      if (roles.includes('super_admin')) primaryRole = 'super_admin';
      else if (roles.includes('admin')) primaryRole = 'admin';
      else if (roles.includes('support_agent')) primaryRole = 'support_agent';
      else if (roles.includes('organizer')) primaryRole = 'organizer';
      else if (roles.includes('venue_owner')) primaryRole = 'venue_owner';
      else primaryRole = roles[0] || 'user';
      
      // Fetch last sign in from auth.users using admin API
      let lastLoginAt;
      try {
        const { data: authUser } = await adminSupabase.auth.admin.getUserById(p.id);
        lastLoginAt = authUser?.user?.last_sign_in_at || undefined;
      } catch (err) {
        console.warn(`Could not fetch auth data for user ${p.id}:`, err);
        lastLoginAt = undefined;
      }
      
      return {
        id: p.id,
        name: p.full_name || 'Unknown User',
        email: p.email,
        roles,
        primaryRole,
        createdAt: p.created_at,
        lastLoginAt,
        status: p.status || 'active',
        image: p.avatar_url || undefined,
        phoneNumber: p.phone_number || undefined,
      };
    }));

    // Filter out admin-level users
    const regularUsers = allUsers.filter(user => {
      const hasAdminRole = user.roles.some((role: string) => 
        ['admin', 'super_admin', 'support_agent'].includes(role)
      );
      
      return !hasAdminRole;
    });
    
    return NextResponse.json({
      users: regularUsers,
      total: regularUsers.length
    });
    
  } catch (error: any) {
    console.error('❌ [API] Error in users list:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
