import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server/server';
import { createAdminClient } from '@/lib/supabase/server/admin';

interface RoleRow { user_id: string; role: string }

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate caller
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify caller has admin privileges
    const { data: myRoles, error: myRolesErr } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (myRolesErr) throw myRolesErr;
    const roleList = (myRoles as RoleRow[] | null || []).map(r => (r as any).role);
    const isAdmin = roleList.some(r => ['admin','super_admin','support_agent'].includes(r));
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Use admin client to read the authoritative data (bypass RLS)
    const adminSupabase = createAdminClient();

    const { data: adminRoles, error: rolesError } = await adminSupabase
      .from('user_roles')
      .select('user_id, role')
      .in('role', ['admin','super_admin','support_agent'])
      .is('revoked_at', null);

    if (rolesError) throw rolesError;

    // Group roles by user_id
    const rolesByUser: Record<string, string[]> = {};
    (adminRoles as RoleRow[] || []).forEach(({ user_id, role }) => {
      if (!rolesByUser[user_id]) rolesByUser[user_id] = [];
      rolesByUser[user_id].push(role);
    });

    const userIds = Object.keys(rolesByUser);
    if (userIds.length === 0) return NextResponse.json({ admins: [] });

    const { data: profiles, error: profilesErr } = await adminSupabase
      .from('profiles')
      .select('id, email, full_name, phone_number, avatar_url, created_at, status')
      .in('id', userIds);

    if (profilesErr) throw profilesErr;

    // Fetch last_sign_in_at from auth.users
    const { data: authUsers, error: authUsersErr } = await adminSupabase.auth.admin.listUsers();
    const lastLoginByUser: Record<string, string | null> = {};
    if (!authUsersErr && authUsers?.users) {
      authUsers.users.forEach(authUser => {
        lastLoginByUser[authUser.id] = authUser.last_sign_in_at || null;
      });
    }

    const profileIds = (profiles as any[] || []).map(p => p.id);
    const missingProfiles = userIds.filter(id => !profileIds.includes(id));

    const admins = (profiles as any[] || []).map(profile => ({
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      phone_number: profile.phone_number,
      avatar_url: profile.avatar_url,
      created_at: profile.created_at,
      last_login_at: lastLoginByUser[profile.id] || null,
      status: profile.status === 'suspended' ? 'suspended' : 'active',
      roles: rolesByUser[profile.id] || [],
    }));

    // For users that have roles but no profile, include an entry with roles only
    for (const id of missingProfiles) {
      admins.push({
        id,
        email: null,
        full_name: null,
        phone_number: null,
        avatar_url: null,
        created_at: null,
        last_login_at: lastLoginByUser[id] || null,
        status: 'active',
        roles: rolesByUser[id] || [],
      });
    }

    return NextResponse.json({ admins, missingProfiles });
  } catch (err) {
    console.error('admin list API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
