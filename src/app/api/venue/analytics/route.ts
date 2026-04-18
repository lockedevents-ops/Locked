import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server/server';
import { isVenuesEnabled } from '@/lib/network';

/**
 * GET /api/venue/analytics
 * ✅ SECURITY: Server-side protected endpoint for venue owner analytics
 * Verifies user has venue_owner role before returning data
 */
export async function GET(request: Request) {
  try {
    if (!isVenuesEnabled()) {
      return NextResponse.json({
        error: 'Venue functionality is temporarily disabled'
      }, { status: 503 });
    }

    const supabase = await createClient();
    
    // ✅ SECURITY: Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ SECURITY: Verify user has venue_owner role (excluding revoked)
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'venue_owner')
      .is('revoked_at', null)
      .maybeSingle();

    if (!roleData) {
      return NextResponse.json({ 
        error: 'Forbidden - Venue owner role required' 
      }, { status: 403 });
    }

    // Get venue data
    const { data: venueData } = await supabase
      .from('venues')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!venueData) {
      return NextResponse.json({
        totalVenues: 0,
        totalBookings: 0,
        totalRevenue: 0,
        upcomingBookings: [],
        pastBookings: [],
        monthlyBookings: Array(12).fill(0),
        revenueByMonth: Array(12).fill(0)
      });
    }

    // Get bookings/events hosted at this venue
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('venue_id', venueData.id);

    const totalBookings = events?.length || 0;
    const totalRevenue = events?.reduce((sum: number, event: any) => sum + (event.revenue || 0), 0) || 0;

    return NextResponse.json({
      totalVenues: 1,
      totalBookings,
      totalRevenue,
      venueName: venueData.name,
      venueCapacity: venueData.capacity,
      upcomingBookings: [],
      pastBookings: [],
      monthlyBookings: Array(12).fill(0),
      revenueByMonth: Array(12).fill(0)
    });

  } catch (error) {
    console.error('[Venue Analytics API] Error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error' 
    }, { status: 500 });
  }
}
