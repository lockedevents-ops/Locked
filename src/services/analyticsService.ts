/**
 * Analytics Service
 * 
 * Provides data loading functions for dashboard analytics.
 * Currently loads from localStorage but designed for easy migration to API endpoints.
 */

import { eventRepo } from '@/storage/repositories';
import { requestCache } from '@/lib/requestCache';

export interface EventMetrics {
  id: string;
  title: string;
  date: string;
  location: string;
  ticketsSold: number;
  totalCapacity: number;
  revenue: number;
  imageUrl?: string;
}

export interface OrganizerAnalytics {
  totalEvents: number;
  totalTicketsSold: number;
  totalRevenue: number;
  followerCount: number;
  upcomingEvents: EventMetrics[];
  pastEvents: EventMetrics[];
  monthlyTicketSales: number[];
  revenueByMonth: number[];
  loading: boolean;
  error?: string;
}

export interface VenueAnalytics {
  totalVenues: number;
  totalBookings: number;
  totalRevenue: number;
  avgOccupancyRate: number;
  venues: VenueMetrics[];
  recentBookings: BookingMetrics[];
  bookingsByVenue: { name: string; bookings: number }[];
  loading: boolean;
  error?: string;
}

export interface VenueMetrics {
  id: string;
  name: string;
  location: string;
  bookingsThisMonth: number;
  totalRevenue: number;
  avgRating: number;
  availability: number;
}

export interface BookingMetrics {
  id: string;
  eventName: string;
  organizer: string;
  date: string;
  venue: string;
  attendees: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  revenue: number;
}

export interface FinancialMetrics {
  balance: number;
  pendingAmount: number;
  lifetimeRevenue: number;
  totalFees: number;
  totalWithdrawn: number;
  revenueByMonth: { month: string; revenue: number }[];
  eventRevenue: { eventTitle: string; revenue: number }[];
  transactions: Transaction[];
  payouts: Payout[];
  loading: boolean;
  error?: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  fee: number;
  status: 'completed' | 'pending' | 'failed';
  customer: string;
}

export interface Payout {
  id: string;
  date: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  arrivalDate: string;
  method: string;
  account: string;
}

const ORGANIZER_ANALYTICS_CACHE_TTL = 3 * 60 * 1000;
const getOrganizerAnalyticsCacheKey = (userId: string) => `organizer-analytics:${userId}`;
const ORGANIZER_ANALYTICS_TIMEOUT_MS = 8000;

function withQueryTimeout<T>(promise: PromiseLike<T>, label: string, timeoutMs: number = ORGANIZER_ANALYTICS_TIMEOUT_MS): Promise<T> {
  return Promise.race<T>([
    Promise.resolve(promise),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

async function fetchOrganizerAnalytics(userId: string): Promise<OrganizerAnalytics> {
  try {
    const { createClient } = await import('@/lib/supabase/client/client');
    const supabase = createClient();
    const { data: organizerData, error: orgError } = await withQueryTimeout<any>(
      supabase
        .from('organizers')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle(),
      'organizer analytics lookup'
    );

    if (orgError) {
      console.error('Error getting organizer profile:', orgError);
      return {
        totalEvents: 0,
        totalTicketsSold: 0,
        totalRevenue: 0,
        followerCount: 0,
        upcomingEvents: [],
        pastEvents: [],
        monthlyTicketSales: Array(12).fill(0),
        revenueByMonth: Array(12).fill(0),
        loading: false,
        error: 'Failed to load organizer profile'
      };
    }

    if (!organizerData) {
      console.log('No organizer profile found for user:', userId);
      return {
        totalEvents: 0,
        totalTicketsSold: 0,
        totalRevenue: 0,
        followerCount: 0,
        upcomingEvents: [],
        pastEvents: [],
        monthlyTicketSales: Array(12).fill(0),
        revenueByMonth: Array(12).fill(0),
        loading: false,
        error: undefined
      };
    }

    // Get follower count from user_organizer_follows junction table
    let followerCount = 0;
    try {
      const { count, error: countError } = await withQueryTimeout<any>(
        supabase
          .from('user_organizer_follows')
          .select('*', { count: 'exact', head: true })
          .eq('organizer_id', organizerData.id),
        'organizer follower count lookup'
      );
      
      if (!countError && count !== null) {
        followerCount = count;
      }
    } catch (e) {
      // Table might not exist yet, default to 0
      console.warn('Could not fetch follower count:', e);
    }

    const { data: userEvents, error: eventsError } = await withQueryTimeout<any>(
      supabase
        .from('events')
        .select('*')
        .eq('organizer_id', organizerData.id),
      'organizer events analytics lookup'
    );

    if (eventsError || !userEvents || userEvents.length === 0) {
      return {
        totalEvents: 0,
        totalTicketsSold: 0,
        totalRevenue: 0,
        followerCount,
        upcomingEvents: [],
        pastEvents: [],
        monthlyTicketSales: Array(12).fill(0),
        revenueByMonth: Array(12).fill(0),
        loading: false
      };
    }

    const now = new Date();
    const upcomingEvents: EventMetrics[] = [];
    const pastEvents: EventMetrics[] = [];
    let totalRevenue = 0;
    let totalTicketsSold = 0;

    // Helper to build location string consistent with SharedEventService
    const buildEventLocation = (event: any): string => {
      const locationType = event.location_type || event.locationType;
      const onlinePlatform = event.online_platform || event.onlinePlatform;

      if (locationType === 'online') {
        return onlinePlatform ? `${onlinePlatform} (Online)` : 'Online Event';
      }

      const label = event.location_label || event.locationLabel;
      const address = label
        || event.location_address
        || event.address
        || event.venue
        || event.venue_name
        || '';
      const city = event.location_city || event.city || '';
      const region = event.location_region || event.region || '';
      const country = event.location_country || event.country || '';

      if (locationType === 'hybrid') {
        const hybridParts = [address, city].filter(Boolean);
        return hybridParts.length > 0 ? hybridParts.join(', ') : 'Hybrid Event';
      }

      const parts = [address, city, region, country]
        .map(part => (typeof part === 'string' ? part.trim() : part))
        .filter(Boolean);

      return parts.length > 0 ? parts.join(', ') : 'TBD';
    };

    userEvents.forEach((event: any) => {
      const eventDate = new Date(event.start_date || event.date);
      const ticketsSold = event.tickets_sold || 0;
      const revenue = event.revenue || 0;

      const eventMetric: EventMetrics = {
        id: event.id,
        title: event.title,
        date: eventDate.toLocaleDateString(),
        location: buildEventLocation(event),
        ticketsSold,
        totalCapacity: event.capacity || 100,
        revenue,
        imageUrl: event.image_url
      };

      totalTicketsSold += ticketsSold;
      totalRevenue += revenue;

      if (eventDate >= now) {
        upcomingEvents.push(eventMetric);
      } else {
        pastEvents.push(eventMetric);
      }
    });

    const monthlyTicketSales = Array(12).fill(0);
    const revenueByMonth = Array(12).fill(0);

    pastEvents.forEach(event => {
      const eventDate = new Date(event.date);
      const monthsAgo = Math.floor((now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
      if (monthsAgo >= 0 && monthsAgo < 12) {
        monthlyTicketSales[11 - monthsAgo] += event.ticketsSold;
        revenueByMonth[11 - monthsAgo] += event.revenue;
      }
    });

    return {
      totalEvents: userEvents.length,
      totalTicketsSold,
      totalRevenue,
      followerCount,
      upcomingEvents,
      pastEvents,
      monthlyTicketSales,
      revenueByMonth,
      loading: false
    };
  } catch (error) {
    console.error('Error loading organizer analytics:', error);
    return {
      totalEvents: 0,
      totalTicketsSold: 0,
      totalRevenue: 0,
      followerCount: 0,
      upcomingEvents: [],
      pastEvents: [],
      monthlyTicketSales: Array(12).fill(0),
      revenueByMonth: Array(12).fill(0),
      loading: false,
      error: 'Failed to load analytics data'
    };
  }
}

/**
 * Organizer Analytics Service
 */
export const organizerAnalyticsService = {
  getCachedAnalytics(userId: string): OrganizerAnalytics | null {
    if (!userId) return null;
    const cached = requestCache.getCachedValue<OrganizerAnalytics>(
      getOrganizerAnalyticsCacheKey(userId),
      ORGANIZER_ANALYTICS_CACHE_TTL
    );
    return cached || null;
  },

  async getOrganizerAnalytics(userId: string): Promise<OrganizerAnalytics> {
    return requestCache.fetch(
      getOrganizerAnalyticsCacheKey(userId),
      () => fetchOrganizerAnalytics(userId),
      {
        ttl: ORGANIZER_ANALYTICS_CACHE_TTL,
        staleWhileRevalidate: true
      }
    );
  }
};

/**
 * Venue Owner Analytics Service
 */
export const venueAnalyticsService = {
  /**
   * Get comprehensive venue analytics
   * TODO: Replace with API call
   */
  async getVenueAnalytics(userId: string): Promise<VenueAnalytics> {
    try {
      // Get venues from localStorage - filter by owner
      const allVenues = JSON.parse(localStorage.getItem('venues') || '[]');
      const userVenues = allVenues.filter((venue: any) => 
        venue.ownerId === userId || venue.createdBy === userId
      );

      if (!userVenues || userVenues.length === 0) {
        return {
          totalVenues: 0,
          totalBookings: 0,
          totalRevenue: 0,
          avgOccupancyRate: 0,
          venues: [],
          recentBookings: [],
          bookingsByVenue: [],
          loading: false
        };
      }

      // Get bookings from localStorage
      const allBookings = JSON.parse(localStorage.getItem('venue-bookings') || '[]');
      const userBookings = allBookings.filter((booking: any) => 
        userVenues.some((venue: any) => venue.id === booking.venueId)
      );

      const venues: VenueMetrics[] = userVenues.map((venue: any) => {
        const venueBookings = userBookings.filter((booking: any) => booking.venueId === venue.id);
        const thisMonthBookings = venueBookings.filter((booking: any) => {
          const bookingDate = new Date(booking.date);
          const now = new Date();
          return bookingDate.getMonth() === now.getMonth() && 
                 bookingDate.getFullYear() === now.getFullYear();
        });

        return {
          id: venue.id,
          name: venue.name,
          location: `${venue.city || venue.location || 'Ghana'}`,
          bookingsThisMonth: thisMonthBookings.length,
          totalRevenue: venueBookings.reduce((sum: number, booking: any) => sum + (booking.revenue || 0), 0),
          avgRating: venue.rating || 4.5,
          availability: venue.availability || Math.floor(Math.random() * 40) + 50 // Calculate from bookings
        };
      });

      const recentBookings: BookingMetrics[] = userBookings
        .slice(0, 10)
        .map((booking: any) => ({
          id: booking.id,
          eventName: booking.eventName || 'Event',
          organizer: booking.organizerName || 'Organizer',
          date: new Date(booking.date).toLocaleDateString(),
          venue: userVenues.find((v: any) => v.id === booking.venueId)?.name || 'Venue',
          attendees: booking.attendees || 50,
          status: booking.status || 'confirmed',
          revenue: booking.revenue || 0
        }));

      const totalRevenue = venues.reduce((sum, venue) => sum + venue.totalRevenue, 0);
      const totalBookings = recentBookings.filter(b => b.status === 'confirmed').length;
      const avgOccupancyRate = venues.length > 0 
        ? Math.round(venues.reduce((sum, venue) => sum + (100 - venue.availability), 0) / venues.length)
        : 0;

      const bookingsByVenue = venues.map(venue => ({
        name: venue.name,
        bookings: venue.bookingsThisMonth
      }));

      return {
        totalVenues: userVenues.length,
        totalBookings,
        totalRevenue,
        avgOccupancyRate,
        venues,
        recentBookings,
        bookingsByVenue,
        loading: false
      };

    } catch (error) {
      console.error('Error loading venue analytics:', error);
      return {
        totalVenues: 0,
        totalBookings: 0,
        totalRevenue: 0,
        avgOccupancyRate: 0,
        venues: [],
        recentBookings: [],
        bookingsByVenue: [],
        loading: false,
        error: 'Failed to load analytics data'
      };
    }
  }
};

/**
 * Financial Analytics Service
 */
/**
 * Financial Analytics Service
 */
export const financialAnalyticsService = {
  /**
   * Get comprehensive financial analytics from Supabase
   */
  async getFinancialAnalytics(userId: string): Promise<FinancialMetrics> {
    try {
      const { createClient } = await import('@/lib/supabase/client/client');
      const supabase = createClient();

      // 1. Get Organizer ID
      const { data: organizer, error: orgError } = await supabase
        .from('organizers')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (orgError || !organizer) {
        throw new Error('Organizer profile not found');
      }

      // 2. Fetch Transactions (Real payments via Hubtel)
      const { data: transactionsData, error: txError } = await supabase
        .from('transactions')
        .select(`
          id,
          created_at,
          amount,
          status,
          type,
          client_reference,
          organizer_id,
          user_id
        `)
        .eq('organizer_id', organizer.id)
        .order('created_at', { ascending: false });

      if (txError) throw txError;

      // Manually fetch user details for transactions to avoid FK issues
      if (transactionsData && transactionsData.length > 0) {
        const userIds = [...new Set(transactionsData.map((t: any) => t.user_id).filter(Boolean))];
        
        if (userIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, full_name')
            .in('id', userIds);

          if (usersData) {
            const userMap = new Map(usersData.map((u: any) => [u.id, u.full_name]));
            
            transactionsData.forEach((t: any) => {
              if (t.user_id && userMap.has(t.user_id)) {
                t.user = { full_name: userMap.get(t.user_id) };
              }
            });
          }
        }
      }


      // 3. Fetch Payouts
      const { data: payoutsData, error: payoutError } = await supabase
        .from('payout_requests')
        .select(`
          id,
          requested_at,
          amount,
          status,
          processed_at,
          payment_method:payment_methods(
            method_type,
            account_number,
            bank_name,
            provider
          )
        `)
        .eq('organizer_id', organizer.id)
        .order('requested_at', { ascending: false });

      if (payoutError) throw payoutError;

      // 4. Process Data
      let lifetimeRevenue = 0;
      let totalFees = 0;
      let totalWithdrawn = 0;
      let pendingAmount = 0; // From pending payouts or pending transactions? Usually pending payouts.

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const revenueByMonthMap = new Map<string, number>();
      
      // Initialize last 6 months
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        revenueByMonthMap.set(months[d.getMonth()], 0);
      }

      const eventRevenueMap = new Map<string, number>();

      // Process Transactions
      const transactions: Transaction[] = [];
      
      transactionsData?.forEach((tx: any) => {
        // Only count PAID transactions for revenue
        if (tx.status === 'PAID') {
          lifetimeRevenue += tx.amount;
          
          // Monthly Revenue
          const date = new Date(tx.created_at);
          const monthName = months[date.getMonth()];
          if (revenueByMonthMap.has(monthName)) {
            revenueByMonthMap.set(monthName, (revenueByMonthMap.get(monthName) || 0) + tx.amount);
          }

          // Event Revenue
          const eventTitle = tx.event?.title || 'Unknown Event';
          eventRevenueMap.set(eventTitle, (eventRevenueMap.get(eventTitle) || 0) + tx.amount);
        }

        // Map to UI Transaction Interface
        transactions.push({
          id: tx.client_reference || tx.id,
          date: tx.created_at,
          description: `${tx.type} - ${tx.event?.title || 'N/A'}`,
          amount: tx.status === 'PAID' ? tx.amount : 0, // Only show amount if paid? Or show all
          fee: tx.status === 'PAID' ? tx.amount * 0.035 : 0, // Estimated 3.5% fee
          status: tx.status === 'PAID' ? 'completed' : tx.status === 'PENDING' ? 'pending' : 'failed',
          customer: tx.user?.full_name || 'Guest'
        });
      });

      // Process Payouts
      const payouts: Payout[] = [];
      payoutsData?.forEach((po: any) => {
        if (po.status === 'completed') {
          totalWithdrawn += po.amount;
        } else if (po.status === 'pending' || po.status === 'processing') {
          pendingAmount += po.amount;
        }

        const method = po.payment_method;
        const methodLabel = method 
          ? `${method.method_type === 'mobile_money' ? method.provider : method.bank_name}`
          : 'Unknown Method';

        payouts.push({
          id: po.id,
          date: po.requested_at,
          amount: po.amount,
          status: po.status,
          arrivalDate: po.processed_at || 'Pending',
          method: methodLabel,
          account: method?.account_number || '****'
        });
      });

      totalFees = lifetimeRevenue * 0.035; // 3.5% Platform Fee
      const balance = lifetimeRevenue - totalFees - totalWithdrawn - pendingAmount;

      // Transform Maps to Arrays
      const revenueByMonth = Array.from(revenueByMonthMap.entries()).map(([month, revenue]) => ({
        month,
        revenue
      }));

      const eventRevenue = Array.from(eventRevenueMap.entries()).map(([eventTitle, revenue]) => ({
        eventTitle,
        revenue
      })).sort((a, b) => b.revenue - a.revenue).slice(0, 5); // Top 5 events

      return {
        balance: Math.max(0, balance), // Ensure no negative balance display
        pendingAmount,
        lifetimeRevenue,
        totalFees,
        totalWithdrawn,
        revenueByMonth,
        eventRevenue,
        transactions,
        payouts,
        loading: false
      };

    } catch (error) {
      console.error('Error loading financial analytics:', error);
      return {
        balance: 0,
        pendingAmount: 0,
        lifetimeRevenue: 0,
        totalFees: 0,
        totalWithdrawn: 0,
        revenueByMonth: [],
        eventRevenue: [],
        transactions: [],
        payouts: [],
        loading: false,
        error: 'Failed to load financial data'
      };
    }
  }
};

/**
 * Mock Analytics Service (for development/demo purposes)
 * TODO: Remove when API is ready
 */
export const mockAnalyticsService = {
  /**
   * Generate mock analytics data for demo purposes
   */
  generateMockOrganizerAnalytics(): OrganizerAnalytics {
    return {
      totalEvents: 4,
      totalTicketsSold: 1520,
      totalRevenue: 73000,
      followerCount: 342,
      upcomingEvents: [
        {
          id: '1',
          title: 'Summer Music Festival',
          date: 'June 15, 2024',
          location: 'Accra Beach Club',
          ticketsSold: 450,
          totalCapacity: 1000,
          revenue: 22500
        },
        {
          id: '2',
          title: 'Tech Conference 2024',
          date: 'July 22, 2024',
          location: 'Kempinski Hotel',
          ticketsSold: 220,
          totalCapacity: 300,
          revenue: 18000
        }
      ],
      pastEvents: [
        {
          id: '3',
          title: 'Music Awards Night',
          date: 'May 5, 2024',
          location: 'National Theatre',
          ticketsSold: 800,
          totalCapacity: 1000,
          revenue: 45000
        }
      ],
      monthlyTicketSales: [120, 190, 300, 450, 580, 670, 450, 380, 520, 600, 720, 850],
      revenueByMonth: [3200, 4100, 2800, 5600, 7200, 5500, 8200, 6400, 7800, 9200, 8900, 10500],
      loading: false
    };
  },

  generateMockVenueAnalytics(): VenueAnalytics {
    return {
      totalVenues: 2,
      totalBookings: 12,
      totalRevenue: 42000,
      avgOccupancyRate: 65,
      venues: [
        {
          id: '1',
          name: 'Golden Tulip Conference Center',
          location: 'Accra, Ghana',
          bookingsThisMonth: 8,
          totalRevenue: 24000,
          avgRating: 4.7,
          availability: 70
        },
        {
          id: '2',
          name: 'Skybar Rooftop Lounge',
          location: 'Accra, Ghana',
          bookingsThisMonth: 12,
          totalRevenue: 18000,
          avgRating: 4.8,
          availability: 40
        }
      ],
      recentBookings: [
        {
          id: 'b1',
          eventName: 'Corporate Leadership Summit',
          organizer: 'Global Business Network',
          date: 'August 15, 2025',
          venue: 'Golden Tulip Conference Center',
          attendees: 120,
          status: 'confirmed',
          revenue: 6000
        }
      ],
      bookingsByVenue: [
        { name: 'Golden Tulip Conference Center', bookings: 8 },
        { name: 'Skybar Rooftop Lounge', bookings: 12 }
      ],
      loading: false
    };
  }
};
