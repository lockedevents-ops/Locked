/**
 * Top Organizers Service
 * --------------------------------------------------------------
 * Calculates and ranks organizers based on multiple performance criteria:
 * 1. Most Events Hosted (published events)
 * 2. Most Locked Events (events with is_locked = true)
 * 3. Most Booked Events (based on tickets_sold and attendee_count)
 * 
 * The service computes a weighted score and returns top organizers for homepage display.
 */

import { createClient } from '@/lib/supabase/client/client';

const TOP_ORGANIZERS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const topOrganizersCache: Map<string, { data: TopOrganizerMetrics[]; expiry: number }> = new Map();
const pendingTopOrganizersRequests: Map<string, Promise<TopOrganizerMetrics[]>> = new Map();

export interface TopOrganizerMetrics {
  organizer_id: string;
  name: string;
  profile_image?: string;
  bio?: string;
  location?: string;
  verification_status: string;
  
  // Core metrics
  events_hosted: number;
  locked_events: number;
  total_attendees: number;
  total_tickets_sold: number;
  total_event_locks?: number; // Sum of lock_count across all events
  
  // Calculated scores
  events_score: number;
  locked_score: number;
  booking_score: number;
  total_score: number;
  
  // Additional metadata
  city?: string;
  country?: string;
  followers_count?: number;
  avg_event_rating?: number;
}

export interface TopOrganizersConfig {
  limit?: number;
  includeUnverified?: boolean;
  weights?: {
    events: number;
    locked: number;
    bookings: number;
  };
}

export const topOrganizersService = {
  /**
   * Get top organizers based on performance metrics
   */
  async getTopOrganizers(config: TopOrganizersConfig = {}): Promise<TopOrganizerMetrics[]> {
    const {
      limit = 3, // Default to top 3 for homepage
      includeUnverified = false,
      weights = { events: 0.7, locked: 0.0, bookings: 0.3 } // Focus on events (70%) and followers (30%)
    } = config;
    const cacheKey = getTopOrganizersCacheKey({ limit, includeUnverified, weights });
    const cached = topOrganizersCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    if (pendingTopOrganizersRequests.has(cacheKey)) {
      return pendingTopOrganizersRequests.get(cacheKey)!;
    }

    const fetchPromise = (async () => {
      const supabase = createClient();
      try {
      // Build the main query to get organizers with their metrics
      let query = supabase
        .from('organizers')
        .select(`
          id,
          business_name,
          contact_email,
          logo_url,
          business_description,
          business_website,
          business_phone,
          user_id,
          status,
          created_at
        `)
        .eq('status', 'active');
      
      const { data: organizers, error: organizersError } = await query;
      
      if (organizersError) {
        console.error('Error fetching organizers:', organizersError);
        throw organizersError;
      }
      
      if (!organizers || organizers.length === 0) {
        return [];
      }
      
      // Fetch user avatars for organizers without logo_url (fallback)
      const organizersNeedingAvatars = organizers.filter((org: any) => !org.logo_url && org.user_id);
      const userAvatarMap: Record<string, string> = {};
      
      if (organizersNeedingAvatars.length > 0) {
        const userIds = organizersNeedingAvatars.map((org: any) => org.user_id);
        const { data: userProfiles } = await supabase
          .from('profiles')
          .select('id, avatar_url')
          .in('id', userIds);
        
        if (userProfiles) {
          userProfiles.forEach((profile: any) => {
            if (profile.avatar_url) {
              userAvatarMap[profile.id] = profile.avatar_url;
            }
          });
        }
      }
      
      // Get event metrics for each organizer
      const organizerIds = organizers.map((org: any) => org.id);
      
      const { data: eventMetrics, error: metricsError } = await supabase
        .from('events')
        .select(`
          organizer_id,
          status,
          attendee_count,
          tickets_sold,
          lock_count
        `)
        .in('organizer_id', organizerIds)
        .eq('status', 'published'); // Only count published events
      
      if (metricsError) {
        console.error('Error fetching event metrics:', metricsError);
        throw metricsError;
      }

      // Get follower counts for each organizer (if table exists)
      let followerCountMap: Record<string, number> = {};
      try {
        const { data: followerCounts, error: followersError } = await supabase
          .from('user_organizer_follows')
          .select('organizer_id')
          .in('organizer_id', organizerIds);
        
        if (followersError) {
          console.error('Error fetching follower counts:', followersError);
          // If table doesn't exist, continue without follower counts
        } else if (followerCounts) {
          // Count followers per organizer
          followerCounts.forEach((follow: any) => {
            followerCountMap[follow.organizer_id] = (followerCountMap[follow.organizer_id] || 0) + 1;
          });
        }
      } catch (error) {
        console.error('Error fetching follower counts (table may not exist):', error);
        // Continue without follower counts
      }
      
      // Get company names from role_requests for better organizer names
      const userIds = organizers.map((org: any) => org.user_id).filter(Boolean);
      
      let companyNames: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: roleRequestsData, error: roleError } = await supabase
          .from('role_requests')
          .select('user_id, company_name, status')
          .in('user_id', userIds)
          .eq('request_type', 'organizer')
          .not('company_name', 'is', null)
          .in('status', ['approved', 'pending'])
          .order('submitted_at', { ascending: false });
          
        if (!roleError && roleRequestsData) {
          // Create map of user_id -> company_name
          const seenUserIds = new Set();
          roleRequestsData.forEach((role: any) => {
            if (!seenUserIds.has(role.user_id) && role.company_name) {
              companyNames[role.user_id] = role.company_name.trim();
              seenUserIds.add(role.user_id);
            }
          });
        }
      }
      
      // Process metrics for each organizer
      const organizerMetrics: TopOrganizerMetrics[] = organizers
        .map((organizer: any) => {
          // Filter events for this organizer
          const organizerEvents = eventMetrics?.filter((event: any) => event.organizer_id === organizer.id) || [];
          
          // Calculate core metrics
          const events_hosted = organizerEvents.length;
          const locked_events = 0; // Since is_locked column doesn't exist, set to 0 for now
          const total_attendees = organizerEvents.reduce((sum: number, event: any) => sum + (event.attendee_count || 0), 0);
          const total_tickets_sold = organizerEvents.reduce((sum: number, event: any) => sum + (event.tickets_sold || 0), 0);
          const total_event_locks = organizerEvents.reduce((sum: number, event: any) => sum + (event.lock_count || 0), 0);
          
          // Calculate normalized scores (0-100 scale)
          // These will be normalized against all organizers after processing
          const events_score = events_hosted;
          const locked_score = locked_events;
          const booking_score = Math.max(total_attendees, total_tickets_sold); // Use the higher value
          
          // Get organizer name - prioritize organizers table (source of truth for current name)
          // Fall back to role_requests.company_name only if organizer.business_name is not set
          const organizerName = organizer.business_name 
            || (organizer.user_id && companyNames[organizer.user_id]) 
            || 'Unnamed Organizer';
          
          // Get follower count from the map
          const followersCount = followerCountMap[organizer.id] || 0;
          
          // Get profile image - use logo_url or fallback to user avatar
          const profileImage = organizer.logo_url || (organizer.user_id && userAvatarMap[organizer.user_id]) || '';
          
          return {
            organizer_id: organizer.id,
            name: organizerName,
            profile_image: profileImage,
            bio: organizer.business_description || 'Event organizer committed to delivering exceptional experiences.',
            location: 'Ghana', // Default location since city/country columns don't exist
            verification_status: organizer.status || 'pending',
            
            events_hosted,
            locked_events,
            total_attendees,
            total_tickets_sold,
            total_event_locks, // Add total event locks from all events
            
            events_score,
            locked_score,
            booking_score,
            total_score: 0, // Will be calculated after normalization
            
            city: undefined, // Column doesn't exist
            country: undefined, // Column doesn't exist
            followers_count: followersCount,
            avg_event_rating: 0, // TODO: Add event ratings when implemented
          };
        })
        .filter((organizer: TopOrganizerMetrics) => organizer.events_hosted > 0); // Only include organizers with at least 1 event
      
      // Normalize scores and calculate weighted total
      const normalizedMetrics = this.normalizeAndWeightScores(organizerMetrics, weights);
      
      // Sort by total score (descending) and return top results
      const sortedResults = normalizedMetrics
        .sort((a, b) => b.total_score - a.total_score)
        .slice(0, limit);
      
      // If no results, return sample data for testing
      if (sortedResults.length === 0) {
        return [
          {
            organizer_id: 'sample-1',
            name: 'Sample Event Company',
            profile_image: '',
            bio: 'A sample organizer to demonstrate the top organizers feature.',
            location: 'Accra, Ghana',
            verification_status: 'active',
            events_hosted: 5,
            locked_events: 2,
            total_attendees: 150,
            total_tickets_sold: 120,
            events_score: 100,
            locked_score: 100,
            booking_score: 100,
            total_score: 100,
            city: undefined,
            country: undefined,
            followers_count: 0,
            avg_event_rating: 0,
          },
          {
            organizer_id: 'sample-2',
            name: 'Ghana Events Hub',
            profile_image: '',
            bio: 'Another sample organizer showcasing the ranking system.',
            location: 'Kumasi, Ghana',
            verification_status: 'active',
            events_hosted: 3,
            locked_events: 1,
            total_attendees: 80,
            total_tickets_sold: 75,
            events_score: 60,
            locked_score: 50,
            booking_score: 53,
            total_score: 85,
            city: undefined,
            country: undefined,
            followers_count: 0,
            avg_event_rating: 0,
          }
        ];
      }
      
      return sortedResults;
      
    } catch (error) {
      console.error('Error getting top organizers:', error);
      throw error;
    }
    })();

    pendingTopOrganizersRequests.set(cacheKey, fetchPromise);

    try {
      const results = await fetchPromise;
      topOrganizersCache.set(cacheKey, {
        data: results,
        expiry: Date.now() + TOP_ORGANIZERS_CACHE_DURATION
      });
      return results;
    } finally {
      pendingTopOrganizersRequests.delete(cacheKey);
    }
  },

  /**
   * Normalize scores to 0-100 scale and apply weights
   */
  normalizeAndWeightScores(
    metrics: TopOrganizerMetrics[], 
    weights: { events: number; locked: number; bookings: number }
  ): TopOrganizerMetrics[] {
    if (metrics.length === 0) return metrics;
    
    // Find max values for normalization
    const maxEvents = Math.max(...metrics.map(m => m.events_score));
    const maxLocked = Math.max(...metrics.map(m => m.locked_score));
    const maxBookings = Math.max(...metrics.map(m => m.booking_score));
    
    // Avoid division by zero
    const eventsNorm = maxEvents > 0 ? maxEvents : 1;
    const lockedNorm = maxLocked > 0 ? maxLocked : 1;
    const bookingsNorm = maxBookings > 0 ? maxBookings : 1;
    
    return metrics.map(metric => ({
      ...metric,
      events_score: (metric.events_score / eventsNorm) * 100,
      locked_score: (metric.locked_score / lockedNorm) * 100,
      booking_score: (metric.booking_score / bookingsNorm) * 100,
      total_score: (
        ((metric.events_score / eventsNorm) * 100 * weights.events) +
        ((metric.locked_score / lockedNorm) * 100 * weights.locked) +
        ((metric.booking_score / bookingsNorm) * 100 * weights.bookings)
      )
    }));
  },

  /**
   * Format location string from city and country
   */
  formatLocation(city?: string, country?: string): string {
    if (city && country) {
      return `${city}, ${country}`;
    } else if (city) {
      return city;
    } else if (country) {
      return country;
    } else {
      return 'Ghana'; // Default location
    }
  },

  /**
   * Get detailed metrics for a specific organizer
   */
  async getOrganizerMetrics(organizerId: string): Promise<TopOrganizerMetrics | null> {
    try {
      const results = await this.getTopOrganizers({ 
        limit: 1000, // Get all to find specific organizer
        includeUnverified: true 
      });
      
      return results.find(org => org.organizer_id === organizerId) || null;
    } catch (error) {
      console.error('Error getting organizer metrics:', error);
      return null;
    }
  },

  /**
   * Get organizers ranked by a specific metric
   */
  async getOrganizersByMetric(
    metric: 'events_hosted' | 'locked_events' | 'total_attendees' | 'total_tickets_sold',
    limit = 10
  ): Promise<TopOrganizerMetrics[]> {
    try {
      const organizers = await this.getTopOrganizers({ 
        limit: 100, // Get more to sort by specific metric
        includeUnverified: false 
      });
      
      return organizers
        .sort((a, b) => b[metric] - a[metric])
        .slice(0, limit);
    } catch (error) {
      console.error(`Error getting organizers by ${metric}:`, error);
      return [];
    }
  },

  /**
   * Get organizer performance summary stats
   */
  async getPerformanceSummary(): Promise<{
    total_organizers: number;
    active_organizers: number;
    total_events: number;
    total_locked_events: number;
    total_attendees: number;
    avg_events_per_organizer: number;
  }> {
    const supabase = createClient();
    
    try {
      // Get organizer counts
      const { data: organizerStats, error: orgError } = await supabase
        .from('organizers')
        .select('id, status')
        .eq('status', 'active');
      
      if (orgError) throw orgError;
      
      // Get event stats
      const { data: eventStats, error: eventError } = await supabase
        .from('events')
        .select('organizer_id, is_locked, attendee_count, status')
        .eq('status', 'published');
      
      if (eventError) throw eventError;
      
      const total_organizers = organizerStats?.length || 0;
      const active_organizers = organizerStats?.filter((org: any) => org.status === 'active').length || 0;
      const total_events = eventStats?.length || 0;
      const total_locked_events = eventStats?.filter((event: any) => event.is_locked).length || 0;
      const total_attendees = eventStats?.reduce((sum: number, event: any) => sum + (event.attendee_count || 0), 0) || 0;
      
      return {
        total_organizers,
        active_organizers,
        total_events,
        total_locked_events,
        total_attendees,
        avg_events_per_organizer: total_organizers > 0 ? Math.round((total_events / total_organizers) * 10) / 10 : 0
      };
      
    } catch (error) {
      console.error('Error getting performance summary:', error);
      return {
        total_organizers: 0,
        active_organizers: 0,
        total_events: 0,
        total_locked_events: 0,
        total_attendees: 0,
        avg_events_per_organizer: 0
      };
    }
  },

  clearCache(): void {
    topOrganizersCache.clear();
    pendingTopOrganizersRequests.clear();
  }
};

type CacheKeyConfig = {
  limit: number;
  includeUnverified: boolean;
  weights?: TopOrganizersConfig['weights'];
};

function getTopOrganizersCacheKey(config: CacheKeyConfig): string {
  const weights = config.weights || { events: 0.7, locked: 0.0, bookings: 0.3 };
  return JSON.stringify({
    limit: config.limit,
    includeUnverified: config.includeUnverified,
    weights: {
      events: weights.events ?? 0,
      locked: weights.locked ?? 0,
      bookings: weights.bookings ?? 0
    }
  });
}
