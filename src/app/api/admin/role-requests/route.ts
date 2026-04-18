import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server/server';
import { createAdminClient } from '@/lib/supabase/server/admin';

/**
 * GET /api/admin/role-requests
 * ✅ SECURITY: Admin-only endpoint to fetch all role requests with reinstatement data
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    // ✅ SECURITY: Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ SECURITY: Verify admin role
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .is('revoked_at', null);
      
    const roles = ((rolesData as Array<{ role: string }>) || []).map((r: { role: string }) => r.role);
    const isAdmin = roles.some((r: string) => ['admin', 'super_admin', 'support_agent'].includes(r));
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use admin client to fetch data bypassing RLS
    const adminSupabase = createAdminClient();

    // Fetch requests
    const { data: requests, error: requestsError } = await adminSupabase
      .from('role_requests')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (requestsError) throw requestsError;

    // Fetch additional data
    let profileData: { [userId: string]: { avatar_url?: string; full_name?: string; email?: string } } = {};
    let reinstatementData: { [key: string]: { reinstatedAt: string | null; reinstatementCount: number } } = {};

    if (requests && requests.length > 0) {
      const userIds = [...new Set(requests.map((r: any) => r.user_id))];

      // Fetch profiles (including full_name and email since they don't exist in role_requests)
      const { data: profiles } = await adminSupabase
        .from('profiles')
        .select('id, avatar_url, full_name, email')
        .in('id', userIds);

      if (profiles) {
        profiles.forEach((p: any) => {
          profileData[p.id] = {
            avatar_url: p.avatar_url,
            full_name: p.full_name,
            email: p.email
          };
        });
      }

      // Fetch reinstatement data
      const { data: rolesData } = await adminSupabase
        .from('user_roles')
        .select('user_id, role, reinstated_at, reinstatement_count')
        .in('user_id', userIds);

      if (rolesData) {
        rolesData.forEach((r: any) => {
          const key = `${r.user_id}-${r.role}`;
          reinstatementData[key] = {
            reinstatedAt: r.reinstated_at,
            reinstatementCount: r.reinstatement_count || 0
          };
        });
      }
    }

    // Merge data
    const enrichedRequests = requests.map((row: any) => {
      const roleKey = `${row.user_id}-${row.request_type === 'organizer' ? 'organizer' : 'venue_owner'}`;
      const reinstatement = reinstatementData[roleKey] || { reinstatedAt: null, reinstatementCount: 0 };
      const userProfile = profileData[row.user_id] || {};

      return {
        id: row.id,
        userId: row.user_id,
        userName: userProfile.full_name || 'Unknown',
        userEmail: userProfile.email || '',
        userImage: userProfile.avatar_url,
        requestType: row.request_type,
        companyName: row.company_name,
        businessEmail: row.business_email,
        businessPhone: row.business_phone,
        idType: row.id_type,
        idNumber: row.id_number,
        idImage: row.id_image_url,
        selfieWithId: row.selfie_with_id_url,
        reason: row.organization_description,
        status: row.status,
        rejectionNote: row.rejection_reason, // Map rejection_reason to rejectionNote
        submittedAt: row.submitted_at,
        reviewedAt: row.reviewed_at,
        reviewedBy: row.reviewed_by,
        createdAt: row.submitted_at, // Fallback
        reinstatedAt: reinstatement.reinstatedAt,
        reinstatementCount: reinstatement.reinstatementCount
      };
    });

    return NextResponse.json(enrichedRequests);

  } catch (error) {
    console.error('Error fetching role requests:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/role-requests
 * ✅ SECURITY: Rate-limited role request submission endpoint
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // ✅ SECURITY: Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { request_type } = body;

    if (!['organizer', 'venue_owner'].includes(request_type)) {
      return NextResponse.json({ 
        error: 'Invalid request type' 
      }, { status: 400 });
    }

    // ✅ SECURITY: Rate limiting - check for recent requests in last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentRequests, error: rateLimitError } = await supabase
      .from('role_requests')
      .select('id, submitted_at, status')
      .eq('user_id', user.id)
      .eq('request_type', request_type)
      .gte('submitted_at', twentyFourHoursAgo)
      .order('submitted_at', { ascending: false });

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
      // Continue with submission on DB error
    } else if (recentRequests && recentRequests.length >= 3) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded',
        message: `You have submitted ${recentRequests.length} requests in the last 24 hours. Please wait before submitting again.`,
        requests: recentRequests
      }, { status: 429 });
    }

    // Check for existing pending request
    const { data: existingPending } = await supabase
      .from('role_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('request_type', request_type)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingPending) {
      return NextResponse.json({ 
        error: 'Pending request exists',
        message: 'You already have a pending request for this role.'
      }, { status: 409 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Rate limit check passed. You may proceed with submission.'
    });

  } catch (error) {
    console.error('[Role Request API] Error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error' 
    }, { status: 500 });
  }
}
