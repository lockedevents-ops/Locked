import { useQuery, UseQueryOptions, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client/client';
import { policyService, type FlaggedItem } from '@/services/policyService';
import { isVenuesEnabled } from '@/lib/network';

/**
 * adminQueries.ts – Declarative Supabase data hooks (React Query)
 * --------------------------------------------------------------
 * Each hook: returns cached data instantly on navigation and
 * revalidates in background (refetchOnMount="always" set globally).
 */

const supabase = createClient();

// Generic fetchers
async function fetchTable<T = any>(table: string, select = '*'): Promise<T[]> {
  const { data, error } = await supabase.from(table).select(select);
  if (error) throw error;
  return data as T[];
}

// Events (raw)
export function useAdminEvents(options?: Partial<UseQueryOptions>) {
  return useQuery({
    queryKey: ['admin','events'],
    queryFn: () => fetchTable('events'),
    ...options,
  });
}

// Event domain type (used in Events Management page)
export interface AdminEvent {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  eventType?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  date?: string; // alias/fallback for startDate
  location?: string;
  locationType?: 'physical' | 'hybrid' | 'online';
  venue?: string;
  price?: string | number; // Extracted from tickets array or fallback to main price field
  status: 'published' | 'draft' | 'cancelled' | 'completed';
  isFeatured?: boolean;
  featuredType?: 'auto' | 'manual' | 'none';
  featuredScore?: number;
  featuredUntil?: string;
  featuredReason?: string;
  attendeeCount?: number;
  ticketsSold?: number;
  lockCount?: number;
  viewCount?: number;
  clickCount?: number;
  organizer?: { id: string; name: string; image?: string };
  hasVoting?: boolean;
  createdAt: string;
}

export function useAdminEventsDetailed(options?: Partial<UseQueryOptions<AdminEvent[]>>) {
  return useQuery<AdminEvent[]>({
    queryKey: ['admin','events','detailed'],
    queryFn: async ({ signal }) => {
      // Create timeout for the request
      const timeoutId = setTimeout(() => {
        if (!signal?.aborted) {
          throw new Error('Request timed out after 5 seconds');
        }
      }, 5000);
      
      try {
        // ✅ TWO-QUERY APPROACH: Fetch events and organizers separately to avoid PostgREST schema cache issues
        // This is more reliable than trying to use relationship syntax which fails intermittently
        
        // Step 1: Fetch all events
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (eventsError) {
          console.error('[AdminEventsQuery] Events fetch error:', eventsError);
          throw new Error(`Failed to load events: ${eventsError.message}`);
        }

        if (!eventsData || eventsData.length === 0) {
          return [];
        }

        // Step 2: Get unique organizer IDs
        const organizerIds = [...new Set(eventsData.map((e: any) => e.organizer_id).filter(Boolean))];

        // Step 3: Fetch organizers if we have IDs
        let organizersMap = new Map<string, any>();
        if (organizerIds.length > 0) {
          const { data: organizersData, error: organizersError } = await supabase
            .from('organizers')
            .select('id, business_name, contact_email, logo_url')
            .in('id', organizerIds);

          if (organizersError) {
            console.warn('[AdminEventsQuery] Organizers fetch warning:', organizersError);
            // Don't throw - continue without organizer data
          } else if (organizersData) {
            // Create a map for O(1) lookup
            organizersData.forEach((org: any) => organizersMap.set(org.id, org));
          }
        }

        // Step 4: Map events data with joined organizer info
        const data = eventsData.map((event: any) => ({
          ...event,
          organizer: event.organizer_id ? organizersMap.get(event.organizer_id) : null
        }));
        
        if (!data) {
          return [];
        }
        
        return (data || []).map((event: any) => ({
        id: event.id,
        title: event.title || 'Untitled Event',
        description: event.description || '',
        imageUrl: event.image_url || undefined,
        eventType: event.event_type || undefined, // Now using proper event_type column
        category: event.category || undefined,
        startDate: event.start_date || undefined,
        endDate: event.end_date || undefined,
        date: event.start_date || undefined,
        location: event.location || undefined,
        locationType: event.location_type || undefined,
        venue: event.venue || undefined,
        // Extract price from tickets array (same logic as public components)
        price: (() => {
          // Calculate price once and return it
          if (event.tickets && Array.isArray(event.tickets) && event.tickets.length > 0) {
            const prices = event.tickets.map((ticket: any) => parseFloat(ticket.price || 0)).filter((p: number) => p > 0);
            if (prices.length > 0) {
              const minPrice = Math.min(...prices);
              const maxPrice = Math.max(...prices);
              return minPrice === maxPrice ? minPrice : `₵${minPrice} - ₵${maxPrice}`;
            }
          }
          // Fallback to main price field if tickets don't have pricing
          return event.price;
        })(),
        status: event.status || 'draft',
        isFeatured: !!event.is_featured,
        featuredType: event.featured_type || 'none',
        featuredScore: event.featured_score || 0,
        featuredUntil: event.featured_until || undefined,
        featuredReason: event.featured_reason || undefined,
        attendeeCount: event.attendee_count || 0,
        ticketsSold: event.tickets_sold || 0,
        lockCount: event.lock_count || 0,
        viewCount: event.view_count || 0,
        clickCount: event.click_count || 0,
        organizer: event.organizer ? {
          id: event.organizer.id,
          name: event.organizer.business_name || 'Unknown Organizer',
          image: event.organizer.logo_url || undefined
        } : undefined,
        hasVoting: !!event.has_voting,
        createdAt: event.created_at,
        })) as AdminEvent[];
      } catch (error) {
        console.error('[AdminEventsQuery] Query failed:', error);
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    },
    // Enhanced error retry options
    retry: (failureCount, error) => {
      console.log(`[AdminEventsQuery] Retry attempt ${failureCount}:`, error);
      // Don't retry on timeout errors
      if (error instanceof Error && error.message.includes('timed out')) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

// Venues (raw)
export function useAdminVenues(options?: Partial<UseQueryOptions>) {
  return useQuery({
    queryKey: ['admin','venues'],
    queryFn: () => fetchTable('venues'),
    ...options,
  });
}

// Role Requests (raw)
export function useRoleRequests(options?: Partial<UseQueryOptions>) {
  return useQuery({
    queryKey: ['admin','roleRequests'],
    queryFn: () => fetchTable('role_requests'),
    ...options,
  });
}

// ---------------------- Typed / Transformed Hooks ---------------------- //

// Role Request domain type (matches admin UI needs)
export interface AdminRoleRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userImage?: string; // Add user profile image
  requestType: 'organizer' | 'venue_owner';
  companyName: string;
  businessEmail?: string;
  businessPhone?: string;
  idType: string;
  idNumber?: string;
  idImage?: string;
  selfieWithId?: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  rejectionNote?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  createdAt: string; // alias of submittedAt
  reinstatedAt?: string | null;
  reinstatementCount?: number;
}

export function useAdminRoleRequests(options?: Partial<UseQueryOptions<AdminRoleRequest[]>>) {
  return useQuery<AdminRoleRequest[]>({
    queryKey: ['admin','roleRequests','normalized'],
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch when user returns to tab
    refetchOnMount: false, // Don't refetch on component mount if cache exists
    queryFn: async () => {
      console.log('[AdminRoleRequests] Fetching role requests from API...');
      const response = await fetch('/api/admin/role-requests', {
        signal: AbortSignal.timeout(15000)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch role requests');
      }
      
      const data = await response.json();
      return data;
    },
    ...options,
  });
}

// Venue domain type (subset used in admin pages)
export interface AdminVenue {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  featuredImage?: string;
  featuredImagePreview?: string;
  venueType?: string;
  category?: string;
  location?: string;
  address?: string;
  capacity?: number;
  seatingCapacity?: number;
  standingCapacity?: number;
  pricing?: {
    basePrice: number;
    pricingModel?: string;
    minimumHours?: number;
  };
  status: 'active' | 'inactive' | 'draft';
  isFeatured?: boolean;
  bookingsCount?: number;
  avgRating?: number;
  amenities?: string[];
  owner?: { id: string; name: string; image?: string };
  createdAt: string;
  galleryImages?: string[];
  rules?: string[];
  city?: string;
  country?: string;
  availability?: any;
}

export function useAdminVenuesDetailed(options?: Partial<UseQueryOptions<AdminVenue[]>>) {
  return useQuery<AdminVenue[]>({
    queryKey: ['admin','venues','detailed'],
    queryFn: async () => {
      if (!isVenuesEnabled()) {
        return [];
      }

      // Step 1: Fetch all venues
      const { data: venuesData, error: venuesError } = await supabase
        .from('venues')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (venuesError) throw venuesError;
      
      if (!venuesData || venuesData.length === 0) {
        return [];
      }

      // Step 2: Get unique owner IDs and fetch profiles
      const ownerIds = [...new Set(venuesData.map((v: any) => v.owner_id).filter(Boolean))];
      const ownersMap = new Map<string, any>();
      
      if (ownerIds.length > 0) {
        const { data: ownersData, error: ownersError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', ownerIds);
          
        if (!ownersError && ownersData) {
          ownersData.forEach((owner: any) => ownersMap.set(owner.id, owner));
        }
      }

      // Step 3: Map venues with owner info
      return venuesData.map((venue: any) => {
        const owner = venue.owner_id ? ownersMap.get(venue.owner_id) : null;
        return {
          id: venue.id,
          name: venue.name || 'Unnamed Venue',
          description: venue.description || '',
          imageUrl: venue.image_url,
          featuredImage: venue.featured_image,
          featuredImagePreview: venue.featured_image_preview,
          venueType: venue.venue_type,
          category: venue.category,
          location: venue.location,
          address: venue.address,
          capacity: venue.capacity,
          seatingCapacity: venue.seating_capacity,
          standingCapacity: venue.standing_capacity,
          pricing: venue.pricing ? {
            basePrice: venue.pricing.basePrice || venue.pricing.base_price || 0,
            pricingModel: venue.pricing.pricingModel || venue.pricing.pricing_model,
            minimumHours: venue.pricing.minimumHours || venue.pricing.minimum_hours
          } : { basePrice: 0 },
          status: venue.status || 'draft',
          isFeatured: !!venue.is_featured,
          bookingsCount: venue.bookings_count || 0,
          avgRating: venue.avg_rating || 0,
          amenities: venue.amenities || [],
          owner: owner ? { id: owner.id, name: owner.full_name, image: owner.avatar_url } : undefined,
          createdAt: venue.created_at,
          galleryImages: venue.gallery_images || [],
          rules: venue.rules || [],
          city: venue.city,
          country: venue.country,
          availability: venue.availability
        };
      }) as AdminVenue[];
    },
    ...options,
  });
}

// ---------------- Users (profiles + roles aggregation) ---------------- //
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  primaryRole: string;
  createdAt: string;
  lastLoginAt?: string;
  status: 'active' | 'suspended' | 'pending';
  image?: string;
  phoneNumber?: string;
  location?: string;
  bio?: string;
}

export function useAdminUsersDetailed(options?: Partial<UseQueryOptions<AdminUser[]>>) {
  return useQuery<AdminUser[]>({
    queryKey: ['admin','users','detailed'],
    queryFn: async () => {
      // Fetch users from API route that uses admin client to bypass RLS
      const response = await fetch('/api/admin/users/list', {
        signal: AbortSignal.timeout(15000)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch users');
      }
      
      const data = await response.json();
      return data.users as AdminUser[];
    },
    ...options,
  });
}

// Admin Users (admin/super_admin/support_agent) - fetches from API route
export interface AdminManagementUser {
  id: string;
  email: string;
  full_name: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  created_at: string;
  last_login_at: string | null;
  roles: string[];
  status: 'active' | 'suspended';
}

export function useAdminManagementUsers(options?: Partial<UseQueryOptions<AdminManagementUser[]>>) {
  return useQuery<AdminManagementUser[]>({
    queryKey: ['admin', 'admins', 'list'],
    queryFn: async () => {
      const response = await fetch('/api/admin/admins/list', {
        signal: AbortSignal.timeout(15000)
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error || 'Failed to fetch admin users');
      }
      
      const body = await response.json();
      const raw = body.admins || [];

      return raw.map((p: any) => ({
        id: p.id,
        email: p.email || '',
        full_name: p.full_name || null,
        phone_number: p.phone_number || null,
        avatar_url: p.avatar_url || null,
        created_at: p.created_at || new Date().toISOString(),
        last_login_at: p.last_login_at || null,
        roles: p.roles || [],
        status: p.status || 'active',
      })) as AdminManagementUser[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

// Dashboard aggregate stats (example – adjust queries to match schema)
export function useAdminStats() {
  return useQuery({
    queryKey: ['admin','stats'],
    queryFn: async () => {
      const venuesEnabled = isVenuesEnabled();
      const [users, events, venues, pendingRoleReqs] = await Promise.all([
        fetchTable('profiles','id'),
        fetchTable('events','id'),
        venuesEnabled ? fetchTable('venues','id') : Promise.resolve([]),
        supabase.from('role_requests').select('id', { count: 'exact', head: true }).eq('status','pending'),
      ]);
      // role_requests count handled separately (head request) -> re-query for count
      const { count } = await supabase.from('role_requests').select('id', { count: 'exact', head: true }).eq('status','pending');
      return {
        totalUsers: users.length,
        totalEvents: events.length,
        totalVenues: venues.length,
        pendingApprovals: count || 0,
      };
    }
  });
}

export function useAdminDashboardData() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const venuesEnabled = isVenuesEnabled();
      const [
        usersCount, 
        eventsCount, 
        venuesCount, 
        pendingRoleReqsCount,
        recentUsers,
        recentEvents,
        recentRoleRequests
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }),
        venuesEnabled
          ? supabase.from('venues').select('id', { count: 'exact', head: true })
          : Promise.resolve({ count: 0 } as any),
        supabase.from('role_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('profiles').select('id, full_name, email, created_at, avatar_url').order('created_at', { ascending: false }).limit(5),
        supabase.from('events').select('id, title, start_date, status, image_url').order('created_at', { ascending: false }).limit(5),
        supabase.from('role_requests').select('id, user_id, request_type, created_at, status').eq('status', 'pending').order('created_at', { ascending: false }).limit(5)
      ]);

      // Manual join for role_requests with profiles
      const roleRequestUserIds = [...new Set((recentRoleRequests.data || []).map((r: any) => r.user_id).filter(Boolean))];
      let roleRequestProfiles = new Map<string, string>();
      
      if (roleRequestUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', roleRequestUserIds);
          
        if (profiles) {
          profiles.forEach((p: any) => {
            roleRequestProfiles.set(p.id, p.full_name || 'Unknown');
          });
        }
      }

      return {
        stats: {
          totalUsers: usersCount.count || 0,
          totalEvents: eventsCount.count || 0,
          totalVenues: venuesCount.count || 0,
          pendingApprovals: pendingRoleReqsCount.count || 0,
        },
        recentUsers: recentUsers.data || [],
        recentEvents: recentEvents.data || [],
        recentRoleRequests: (recentRoleRequests.data || []).map((r: any) => ({
          ...r,
          user_name: roleRequestProfiles.get(r.user_id) || 'Unknown'
        })),
      };
    }
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ['admin', 'system', 'health'],
    queryFn: async () => {
      const start = performance.now();
      let dbStatus = 'Operational';
      let apiStatus = '100% Uptime';
      let storageStatus = 'Operational';
      
      // Parallel checks: connectivity + metrics
      const [connectivityResult, metricsResult] = await Promise.allSettled([
        (async () => {
          // Check DB & API
          const { error: dbError } = await supabase.from('profiles').select('id').limit(1);
          if (dbError) throw dbError;
          // Check Storage
          const { error: storageError } = await supabase.storage.listBuckets();
          if (storageError) throw new Error('Storage error');
          return true;
        })(),
        fetch('/api/admin/system/metrics', {
          signal: AbortSignal.timeout(10000) // Lower 10s timeout for metrics
        }).then(res => {
          if (res.status === 501) return null; // Not configured
          if (!res.ok) throw new Error('Metrics failed');
          return res.json();
        })
      ]);

      // Process Connectivity
      if (connectivityResult.status === 'rejected') {
        dbStatus = 'Degraded';
        apiStatus = 'Partial Outage'; 
        // We could be more specific but this matches previous logic
        if (connectivityResult.reason?.message === 'Storage error') {
            dbStatus = 'Operational'; // Reset if it was just storage
            storageStatus = 'Degraded';
        }
      }

      const latency = Math.round(performance.now() - start);

      // Process Metrics
      const metrics = metricsResult.status === 'fulfilled' ? metricsResult.value : null;

      return {
        database: dbStatus,
        api: apiStatus,
        storage: storageStatus,
        cdn: 'Operational', // Assumed
        latency: `${latency}ms`,
        metrics: metrics ? {
            cpu: metrics.cpu, // Load Average
            memory: metrics.memory, // Percentage
            storage: metrics.storageUsage, // Percentage
            connections: metrics.activeConnections, // Count
        } : null
      };
    },
    refetchInterval: 30000, // Check every 30s
  });
}

// ---------------- Flagged Items (Policy System) ---------------- //

export interface FlaggedItemsStats {
  total: number;
  pending: number;
  resolved: number;
  events: number;
  venues: number;
  by_severity: Record<string, number>;
}

export interface FlaggedItemFilters {
  item_type?: string; // 'event' | 'venue'
  resolution?: string; // e.g. 'pending'
  reviewed?: boolean; // reviewed flag
  severity?: string; // 'low' | 'medium' | 'high' | 'critical'
}

export interface AdminFlaggedItem extends FlaggedItem {
  item_details?: any; // API returns embedded details
}

export function useAdminFlaggedItems(
  filters: FlaggedItemFilters,
  options?: Partial<UseQueryOptions<AdminFlaggedItem[]>>
) {
  return useQuery<AdminFlaggedItem[]>({
    queryKey: ['admin','flaggedItems', filters],
    queryFn: async () => {
      const data = await policyService.getFlaggedItems(filters as any);
      return (data || []) as AdminFlaggedItem[];
    },
    // Prevent firing if not enabled explicitly by consumer (e.g. awaiting auth)
    ...options,
  });
}

export function useAdminFlaggedItemsStats(options?: Partial<UseQueryOptions<FlaggedItemsStats>>) {
  return useQuery<FlaggedItemsStats>({
    queryKey: ['admin','flaggedItems','stats'],
    queryFn: async () => {
      const stats = await policyService.getFlaggedItemsStats();
      return stats as FlaggedItemsStats;
    },
    ...options,
  });
}

// ---------------- Admin Reports: Users ---------------- //

export interface AdminUsersReportData {
  dates: string[];
  userGrowth: number[];
  totalUsers: number;
  newUsersInPeriod: number;
  dailyActiveUsers: number; // Users who logged in within last 24 hours
  monthlyActiveUsers: number; // Users who logged in within last 30 days
  yearlyActiveUsers: number; // Users who logged in within last 365 days
  dauTrend: number[]; // DAU over the date range
  mauTrend: number[]; // MAU over the date range
  platformUsage: {
    labels: string[];
    data: number[];
  };
}

export interface AdminUsersReportParams {
  startDate?: string;
  endDate?: string;
  timeRange?: '7d' | '30d' | '90d' | 'custom';
}


export async function fetchUsersReport(params: AdminUsersReportParams = {}) {
  // Calculate date range with proper time boundaries
  const now = new Date();
  let startDate = params.startDate;
  let endDate = params.endDate;

  if (!startDate) {
    const daysAgo = params.timeRange === '7d' ? 7 : params.timeRange === '30d' ? 30 : 90;
    const start = new Date(now);
    start.setDate(start.getDate() - daysAgo);
    start.setHours(0, 0, 0, 0); // Start of day
    startDate = start.toISOString();
  } else {
    // If startDate is provided, ensure it has start-of-day time
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    startDate = start.toISOString();
  }

  if (!endDate) {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999); // End of day
    endDate = end.toISOString();
  } else {
    // If endDate is provided, ensure it has end-of-day time
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    endDate = end.toISOString();
  }

  // Fetch total users count
  const { count: totalUsers, error: countError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  if (countError) throw countError;

  // Fetch users created within the date range
  const { data: newUsers, error: newUsersError } = await supabase
    .from('profiles')
    .select('created_at')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: true });

  if (newUsersError) throw newUsersError;

  // Group users by date for growth chart
  const usersByDate = new Map<string, number>();

  (newUsers || []).forEach((user: any) => {
    // Format date as YYYY-MM-DD for grouping
    const dateKey = new Date(user.created_at).toISOString().split('T')[0];
    usersByDate.set(dateKey, (usersByDate.get(dateKey) || 0) + 1);
  });

  // Generate continuous date range
  const dates: string[] = [];
  const userGrowth: number[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateKey = d.toISOString().split('T')[0];
    dates.push(dateKey);
    userGrowth.push(usersByDate.get(dateKey) || 0);
  }

  // Calculate active users metrics based on last_login_at
  const nowTimestamp = new Date();
  
  // Daily Active Users (last 24 hours)
  const oneDayAgo = new Date(nowTimestamp);
  oneDayAgo.setHours(oneDayAgo.getHours() - 24);
  const { count: dailyActiveUsers, error: dauError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('updated_at', oneDayAgo.toISOString())
    .not('updated_at', 'is', null);

  if (dauError) throw dauError;

  // Monthly Active Users (last 30 days)
  const thirtyDaysAgo = new Date(nowTimestamp);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { count: monthlyActiveUsers, error: mauError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('updated_at', thirtyDaysAgo.toISOString())
    .not('updated_at', 'is', null);

  if (mauError) throw mauError;

  // Yearly Active Users (last 365 days)
  const oneYearAgo = new Date(nowTimestamp);
  oneYearAgo.setDate(oneYearAgo.getDate() - 365);
  const { count: yearlyActiveUsers, error: yauError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('updated_at', oneYearAgo.toISOString())
    .not('updated_at', 'is', null);

  if (yauError) throw yauError;

  // Calculate DAU trend over the date range (daily snapshots)
  const dauTrend: number[] = [];
  const mauTrend: number[] = [];

  for (const dateKey of dates) {
    const checkDate = new Date(dateKey);
    checkDate.setHours(23, 59, 59, 999); // End of that day

    // DAU for that day (last 24 hours from that point)
    const dayBefore = new Date(checkDate);
    dayBefore.setHours(dayBefore.getHours() - 24);

    const { count: dauCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', dayBefore.toISOString())
      .lte('updated_at', checkDate.toISOString())
      .not('updated_at', 'is', null);

    dauTrend.push(dauCount || 0);

    // MAU for that day (last 30 days from that point)
    const monthBefore = new Date(checkDate);
    monthBefore.setDate(monthBefore.getDate() - 30);

    const { count: mauCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', monthBefore.toISOString())
      .lte('updated_at', checkDate.toISOString())
      .not('updated_at', 'is', null);

    mauTrend.push(mauCount || 0);
  }

  // Platform usage data - Since we don't have platform info, show all as Web
  return {
    dates,
    userGrowth,
    totalUsers: totalUsers || 0,
    newUsersInPeriod: newUsers?.length || 0,
    dailyActiveUsers: dailyActiveUsers || 0,
    monthlyActiveUsers: monthlyActiveUsers || 0,
    yearlyActiveUsers: yearlyActiveUsers || 0,
    dauTrend,
    mauTrend,
    platformUsage: {
      labels: ['Web'],
      data: [totalUsers || 0],
    },
  };
}

export function useAdminUsersReport(
  params: AdminUsersReportParams = {},
  options?: Partial<UseQueryOptions<AdminUsersReportData>>
) {
  return useQuery<AdminUsersReportData>({
    queryKey: ['admin', 'reports', 'users', params],
    queryFn: () => fetchUsersReport(params),
    ...options,
  });
}

// ---------------- Admin Reports: Events ---------------- //

export interface AdminEventsReportData {
  dates: string[];
  eventCount: number[];
  ticketSales: number[];
  totalEvents: number;
  publishedEvents: number;
  draftEvents: number;
  categoryDistribution: {
    labels: string[];
    data: number[];
  };
  topEvents: Array<{
    id: string;
    name: string;
    category: string;
    tickets: number;
    revenue: number;
  }>;
}

export interface AdminEventsReportParams {
  startDate?: string;
  endDate?: string;
  timeRange?: '7d' | '30d' | '90d' | 'custom';
}



export async function fetchEventsReport(params: AdminEventsReportParams = {}) {
  // Calculate date range with proper time boundaries
  const now = new Date();
  let startDate = params.startDate;
  let endDate = params.endDate;

  if (!startDate) {
    const daysAgo = params.timeRange === '7d' ? 7 : params.timeRange === '30d' ? 30 : 90;
    const start = new Date(now);
    start.setDate(start.getDate() - daysAgo);
    start.setHours(0, 0, 0, 0); // Start of day
    startDate = start.toISOString();
  } else {
    // If startDate is provided, ensure it has start-of-day time
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    startDate = start.toISOString();
  }

  if (!endDate) {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999); // End of day
    endDate = end.toISOString();
  } else {
    // If endDate is provided, ensure it has end-of-day time
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    endDate = end.toISOString();
  }

  // Fetch total event counts
  const { count: totalEvents, error: countError } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true });

  if (countError) throw countError;

  // Fetch published and draft counts
  const { count: publishedEvents } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published');

  const { count: draftEvents } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'draft');

  // Fetch events within date range with full data
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, title, category, created_at, tickets_sold, status, tickets')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: true });

  if (eventsError) throw eventsError;

  // Group events by date
  const eventsByDate = new Map<string, number>();
  const ticketsByDate = new Map<string, number>();
  const categoryCount = new Map<string, number>();

  (events || []).forEach((event: any) => {
    // Format date as YYYY-MM-DD
    const dateKey = new Date(event.created_at).toISOString().split('T')[0];
    eventsByDate.set(dateKey, (eventsByDate.get(dateKey) || 0) + 1);
    ticketsByDate.set(dateKey, (ticketsByDate.get(dateKey) || 0) + (event.tickets_sold || 0));

    // Count categories
    const category = event.category || 'Uncategorized';
    categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
  });

  // Generate continuous date range
  const dates: string[] = [];
  const eventCount: number[] = [];
  const ticketSales: number[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateKey = d.toISOString().split('T')[0];
    dates.push(dateKey);
    eventCount.push(eventsByDate.get(dateKey) || 0);
    ticketSales.push(ticketsByDate.get(dateKey) || 0);
  }

  // Get top events by tickets sold
  const topEventsByTickets = [...(events || [])]
    .filter((e: any) => e.status === 'published')
    .sort((a: any, b: any) => (b.tickets_sold || 0) - (a.tickets_sold || 0))
    .slice(0, 5);

  const topEvents = topEventsByTickets.map((event: any) => {
    // Calculate revenue from tickets
    let revenue = 0;
    if (event.tickets && Array.isArray(event.tickets)) {
      revenue = event.tickets.reduce((sum: number, ticket: any) => {
        const price = parseFloat(ticket.price || 0);
        const sold = parseInt(ticket.sold || 0);
        return sum + (price * sold);
      }, 0);
    }

    return {
      id: event.id,
      name: event.title || 'Untitled Event',
      category: event.category || 'Uncategorized',
      tickets: event.tickets_sold || 0,
      revenue: revenue,
    };
  });

  // Category distribution data
  const categoryLabels = Array.from(categoryCount.keys());
  const categoryData = Array.from(categoryCount.values());

  return {
    dates,
    eventCount,
    ticketSales,
    totalEvents: totalEvents || 0,
    publishedEvents: publishedEvents || 0,
    draftEvents: draftEvents || 0,
    categoryDistribution: {
      labels: categoryLabels.length > 0 ? categoryLabels : ['No Events'],
      data: categoryData.length > 0 ? categoryData : [0],
    },
    topEvents,
  };
}

export function useAdminEventsReport(
  params: AdminEventsReportParams = {},
  options?: Partial<UseQueryOptions<AdminEventsReportData>>
) {
  return useQuery<AdminEventsReportData>({
    queryKey: ['admin', 'reports', 'events', params],
    queryFn: () => fetchEventsReport(params),
    ...options,
  });
}

// =====================================================
// ROLE REQUESTS REPORT
// =====================================================

export interface AdminRoleRequestsReportData {
  dates: string[];
  requestCount: number[];
  approvalRate: number[]; // Daily approval rates for chart
  overallApprovalRate: number; // Overall approval rate percentage
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  revokedRequests: number;
  requestTypeDistribution: {
    labels: string[];
    data: number[];
  };
  avgProcessingTime: number; // in hours
  topRequestors: Array<{
    id: string;
    name: string;
    email: string;
    requestType: string;
    status: string;
    submittedAt: string;
  }>;
}

export interface AdminRoleRequestsReportParams {
  startDate?: string;
  endDate?: string;
  timeRange?: '7d' | '30d' | '90d' | 'custom';
}



export async function fetchRoleRequestsReport(params: AdminRoleRequestsReportParams = {}) {
  // Calculate date range with proper time boundaries
  const now = new Date();
  let startDate = params.startDate;
  let endDate = params.endDate;

  if (!startDate) {
    const daysAgo = params.timeRange === '7d' ? 7 : params.timeRange === '30d' ? 30 : 90;
    const start = new Date(now);
    start.setDate(start.getDate() - daysAgo);
    start.setHours(0, 0, 0, 0);
    startDate = start.toISOString();
  } else {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    startDate = start.toISOString();
  }

  if (!endDate) {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    endDate = end.toISOString();
  } else {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    endDate = end.toISOString();
  }

  // Fetch total request counts by status
  const { count: totalRequests } = await supabase
    .from('role_requests')
    .select('*', { count: 'exact', head: true });

  const { count: pendingRequests } = await supabase
    .from('role_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  const { count: approvedRequests } = await supabase
    .from('role_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');

  const { count: rejectedRequests } = await supabase
    .from('role_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'rejected');

  const { count: revokedRequests } = await supabase
    .from('role_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'revoked');

  // Fetch requests in date range
  const { data: requestsData, error: requestsError } = await supabase
    .from('role_requests')
    .select('id, user_id, request_type, status, submitted_at, reviewed_at')
    .gte('submitted_at', startDate)
    .lte('submitted_at', endDate)
    .order('submitted_at', { ascending: true });

  if (requestsError) throw requestsError;

  // Manual join with profiles to get user names/emails
  const userIds = [...new Set((requestsData || []).map((r: any) => r.user_id).filter(Boolean))];
  const profilesMap = new Map<string, { full_name: string, email: string }>();
  
  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);
      
    if (!profilesError && profiles) {
      profiles.forEach((p: any) => {
        profilesMap.set(p.id, { full_name: p.full_name, email: p.email });
      });
    }
  }

  const requests = (requestsData || []).map((r: any) => ({
    ...r,
    user_name: profilesMap.get(r.user_id)?.full_name || 'Unknown',
    user_email: profilesMap.get(r.user_id)?.email || ''
  }));

  // Group requests by date
  const requestsByDate = new Map<string, number>();
  const approvalsByDate = new Map<string, { approved: number; total: number }>();
  const typeCount = new Map<string, number>();
  let totalProcessingTime = 0;
  let processedCount = 0;

  requests.forEach((request: any) => {
    const dateKey = new Date(request.submitted_at).toISOString().split('T')[0];
    requestsByDate.set(dateKey, (requestsByDate.get(dateKey) || 0) + 1);

    // Track approval rate
    if (!approvalsByDate.has(dateKey)) {
      approvalsByDate.set(dateKey, { approved: 0, total: 0 });
    }
    const dayStats = approvalsByDate.get(dateKey)!;
    dayStats.total += 1;
    if (request.status === 'approved') {
      dayStats.approved += 1;
    }

    // Count by type
    const type = request.request_type === 'organizer' ? 'Organizer' : 'Venue Owner';
    typeCount.set(type, (typeCount.get(type) || 0) + 1);

    // Calculate processing time for completed requests
    if (request.reviewed_at && request.submitted_at) {
      const submitted = new Date(request.submitted_at).getTime();
      const reviewed = new Date(request.reviewed_at).getTime();
      const hours = (reviewed - submitted) / (1000 * 60 * 60);
      totalProcessingTime += hours;
      processedCount += 1;
    }
  });

  // Generate continuous date range
  const dates: string[] = [];
  const requestCount: number[] = [];
  const approvalRate: number[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateKey = d.toISOString().split('T')[0];
    dates.push(dateKey);
    requestCount.push(requestsByDate.get(dateKey) || 0);
    
    const dayStats = approvalsByDate.get(dateKey);
    if (dayStats && dayStats.total > 0) {
      approvalRate.push(Math.round((dayStats.approved / dayStats.total) * 100));
    } else {
      approvalRate.push(0);
    }
  }

  // Get top recent requestors
  const topRequestors = requests.slice(-10).reverse().map((req: any) => ({
    id: req.id,
    name: req.user_name || 'Unknown',
    email: req.user_email || '',
    requestType: req.request_type === 'organizer' ? 'Organizer' : 'Venue Owner',
    status: req.status,
    submittedAt: req.submitted_at,
  }));

  // Calculate overall approval rate
  const totalProcessed = (approvedRequests || 0) + (rejectedRequests || 0);
  const overallApprovalRate = totalProcessed > 0 
    ? Math.round(((approvedRequests || 0) / totalProcessed) * 100) 
    : 0;

  return {
    dates,
    requestCount,
    approvalRate,
    overallApprovalRate,
    totalRequests: totalRequests || 0,
    pendingRequests: pendingRequests || 0,
    approvedRequests: approvedRequests || 0,
    rejectedRequests: rejectedRequests || 0,
    revokedRequests: revokedRequests || 0,
    requestTypeDistribution: {
      labels: Array.from(typeCount.keys()),
      data: Array.from(typeCount.values()),
    },
    avgProcessingTime: processedCount > 0 ? Math.round(totalProcessingTime / processedCount) : 0,
    topRequestors,
  };
}

export function useAdminRoleRequestsReport(
  params: AdminRoleRequestsReportParams = {},
  options?: Partial<UseQueryOptions<AdminRoleRequestsReportData>>
) {
  return useQuery<AdminRoleRequestsReportData>({
    queryKey: ['admin', 'reports', 'role-requests', params],
    queryFn: () => fetchRoleRequestsReport(params),
    ...options,
  });
}
