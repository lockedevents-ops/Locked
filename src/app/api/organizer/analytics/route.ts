import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server/server';

/**
 * GET /api/organizer/analytics
 * ✅ SECURITY: Server-side protected endpoint for organizer analytics
 * Verifies user has organizer role before returning data
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    // ✅ SECURITY: Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ SECURITY: Verify user has organizer role (excluding revoked)
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'organizer')
      .is('revoked_at', null)
      .maybeSingle();

    if (!roleData) {
      return NextResponse.json({ 
        error: 'Forbidden - Organizer role required' 
      }, { status: 403 });
    }

    // Get organizer ID
    const { data: organizerData } = await supabase
      .from('organizers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!organizerData) {
      return NextResponse.json({
        totalEvents: 0,
        totalTicketsSold: 0,
        totalRevenue: 0,
        followerCount: 0,
        upcomingEvents: [],
        pastEvents: [],
        monthlyTicketSales: Array(12).fill(0),
        revenueByMonth: Array(12).fill(0)
      });
    }

    // Get follower count from user_organizer_follows junction table
    let followerCount = 0;
    try {
      const { count, error: countError } = await supabase
        .from('user_organizer_follows')
        .select('*', { count: 'exact', head: true })
        .eq('organizer_id', organizerData.id);
      
      if (!countError && count !== null) {
        followerCount = count;
      }
    } catch (e) {
      // Table might not exist yet, default to 0
      console.warn('Could not fetch follower count:', e);
    }

    // Get events data
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('organizer_id', organizerData.id);

    if (!events || events.length === 0) {
      return NextResponse.json({
        totalEvents: 0,
        totalTicketsSold: 0,
        totalRevenue: 0,
        followerCount,
        upcomingEvents: [],
        pastEvents: [],
        monthlyTicketSales: Array(12).fill(0),
        revenueByMonth: Array(12).fill(0)
      });
    }

    // Process analytics
    const now = new Date();
    const upcomingEvents: any[] = [];
    const pastEvents: any[] = [];
    let totalRevenue = 0;
    let totalTicketsSold = 0;
    const monthlyTicketSales = Array(12).fill(0);
    const revenueByMonth = Array(12).fill(0);

    events.forEach((event: any) => {
      const eventDate = new Date(event.start_date || event.date);
      const ticketsSold = event.tickets_sold || 0;
      const revenue = event.revenue || 0;
      const month = eventDate.getMonth();

      totalTicketsSold += ticketsSold;
      totalRevenue += revenue;
      monthlyTicketSales[month] += ticketsSold;
      revenueByMonth[month] += revenue;

      const eventMetric = {
        id: event.id,
        title: event.title,
        date: eventDate.toLocaleDateString(),
        location: event.location || event.venue_name || 'TBD',
        ticketsSold,
        revenue,
        status: event.status || 'published'
      };

      if (eventDate >= now) {
        upcomingEvents.push(eventMetric);
      } else {
        pastEvents.push(eventMetric);
      }
    });

    return NextResponse.json({
      totalEvents: events.length,
      totalTicketsSold,
      totalRevenue,
      followerCount,
      upcomingEvents: upcomingEvents.slice(0, 5),
      pastEvents: pastEvents.slice(0, 5),
      monthlyTicketSales,
      revenueByMonth
    });

  } catch (error) {
    console.error('[Organizer Analytics API] Error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error' 
    }, { status: 500 });
  }
}
