/**
 * Shared Event Service
 * --------------------------------------------------------------
 * Unified event fetching service for homepage sections to reduce API calls.
 * Fetches all events once and provides filtered/sorted subsets for each section.
 * 
 * @version 2.1.0 - Added cache metrics integration
 */

import { createClient as createBrowserClient } from '@/lib/supabase/client/client';
import { getFormattedImagePath } from '@/utils/imageHelpers';
import { formatPrice } from '@/utils/priceUtils';
import { engagementService } from './engagementService';
import { isUUID } from '@/utils/slugify';
import { getRecentlyViewedEvents } from '@/utils/recentlyViewed';
import { recordCacheHit, recordCacheMiss, recordCacheEviction } from '@/utils/cacheMetrics';

export interface EventData {
  id: string;
  slug: string; // URL-friendly slug for public pages
  title: string;
  description: string;
  imageUrl?: string;
  category: string;
  startDate: string;
  endDate?: string;
  date: string;
  time: string;
  endTime?: string;
  location: string;
  venue?: string;
  price: string;
  status: string;
  isFeatured: boolean;
  attendeeCount: number;
  ticketsSold: number;
  remainingTickets?: number;
  tickets?: any[];
  lockCount: number;
  viewCount: number;
  likes: number;
  clickCount?: number;
  featuredType?: 'auto' | 'manual' | 'none';
  featuredScore?: number;
  featuredReason?: string;
  organizer?: {
    id: string;
    name: string;
    email: string;
    image?: string;
    premiumTier?: 'platinum' | 'elite' | null;
    rank?: number; // Top organizer rank (1=Elite, 2=Platinum, 3=Gold)
  };
  hasVoting: boolean;
  voteCost?: number;
  vote_cost?: number;
  createdAt: string;
  recommendationReason?: string;
  ageRestriction?: number; // Minimum age restriction (e.g., 18 for adult content)
  isAdult?: boolean; // Flag for 18+ adult content
  hasMerch?: boolean; // Flag for events with merchandise
}

export interface HomepageEventData {
  featuredEvents: EventData[];
  trendingEvents: EventData[];
  recommendedEvents: EventData[];
  liveEvents: EventData[];
  upcomingEvents: EventData[];
}



/**
 * Helper function to extract date portion from timestamp (YYYY-MM-DD)
 * Handles "YYYY-MM-DD", "YYYY-MM-DDTHH:mm:ss", and "YYYY-MM-DD HH:mm:ss"
 */
export function extractDatePortion(dateStr: string): string {
  if (!dateStr) return '';
  // Take first 10 chars (YYYY-MM-DD) which works for ISO and Supabase formats
  return dateStr.substring(0, 10);
}

/**
 * Check if an event is currently live/ongoing
 * An event is "live" if it has started but not ended
 */
export function isEventLive(event: any): boolean {
  const now = new Date();
  
  // Use both camelCase (EventData) and snake_case (raw DB) for compatibility
  const startDate = event.startDate || event.start_date;
  const startTime = event.time || event.start_time;
  const endDate = event.endDate || event.end_date;
  const endTime = event.endTime || event.end_time;
  
  // Check if event has started
  let hasStarted = false;
  if (startDate && startTime) {
    const datePart = extractDatePortion(startDate);
    const startDateTime = new Date(`${datePart}T${startTime}`);
    hasStarted = now >= startDateTime;
  } else if (startDate) {
    const datePart = extractDatePortion(startDate);
    const startDateTime = new Date(`${datePart}T00:00:00`);
    hasStarted = now >= startDateTime;
  }
  
  if (!hasStarted) return false;
  
  // Check if event has ended
  if (endDate && endTime) {
    const datePart = extractDatePortion(endDate);
    const endDateTime = new Date(`${datePart}T${endTime}`);
    return now < endDateTime;
  }
  
  if (endDate) {
    const datePart = extractDatePortion(endDate);
    const endDateTime = new Date(`${datePart}T23:59:59`);
    return now < endDateTime;
  }
  
  // If no end date but has start time, assume 4 hour duration
  if (startDate && startTime) {
    const datePart = extractDatePortion(startDate);
    const startDateTime = new Date(`${datePart}T${startTime}`);
    const assumedEndTime = new Date(startDateTime.getTime() + (4 * 60 * 60 * 1000));
    return now < assumedEndTime;
  }
  
  return false;
}

/**
 * Check if an event is upcoming (hasn't started yet)
 * An event is "upcoming" if its start time is in the future
 */
export function isEventUpcoming(event: any): boolean {
  const now = new Date();
  
  const startDate = event.startDate || event.start_date;
  const startTime = event.time || event.start_time;
  
  // If no start date, can't be upcoming
  if (!startDate) return false;
  
  if (startDate && startTime) {
    const datePart = extractDatePortion(startDate);
    const startDateTime = new Date(`${datePart}T${startTime}`);
    return now < startDateTime;
  }
  
  // Loophole: If only start date (no time), assume starts at 00:00:00
  const datePart = extractDatePortion(startDate);
  const startDateTime = new Date(`${datePart}T00:00:00`);
  return now < startDateTime;
}

/**
 * Check if an event is past (has ended)
 * An event is "past" if it has ended
 */
export function isPastEvent(event: any): boolean {
  // If it's not upcoming and not live, it's past
  // But we should be explicit with date checks to be safe
  const now = new Date();
  
  const startDate = event.startDate || event.start_date;
  const startTime = event.time || event.start_time;
  const endDate = event.endDate || event.end_date;
  const endTime = event.endTime || event.end_time;
  
  // If we can't determine start/end, default to false (safe)
  if (!startDate) return false;
  
  // 1. Explicit end date/time
  if (endDate && endTime) {
    const datePart = extractDatePortion(endDate);
    const endDateTime = new Date(`${datePart}T${endTime}`);
    return now > endDateTime;
  }
  
  // 2. Explicit end date (entire day) - assume ends at 23:59:59
  if (endDate) {
    const datePart = extractDatePortion(endDate);
    const endDateTime = new Date(`${datePart}T23:59:59`);
    return now > endDateTime;
  }
  
  // 3. No end date, but has start time - assume 4 hour duration
  if (startDate && startTime) {
    const datePart = extractDatePortion(startDate);
    const startDateTime = new Date(`${datePart}T${startTime}`);
    // Assume 4 hour duration if no end date specified
    const assumedEndTime = new Date(startDateTime.getTime() + (4 * 60 * 60 * 1000));
    return now > assumedEndTime;
  }
  
  // 4. Only start date - assume ends at 23:59:59 same day
  const datePart = extractDatePortion(startDate);
  const endDateTime = new Date(`${datePart}T23:59:59`);
  return now > endDateTime;
}

class SharedEventService {
  private eventCache: EventData[] | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private isLoading = false;
  
  // ✅ PHASE 2: Request deduplication - track pending requests
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private readonly QUERY_TIMEOUT_MS = 15000;

  // ✅ PERFORMANCE: Organizer tier info cached in background (non-blocking)
  private _cachedOrganizerTiers: Map<string, { premiumTier: 'elite' | 'platinum' | null, rank: number }> = new Map();
  private _tierRefreshInFlight = false;

  /**
   * Background-refresh organizer tier data.
   * Never blocks the main fetch path; errors are swallowed silently.
   */
  private _refreshOrganizerTiers(): void {
    if (this._tierRefreshInFlight) return;
    this._tierRefreshInFlight = true;

    import('@/services/topOrganizersService')
      .then(({ topOrganizersService }) =>
        topOrganizersService.getTopOrganizers({
          limit: 3,
          includeUnverified: true,
          weights: { events: 0.7, locked: 0.0, bookings: 0.3 },
        }),
      )
      .then((topOrganizers) => {
        const newMap = new Map<string, { premiumTier: 'elite' | 'platinum' | null; rank: number }>();
        topOrganizers.forEach((org, index) => {
          const rank = index + 1;
          let premiumTier: 'elite' | 'platinum' | null = null;
          if (rank === 1) premiumTier = 'elite';
          else if (rank === 2) premiumTier = 'platinum';
          newMap.set(org.organizer_id, { premiumTier, rank });
        });
        this._cachedOrganizerTiers = newMap;
      })
      .catch(() => {
        /* swallow – tiers are cosmetic, not critical */
      })
      .finally(() => {
        this._tierRefreshInFlight = false;
      });
  }

  private withQueryTimeout<T>(promise: PromiseLike<T>, label: string, timeoutMs: number = this.QUERY_TIMEOUT_MS): Promise<T> {
    return Promise.race<T>([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  }
  
  // ✅ REALTIME: Separate cache for lock counts with shorter TTL
  private lockCountCache: Map<string, { count: number; expiry: number }> = new Map();
  private readonly LOCK_COUNT_CACHE_DURATION = 30 * 1000; // 30 seconds

  // Event-level cache for detail pages
  private eventDetailsCache: Map<string, { data: any; expiry: number }> = new Map();
  private pendingEventDetailRequests: Map<string, Promise<any | null>> = new Map();
  private readonly EVENT_DETAIL_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private homepageSnapshots: Map<string, { data: HomepageEventData; expiry: number }> = new Map();
  private readonly HOMEPAGE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private getHomepageCacheKey(userId?: string): string {
    return userId || 'anonymous';
  }

  getCachedHomepageEvents(userId?: string): HomepageEventData | null {
    const key = this.getHomepageCacheKey(userId);
    const snapshot = this.homepageSnapshots.get(key);
    if (!snapshot) {
      recordCacheMiss('homepage-events');
      return null;
    }

    if (Date.now() >= snapshot.expiry) {
      this.homepageSnapshots.delete(key);
      recordCacheEviction('homepage-events');
      return null;
    }

    recordCacheHit('homepage-events');
    return snapshot.data;
  }

  private cacheHomepageEvents(userId: string | undefined, data: HomepageEventData): void {
    const key = this.getHomepageCacheKey(userId);
    this.homepageSnapshots.set(key, {
      data,
      expiry: Date.now() + this.HOMEPAGE_CACHE_DURATION,
    });
  }

  /**
   * Check if an event is still active (hasn't ended yet)
   * An event is considered ended if the current time has passed its end_date + end_time
   */
  /**
   * Check if an event is still active (hasn't ended yet)
   * An event is considered ended if the current time has passed its end_date + end_time
   */
  private isEventActive(event: any): boolean {
    const now = new Date();
    
    const endDateValue = event.endDate || event.end_date;
    const endTimeValue = event.endTime || event.end_time;

    // If event has both end_date and end_time, combine them for precise checking
    if (endDateValue && endTimeValue) {
      const datePortion = extractDatePortion(endDateValue);
      const endDateTime = new Date(`${datePortion}T${endTimeValue}`);
      const isActive = now < endDateTime;
      return isActive;
    }
    
    // If only end_date exists (no end_time), consider the event ends at 23:59:59 that day
    if (endDateValue) {
      const datePortion = extractDatePortion(endDateValue);
      const endDateTime = new Date(`${datePortion}T23:59:59`);
      const isActive = now < endDateTime;
      return isActive;
    }
    
    // If no end_date but has start_date and start_time, assume event ends same day
    // This is a fallback - events should have end_date
    if (event.start_date && event.start_time) {
      const datePortion = extractDatePortion(event.start_date);
      const startDateTime = new Date(`${datePortion}T${event.start_time}`);
      // Assume events last 4 hours by default if no end time specified
      const assumedEndTime = new Date(startDateTime.getTime() + (4 * 60 * 60 * 1000));
      const isActive = now < assumedEndTime;
      return isActive;
    }
    
    // If only start_date exists, assume event ends at 23:59:59 that day
    if (event.start_date) {
      const datePortion = extractDatePortion(event.start_date);
      const endDateTime = new Date(`${datePortion}T23:59:59`);
      const isActive = now < endDateTime;
      return isActive;
    }
    
    // If no dates at all, keep it visible (shouldn't happen with published events)
    return true;
  }

  /**
   * Check if an event is currently live/ongoing
   * An event is "live" if it has started but not ended
   */
  /**
   * Check if an event is currently live/ongoing
   * An event is "live" if it has started but not ended
   */
  private isEventLive(event: any): boolean {
    return isEventLive(event);
  }

  /**
   * Check if an event is upcoming (hasn't started yet)
   * An event is "upcoming" if its start time is in the future
   * Multi-day events that have already started should NOT be considered upcoming
   */
  private isEventUpcoming(event: any): boolean {
    const now = new Date();
    
    // Use both camelCase (EventData) and snake_case (raw DB) for compatibility
    const startDate = event.startDate || event.start_date;
    const startTime = event.time || event.start_time;
    const endDate = event.endDate || event.end_date;
    const endTime = event.endTime || event.end_time;
    
    // First check if event has already started
    let hasStarted = false;
    if (startDate && startTime) {
      const datePart = extractDatePortion(startDate);
      const startDateTime = new Date(`${datePart}T${startTime}`);
      hasStarted = now >= startDateTime;
    } else if (startDate) {
      const datePart = extractDatePortion(startDate);
      const startDateTime = new Date(`${datePart}T00:00:00`);
      hasStarted = now >= startDateTime;
    }
    
    // If event has started, it's not upcoming (it's either live or past)
    if (hasStarted) {
      // Check if it's still ongoing (live) or already ended (past)
      if (endDate && endTime) {
        const datePart = extractDatePortion(endDate);
        const endDateTime = new Date(`${datePart}T${endTime}`);
        return false; // Not upcoming regardless of end time
      }
      return false; // Has started, not upcoming
    }
    
    // Event hasn't started yet - it's upcoming
    return true;
  }

  /**
   * Build a consistent location string using the newest event location fields
   */
  private buildLocationString(event: any): string {
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
      || '';
    const city = event.location_city || event.city || '';
    const region = event.location_region || event.region || '';
    const country = event.location_country || event.country || '';

    if (locationType === 'hybrid') {
      const hybridParts = [address, city].filter(Boolean);
      return hybridParts.length > 0 ? hybridParts.join(', ') : 'Hybrid Event';
    }

    const parts = [address, city, region, country]
      .map((part: any) => (typeof part === 'string' ? part.trim() : part))
      .filter(Boolean);

    return parts.length > 0 ? parts.join(', ') : 'Location TBD';
  }

  /**
   * Fetch all events from Supabase and cache them
   * ✅ PHASE 2: Implements request deduplication
   */
  private async fetchAllEvents(supabaseClient?: any): Promise<EventData[]> {
    const cacheKey = 'all-events';
    
    // Check cache first
    if (this.eventCache && Date.now() < this.cacheExpiry) {
      return this.eventCache;
    }

    // ✅ PHASE 2: If request already pending, return the same promise
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    // Create new request promise
    const requestPromise = this._fetchAllEventsInternal(supabaseClient);
    this.pendingRequests.set(cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Clean up pending request after completion
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Internal fetch implementation (separated for deduplication)
   */
  private async _fetchAllEventsInternal(supabaseClient?: any): Promise<EventData[]> {
    this.isLoading = true;

    try {
      const supabase = supabaseClient || createBrowserClient();
      let eventsData: any = null;
      let error: any = null;
      const MAX_RETRIES = 1;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          // 🚀 UPDATE: Add 15s timeout to prevent infinite loading on network hangs
          const timeoutPromise = new Promise<{ data: any, error: any }>((_, reject) => {
            setTimeout(() => reject(new Error('Events fetch timed out after 15s')), 15000);
          });

          const result = await Promise.race([
            supabase
              .from('events')
              .select(`
                *,
                organizer:organizers(
                  id,
                  business_name,
                  logo_url,
                  user_id
                )
              `)
              .eq('status', 'published')
              .order('created_at', { ascending: false })
              .limit(200),
            timeoutPromise
          ]);
          
          eventsData = result.data;
          error = result.error;

          if (!error) break; // Success

          if (attempt < MAX_RETRIES) {
             console.warn(`SharedEventService: Fetch attempt ${attempt + 1} failed. Retrying...`);
             await new Promise(r => setTimeout(r, 1000)); // 1s backoff
          }
        } catch (err: any) {
           if (attempt < MAX_RETRIES) {
             console.warn(`SharedEventService: Fetch attempt ${attempt + 1} timed out. Retrying...`);
             continue;
           }
           throw err;
        }
      }
        
      if (error) {
        console.error('SharedEventService: Error fetching events:', error);
        return [];
      }

      // Get all organizer user IDs to fetch company names in batch
      const organizerUserIds = eventsData
        .map((event: any) => event.organizer?.user_id)
        .filter(Boolean);
        
      // Fetch company names for all organizers
      const { data: roleRequestsData } = await supabase
        .from('role_requests')
        .select('user_id, company_name, status, business_email')
        .in('user_id', organizerUserIds)
        .eq('request_type', 'organizer')
        .not('company_name', 'is', null)
        .in('status', ['approved', 'pending'])
        .order('submitted_at', { ascending: false });
        
      // Create a map of user_id to company name and email
      const companyInfoMap = new Map<string, { name: string, email: string }>();
      roleRequestsData?.forEach((roleRequest: any) => {
        if (!companyInfoMap.has(roleRequest.user_id)) {
          companyInfoMap.set(roleRequest.user_id, {
            name: roleRequest.company_name,
            email: roleRequest.business_email
          });
        }
      });

      // Use cached organizer tiers (populated lazily in background, never blocks main fetch)
      const organizerTierMap = this._cachedOrganizerTiers;

      // Filter out events that have already ended before transformation
      const activeEventsData = eventsData.filter((event: any) => {
        return this.isEventActive(event);
      });

      // Transform data to our interface
      const transformedEvents: EventData[] = activeEventsData.map((event: any) => {
        const eventTime = event.start_time || '00:00';
        const locationString = this.buildLocationString(event);
        
        // Extract price with proper fallback logic
        let priceValue: string | number | null = null;
        
        // First, try to get price from tickets array
        if (event.tickets && Array.isArray(event.tickets) && event.tickets.length > 0) {
          const prices = event.tickets.map((ticket: any) => parseFloat(ticket.price || 0)).filter((p: number) => p > 0);
          if (prices.length > 0) {
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            if (minPrice === maxPrice) {
              priceValue = minPrice;
            } else {
              priceValue = `₵${minPrice.toFixed(0)} - ₵${maxPrice.toFixed(0)}`;
            }
          }
        }
        
        // Fallback to direct price field if tickets don't have pricing
        if (priceValue === null && event.price != null) {
          priceValue = event.price;
        }
        
        const priceString = formatPrice(priceValue);
        
        // Format date with multi-day event support
        let formattedDate = 'Date TBD';
        if (event.start_date) {
          const startDate = new Date(event.start_date);
          const endDate = event.end_date ? new Date(event.end_date) : null;
          
          // Check if it's a multi-day event
          if (endDate && startDate.toDateString() !== endDate.toDateString()) {
            // Multi-day event: format as date range
            const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
            const startDay = startDate.getDate();
            const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
            const endDay = endDate.getDate();
            const year = startDate.getFullYear();
            
            // Check if both dates are in the same month
            if (startMonth === endMonth) {
              // Same month: "Nov 4 - 7, 2025"
              formattedDate = `${startMonth} ${startDay} - ${endDay}, ${year}`;
            } else {
              // Different months: "Nov 30 - Dec 2, 2025"
              formattedDate = `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
            }
          } else {
            // Single-day event: "Nov 4, 2025"
            formattedDate = startDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric'
            });
          }
        }
        
        // Get organizer name - prioritize organizers table (source of truth for current name)
        // Fall back to role_requests.company_name only if organizer.business_name is not set
        const organizerInfo = event.organizer?.user_id ? companyInfoMap.get(event.organizer.user_id) : undefined;
        const organizerName = event.organizer?.business_name 
          || organizerInfo?.name
          || 'Unknown Organizer';

        const organizerEmail = organizerInfo?.email || '';

        return {
          id: event.id,
          slug: event.slug || event.id, // Fallback to id if slug is missing
          title: event.title || 'Untitled Event',
          description: event.description || '',
          imageUrl: getFormattedImagePath(event.image_url),
          category: event.category || 'General',
          startDate: event.start_date,
          endDate: event.end_date,
          date: formattedDate,
          time: eventTime,
          endTime: event.end_time,
          location: locationString,
          venue: event.venue,
          price: priceString,
          status: event.status,
          isFeatured: !!event.is_featured,
          attendeeCount: event.attendee_count || 0,
          ticketsSold: event.tickets_sold || 0,
          remainingTickets: Array.isArray(event.tickets) 
            ? event.tickets.reduce((t: number, tick: any) => t + Math.max(0, (tick.quantity || 0) - (tick.sold || 0)), 0) 
            : undefined,
          tickets: event.tickets,
          lockCount: event.lock_count || 0,
          viewCount: event.view_count || 0,
          likes: event.likes || 0,
          organizer: event.organizer ? (() => {
            const tierInfo = organizerTierMap.get(event.organizer.id);
            return {
              id: event.organizer.id,
              name: organizerName, // Use company name if available
              email: organizerEmail,
              image: event.organizer.logo_url,
              premiumTier: tierInfo?.premiumTier || null,
              rank: tierInfo?.rank
            };
          })() : undefined,
          hasVoting: event.has_voting || false,
          voteCost: event.vote_cost ?? event.voting_info?.voteCost ?? 1,
          vote_cost: event.vote_cost,
          votingInfo: event.voting_info,
          createdAt: event.created_at,
          ageRestriction: event.age_restriction,
          isAdult: event.age_restriction === 18 || event.is_adult || false,
          hasMerch: event.has_merch || false, // Add merchandise flag
        };
      });

      // Cache the results
      this.eventCache = transformedEvents;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;
      
      return transformedEvents;

    } catch (error) {
      console.error('SharedEventService: Error in fetchAllEvents:', error);
      return [];
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Get featured events (engagement-based + manually featured)
   * Returns up to 4 events total, prioritizing manual then auto-featured
   * ✅ PHASE 2: Implements request deduplication
   */
  async getFeaturedEvents(limit: number = 4, supabaseClient?: any): Promise<EventData[]> {
    const cacheKey = `featured-events-${limit}`;
    
    // ✅ PHASE 2: Check if request already pending
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }
    
    // Create new request promise
    const requestPromise = this._getFeaturedEventsInternal(limit, supabaseClient);
    this.pendingRequests.set(cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Clean up pending request after completion
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Internal featured events fetch implementation
   */
  private async _getFeaturedEventsInternal(limit: number, supabaseClient?: any): Promise<EventData[]> {
    try {
      const supabase = supabaseClient || createBrowserClient();
      
      // Use the featured_events_view for optimal performance
      const { data, error } = await supabase
        .from('featured_events_view')
        .select(`
          *,
          organizer:organizers(
            id,
            business_name,
            logo_url,
            user_id
          )
        `)
        .limit(limit);
      
      if (error) {
        console.error('SharedEventService: Error fetching featured events:', error);
        // Fallback to old method
        const allEvents = await this.fetchAllEvents();
        return allEvents
          .filter(event => event.isFeatured === true)
          .slice(0, limit);
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Filter out events that have already ended
      const activeEvents = data.filter((event: any) => this.isEventActive(event));
      
      if (activeEvents.length === 0) {
        return [];
      }
      
      // Get organizer company names
      const organizerUserIds = activeEvents
        .map((event: any) => event.organizer?.user_id)
        .filter(Boolean);
        
      const { data: roleRequestsData } = await supabase
        .from('role_requests')
        .select('user_id, company_name, status, business_email')
        .in('user_id', organizerUserIds)
        .eq('request_type', 'organizer')
        .not('company_name', 'is', null)
        .in('status', ['approved', 'pending'])
        .order('submitted_at', { ascending: false });
        
      const companyInfoMap = new Map<string, { name: string, email: string }>();
      roleRequestsData?.forEach((roleRequest: any) => {
        if (!companyInfoMap.has(roleRequest.user_id)) {
          companyInfoMap.set(roleRequest.user_id, {
            name: roleRequest.company_name,
            email: roleRequest.business_email
          });
        }
      });

      // Use cached organizer tiers (populated lazily in background, never blocks featured fetch)
      const organizerTierMap = this._cachedOrganizerTiers;
      
      // Transform the data (only active events)
      return activeEvents.map((event: any) => {
        const eventTime = event.start_time || '00:00';
        const locationString = this.buildLocationString(event);
        
        // Extract price with proper fallback logic
        let priceValue: string | number | null = null;
        
        // First, try to get price from tickets array
        if (event.tickets && Array.isArray(event.tickets) && event.tickets.length > 0) {
          const prices = event.tickets.map((ticket: any) => parseFloat(ticket.price || 0)).filter((p: number) => p > 0);
          if (prices.length > 0) {
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            if (minPrice === maxPrice) {
              priceValue = minPrice;
            } else {
              priceValue = `₵${minPrice.toFixed(0)} - ₵${maxPrice.toFixed(0)}`;
            }
          }
        }
        
        // Fallback to direct price field if tickets don't have pricing
        if (priceValue === null && event.price != null) {
          priceValue = event.price;
        }
        
        const priceString = formatPrice(priceValue);
        
        // Format date with multi-day event support
        let formattedDate = 'Date TBD';
        if (event.start_date) {
          const startDate = new Date(event.start_date);
          const endDate = event.end_date ? new Date(event.end_date) : null;
          
          // Check if it's a multi-day event
          if (endDate && startDate.toDateString() !== endDate.toDateString()) {
            // Multi-day event: format as date range
            const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
            const startDay = startDate.getDate();
            const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
            const endDay = endDate.getDate();
            const year = startDate.getFullYear();
            
            // Check if both dates are in the same month
            if (startMonth === endMonth) {
              // Same month: "Nov 4 - 7, 2025"
              formattedDate = `${startMonth} ${startDay} - ${endDay}, ${year}`;
            } else {
              // Different months: "Nov 30 - Dec 2, 2025"
              formattedDate = `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
            }
          } else {
            // Single-day event: "Nov 4, 2025"
            formattedDate = startDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric'
            });
          }
        }
        
        // Get organizer name - prioritize organizers table (source of truth for current name)
        // Fall back to role_requests.company_name only if organizer.business_name is not set
        const organizerInfo = event.organizer?.user_id ? companyInfoMap.get(event.organizer.user_id) : undefined;
        const organizerName = event.organizer?.business_name 
          || organizerInfo?.name
          || 'Unknown Organizer';
        
        const organizerEmail = organizerInfo?.email || '';

        return {
          id: event.id,
          slug: event.slug || event.id, // Fallback to id if slug is missing
          title: event.title || 'Untitled Event',
          description: event.description || '',
          imageUrl: getFormattedImagePath(event.image_url),
          
          category: event.category || 'General',
          startDate: event.start_date,
          endDate: event.end_date,
          date: formattedDate,
          time: eventTime,
          location: locationString,
          venue: event.venue,
          price: priceString,
          status: event.status,
          isFeatured: !!event.is_featured,
          attendeeCount: event.attendee_count || 0,
          ticketsSold: event.tickets_sold || 0,
          remainingTickets: Array.isArray(event.tickets) 
            ? event.tickets.reduce((t: number, tick: any) => t + Math.max(0, (tick.quantity || 0) - (tick.sold || 0)), 0) 
            : undefined,
          tickets: event.tickets,
          lockCount: event.lock_count || 0,
          viewCount: event.view_count || 0,
          likes: event.likes || 0,
          clickCount: event.click_count || 0,
          featuredType: event.featured_type || 'none',
          featuredScore: event.featured_score || 0,
          featuredReason: event.featured_reason || 'Featured',
          organizer: event.organizer ? (() => {
            const tierInfo = organizerTierMap.get(event.organizer.id);
            return {
              id: event.organizer.id,
              name: organizerName,
              email: organizerEmail,
              image: event.organizer.logo_url,
              premiumTier: tierInfo?.premiumTier || null,
              rank: tierInfo?.rank
            };
          })() : undefined,
          hasVoting: !!event.has_voting,
          voteCost: event.vote_cost ?? event.voting_info?.voteCost ?? 1,
          vote_cost: event.vote_cost,
          votingInfo: event.voting_info,
          createdAt: event.created_at,
          ageRestriction: event.age_restriction,
          isAdult: event.age_restriction === 18 || event.is_adult || false,
          hasMerch: event.has_merch || false,
        } as EventData;
      });
    } catch (error) {
      console.error('SharedEventService: Error in getFeaturedEvents:', error);
      // Fallback to old method
      const allEvents = await this.fetchAllEvents();
      return allEvents
        .filter(event => event.isFeatured === true)
        .slice(0, limit);
    }
  }

  /**
   * Get trending events (based on engagement metrics)
   */
  async getTrendingEvents(limit: number = 8, excludedEventIds?: Set<string>, supabaseClient?: any): Promise<EventData[]> {
    const allEvents = await this.fetchAllEvents(supabaseClient);
    return allEvents
      .filter(event => !excludedEventIds?.has(event.id)) // Exclude featured events
      .map(event => ({
        ...event,
        _engagementScore: (event.lockCount || 0) + (event.viewCount || 0) + (event.likes || 0) + Math.random() * 5
      }))
      .sort((a, b) => b._engagementScore - a._engagementScore)
      .slice(0, limit)
      .map(({ _engagementScore, ...event }) => event);
  }

  /**
   * Get live/ongoing events (events that have started but not ended)
   */
  async getLiveEvents(limit: number = 8, excludedEventIds?: Set<string>, supabaseClient?: any): Promise<EventData[]> {
    const allEvents = await this.fetchAllEvents(supabaseClient);
    
    return allEvents
      .filter(event => !excludedEventIds?.has(event.id))
      .filter(event => this.isEventLive(event))
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, limit);
  }

  /**
   * Get upcoming events (events that haven't started yet) OR live events
   * Can filter by time range: 'live', 'today', 'tomorrow', 'this-week', 'next-week', 'all'
   */
  async getUpcomingEvents(
    limit: number = 8, 
    excludedEventIds?: Set<string>,
    timeFilter?: 'live' | 'today' | 'tomorrow' | 'this-week' | 'next-week' | 'all',
    supabaseClient?: any
  ): Promise<EventData[]> {
    const allEvents = await this.fetchAllEvents(supabaseClient);
    const now = new Date();
    
    // If 'live' filter is selected, return live events instead
    if (timeFilter === 'live') {
      return this.getLiveEvents(limit, excludedEventIds, supabaseClient);
    }
    
    let filteredEvents = allEvents
      .filter(event => !excludedEventIds?.has(event.id))
      .filter(event => this.isEventUpcoming(event));
    
    // Apply time filter
    if (timeFilter && timeFilter !== 'all') {
      filteredEvents = filteredEvents.filter(event => {
        if (!event.startDate) return false;
        
        const startDate = new Date(event.startDate);
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart);
        todayEnd.setHours(23, 59, 59, 999);
        
        switch (timeFilter) {
          case 'today':
            return startDate >= todayStart && startDate <= todayEnd;
          
          case 'tomorrow':
            const tomorrowStart = new Date(todayStart);
            tomorrowStart.setDate(tomorrowStart.getDate() + 1);
            const tomorrowEnd = new Date(tomorrowStart);
            tomorrowEnd.setHours(23, 59, 59, 999);
            return startDate >= tomorrowStart && startDate <= tomorrowEnd;
          
          case 'this-week':
            const thisWeekEnd = new Date(todayStart);
            thisWeekEnd.setDate(thisWeekEnd.getDate() + (7 - todayStart.getDay()));
            thisWeekEnd.setHours(23, 59, 59, 999);
            return startDate >= todayStart && startDate <= thisWeekEnd;
          
          case 'next-week':
            const nextWeekStart = new Date(todayStart);
            nextWeekStart.setDate(nextWeekStart.getDate() + (7 - todayStart.getDay() + 1));
            const nextWeekEnd = new Date(nextWeekStart);
            nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);
            nextWeekEnd.setHours(23, 59, 59, 999);
            return startDate >= nextWeekStart && startDate <= nextWeekEnd;
          
          default:
            return true;
        }
      });
    }
    
    return filteredEvents
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, limit);
  }

  /**
   * Get recommended events (based on user preferences - localStorage based)
   * This one still uses localStorage for user-specific data
   */
  async getRecommendedEvents(userId: string, limit: number = 4, excludedEventIds?: Set<string>): Promise<EventData[]> {
    try {
      // Get all events first
      const allEvents = await this.fetchAllEvents();
      
      if (allEvents.length === 0) {
        return [];
      }
      
      // Get user preferences from localStorage
      const userPreferences = localStorage.getItem(`user-preferences-${userId}`);
      const preferences = userPreferences ? JSON.parse(userPreferences) : null;
      
      // Get locked events
      const lockedEvents = localStorage.getItem(`locked-events-${userId}`);
      const userLockedEvents = lockedEvents ? JSON.parse(lockedEvents) : [];
      
      // ✅ PHASE 2: Get recently viewed events with TTL support
      const recentlyViewed = getRecentlyViewedEvents({ maxItems: 10 });
      
      let recommendedEvents: EventData[] = [];
      
      // Category-based recommendations
      if (preferences && preferences.categories && preferences.categories.length > 0) {
        const categoryEvents = allEvents
          .filter(event => !excludedEventIds?.has(event.id)) // Exclude featured events
          .filter(event => preferences.categories.includes(event.category))
          .slice(0, 3)
          .map(event => ({
            ...event,
            recommendationReason: "Matches your interests"
          }));
        
        recommendedEvents = [...recommendedEvents, ...categoryEvents];
      }
      
      // Similar to locked events
      if (userLockedEvents.length > 0) {
        const lockedCategories = userLockedEvents
          .map((id: string) => {
            const event = allEvents.find((e: EventData) => e.id === id);
            return event ? event.category : null;
          })
          .filter(Boolean);
        
        if (lockedCategories.length > 0) {
          const similarEvents = allEvents
            .filter(event => !excludedEventIds?.has(event.id)) // Exclude featured events
            .filter(event => 
              lockedCategories.includes(event.category) && 
              !recommendedEvents.find(e => e.id === event.id) &&
              !userLockedEvents.includes(event.id)
            )
            .slice(0, 2)
            .map(event => ({
              ...event,
              recommendationReason: "Similar to events you locked"
            }));
          
          recommendedEvents = [...recommendedEvents, ...similarEvents];
        }
      }
      
      // Based on recent views
      if (recommendedEvents.length < 4 && recentlyViewed.length > 0) {
        const recentCategories = recentlyViewed
          .map((viewed: any) => {
            const event = allEvents.find((e: EventData) => e.id === viewed.id);
            return event ? event.category : null;
          })
          .filter(Boolean);
        
        if (recentCategories.length > 0) {
          const similarToRecentEvents = allEvents
            .filter(event => !excludedEventIds?.has(event.id)) // Exclude featured events
            .filter(event => 
              recentCategories.includes(event.category) && 
              !recommendedEvents.find(e => e.id === event.id) &&
              !recentlyViewed.find((e: any) => e.id === event.id)
            )
            .slice(0, 2)
            .map(event => ({
              ...event,
              recommendationReason: "Based on your recent views"
            }));
          
          recommendedEvents = [...recommendedEvents, ...similarToRecentEvents];
        }
      }
      
      // DON'T fill with popular events - only show truly personalized recommendations
      // If user has no activity, return empty array so the section is hidden
      
      return recommendedEvents.slice(0, limit);
      
    } catch (error) {
      console.error("Error generating recommendations:", error);
      return [];
    }
  }

  /**
   * Get all homepage event data in one call
   * Ensures featured events don't appear in other sections to prevent duplication
   * OPTIMIZED: Loads featured events and all events in parallel for better performance
   */
  private async _unused_getHomepageEvents(userId?: string): Promise<HomepageEventData> {
    // ✅ OPTIMIZATION: Load featured events and all events in parallel
    // This eliminates the waterfall effect and reduces load time by 60-70%
    const [featuredResult, allEventsResult] = await Promise.allSettled([
      this.getFeaturedEvents(4),
      this.fetchAllEvents()
    ]);
    
    const featuredEvents = featuredResult.status === 'fulfilled' ? featuredResult.value : [];
    const allEvents = allEventsResult.status === 'fulfilled' ? allEventsResult.value : [];
    const featuredEventIds = new Set(featuredEvents.map(e => e.id));
    
    // ✅ Process remaining sections synchronously using cached allEvents
    // No additional DB calls needed - everything uses the cached data
    const trendingEvents = allEvents
      .filter(event => !featuredEventIds.has(event.id))
      .map(event => ({
        ...event,
        _engagementScore: (event.lockCount || 0) + (event.viewCount || 0) + (event.likes || 0) + Math.random() * 5
      }))
      .sort((a: any, b: any) => b._engagementScore - a._engagementScore)
      .slice(0, 8)
      .map(({ _engagementScore, ...event }: any) => event);
    
    // Get live events (currently happening)
    const liveEvents = allEvents
      .filter(event => !featuredEventIds.has(event.id))
      .filter(event => this.isEventLive(event))
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 8);
    
    // Get upcoming events (haven't started yet)
    const upcomingEvents = allEvents
      .filter(event => !featuredEventIds.has(event.id))
      .filter(event => this.isEventUpcoming(event))
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 12);
    
    // Get recommended events (still uses localStorage, but only if user is authenticated)
    const recommendedEvents = userId 
      ? await this.getRecommendedEvents(userId, 4, featuredEventIds)
      : [];

    const homepageData: HomepageEventData = {
      featuredEvents,
      trendingEvents,
      liveEvents,
      upcomingEvents,
      recommendedEvents
    };

    this.cacheHomepageEvents(userId, homepageData);

    return homepageData;
  }

  /**
   * Clear the cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.eventCache = null;
    this.cacheExpiry = 0;
    this.eventDetailsCache.clear();
    this.pendingEventDetailRequests.clear();
    this.homepageSnapshots.clear();
    this.lockCountCache.clear(); // ✅ REALTIME: Also clear lock count cache
    this.organizerEventsCache.clear();
    this.userTicketsCache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Clear all runtime caches and inflight dedupe state.
   * Use this on auth boundary transitions (sign-in/sign-out/session reset).
   */
  clearAllRuntimeState(): void {
    this.clearCache();
  }

  /**
   * Refresh the cache
   */
  async refreshCache(): Promise<EventData[]> {
    this.clearCache();
    return await this.fetchAllEvents();
  }

  /**
   * Get organizer-specific events with caching
   * Cache per organizer ID for 3 minutes (shorter than main cache)
   */
  private organizerEventsCache: Map<string, { events: EventData[], expiry: number }> = new Map();
  private readonly ORGANIZER_CACHE_DURATION = 3 * 60 * 1000; // 3 minutes

  getCachedOrganizerEvents(organizerId: string, options?: {
    status?: 'all' | 'published' | 'draft';
    searchTerm?: string;
  }, supabaseClient?: any): EventData[] | null {
    const cacheKey = `${organizerId}-${options?.status || 'all'}-${options?.searchTerm || ''}`;
    const cached = this.organizerEventsCache.get(cacheKey);
    if (!cached || Date.now() >= cached.expiry) {
      return null;
    }

    if (options?.searchTerm) {
      const searchLower = options.searchTerm.toLowerCase();
      return cached.events.filter(event =>
        event.title.toLowerCase().includes(searchLower) ||
        event.description.toLowerCase().includes(searchLower) ||
        event.category.toLowerCase().includes(searchLower)
      );
    }

    return cached.events;
  }

  async getOrganizerEvents(organizerId: string, options?: {
    status?: 'all' | 'published' | 'draft';
    searchTerm?: string;
  }, supabaseClient?: any): Promise<EventData[]> {
    const cacheKey = `${organizerId}-${options?.status || 'all'}-${options?.searchTerm || ''}`;
    
    // Check cache first
    const cached = this.organizerEventsCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      
      // Apply search filter if provided
      if (options?.searchTerm) {
        const searchLower = options.searchTerm.toLowerCase();
        return cached.events.filter(event => 
          event.title.toLowerCase().includes(searchLower) ||
          event.description.toLowerCase().includes(searchLower) ||
          event.category.toLowerCase().includes(searchLower)
        );
      }
      
      return cached.events;
    }

    // ✅ SECURITY: Removed sensitive organizerId logging

    try {
      const supabase = supabaseClient || createBrowserClient();
      
      // Build query
      let query = supabase
        .from('events')
        .select('*')
        .eq('organizer_id', organizerId);

      // Apply status filter
      if (options?.status && options.status !== 'all') {
        query = query.eq('status', options.status);
      }

      query = query.order('created_at', { ascending: false });

      const { data: eventsData, error } = await this.withQueryTimeout<any>(query, 'getOrganizerEvents query');

      if (error) {
        console.error('Error fetching organizer events:', error);
        return [];
      }

      if (!eventsData || eventsData.length === 0) {
        // Cache empty result too
        this.organizerEventsCache.set(cacheKey, {
          events: [],
          expiry: Date.now() + this.ORGANIZER_CACHE_DURATION
        });
        return [];
      }

      // Transform events to EventData format
      const events: EventData[] = eventsData.map((event: any) => {
        const eventTime = event.start_time || '00:00';
        const locationString = this.buildLocationString(event);
        
        // Extract price from tickets array
        let priceString = 'Free';
        if (event.tickets && Array.isArray(event.tickets) && event.tickets.length > 0) {
          const prices = event.tickets.map((ticket: any) => parseFloat(ticket.price || 0)).filter((p: number) => p > 0);
          if (prices.length > 0) {
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            if (minPrice === maxPrice) {
              priceString = `₵${minPrice.toFixed(0)}`;
            } else {
              priceString = `₵${minPrice.toFixed(0)} - ₵${maxPrice.toFixed(0)}`;
            }
          }
        }
        
        // Format date with multi-day event support
        let formattedDate = 'Date TBD';
        if (event.start_date) {
          const startDate = new Date(event.start_date);
          const endDate = event.end_date ? new Date(event.end_date) : null;
          
          // Check if it's a multi-day event
          if (endDate && startDate.toDateString() !== endDate.toDateString()) {
            // Multi-day event: format as date range
            const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
            const startDay = startDate.getDate();
            const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
            const endDay = endDate.getDate();
            const year = startDate.getFullYear();
            
            // Check if both dates are in the same month
            if (startMonth === endMonth) {
              // Same month: "Nov 4 - 7, 2025"
              formattedDate = `${startMonth} ${startDay} - ${endDay}, ${year}`;
            } else {
              // Different months: "Nov 30 - Dec 2, 2025"
              formattedDate = `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
            }
          } else {
            // Single-day event: "Nov 4, 2025"
            formattedDate = startDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric'
            });
          }
        }

        return {
          id: event.id,
          slug: event.slug || event.id, // Fallback to id if slug is missing
          title: event.title || 'Untitled Event',
          description: event.description || '',
          imageUrl: getFormattedImagePath(event.image_url),
          
          category: event.category || 'General',
          startDate: event.start_date,
          endDate: event.end_date,
          date: formattedDate,
          time: eventTime,
          location: locationString,
          venue: event.venues?.name || event.venue,
          price: priceString,
          status: event.status,
          isFeatured: !!event.is_featured,
          attendeeCount: event.attendee_count || 0,
          ticketsSold: event.tickets_sold || 0,
          remainingTickets: Array.isArray(event.tickets) 
            ? event.tickets.reduce((t: number, tick: any) => t + Math.max(0, (tick.quantity || 0) - (tick.sold || 0)), 0) 
            : undefined,
          tickets: event.tickets,
          lockCount: event.lock_count || 0,
          viewCount: event.view_count || 0,
          likes: event.likes || 0,
          hasVoting: !!event.has_voting,
          voteCost: event.vote_cost ?? event.voting_info?.voteCost ?? 1,
          vote_cost: event.vote_cost,
          votingInfo: event.voting_info,
          hasMerch: !!event.has_merch,
          ageRestriction: event.age_restriction,
          isAdult: event.age_restriction === 18 || event.is_adult || false,
          createdAt: event.created_at,
        };
      });

      // Cache the results
      this.organizerEventsCache.set(cacheKey, {
        events,
        expiry: Date.now() + this.ORGANIZER_CACHE_DURATION
      });

      // Apply search filter if provided
      if (options?.searchTerm) {
        const searchLower = options.searchTerm.toLowerCase();
        return events.filter(event => 
          event.title.toLowerCase().includes(searchLower) ||
          event.description.toLowerCase().includes(searchLower) ||
          event.category.toLowerCase().includes(searchLower)
        );
      }

      return events;
    } catch (error) {
      console.error('Error in getOrganizerEvents:', error);
      return [];
    }
  }

  /**
   * Get all homepage events in a single optimized call.
   *
   * ✅ PERFORMANCE FIX: Uses only two parallel DB fetch chains max
   *   (getFeaturedEvents + fetchAllEvents) then computes every other
   *   section in-memory.  Previous version fired 5 parallel chains that
   *   each called fetchAllEvents → topOrganizersService → 4-5 extra DB
   *   queries, totalling ~12-15 Supabase round trips per homepage load.
   */
  async getHomepageEvents(userId?: string, supabaseClient?: any): Promise<HomepageEventData> {
    // 1️⃣ Serve from memory cache instantly
    const cached = this.getCachedHomepageEvents(userId);
    if (cached) {
      return cached;
    }

    // 2️⃣ Deduplicate inflight requests for the same user key
    const cacheKey = `homepage-${userId || 'anon'}`;
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const requestPromise = (async () => {
      try {
        // Kick off the organizer-tier background refresh (non-blocking)
        this._refreshOrganizerTiers();

        // 3️⃣ Only TWO parallel DB fetches
        const [featuredEvents, allEvents] = await Promise.allSettled([
          this.getFeaturedEvents(4, supabaseClient),
          this.fetchAllEvents(supabaseClient),
        ]);

        const featured = featuredEvents.status === 'fulfilled' ? featuredEvents.value : [];
        const all = allEvents.status === 'fulfilled' ? allEvents.value : [];
        const featuredIds = new Set(featured.map(e => e.id));

        // 4️⃣ Everything below is pure in-memory – zero DB calls
        const trendingEvents = all
          .filter(e => !featuredIds.has(e.id))
          .map(e => ({
            ...e,
            _score: (e.lockCount || 0) + (e.viewCount || 0) + (e.likes || 0) + Math.random() * 5,
          }))
          .sort((a: any, b: any) => b._score - a._score)
          .slice(0, 8)
          .map(({ _score, ...e }: any) => e);

        const liveEvents = all
          .filter(e => !featuredIds.has(e.id))
          .filter(e => this.isEventLive(e))
          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
          .slice(0, 8);

        const upcomingEvents = all
          .filter(e => !featuredIds.has(e.id))
          .filter(e => this.isEventUpcoming(e))
          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
          .slice(0, 12);

        const shownIds = new Set([
          ...featured.map(e => e.id),
          ...trendingEvents.map(e => e.id),
          ...liveEvents.map(e => e.id),
          ...upcomingEvents.map(e => e.id),
        ]);

        const recommendedEvents = all
          .filter(e => !shownIds.has(e.id))
          .map(e => ({
            ...e,
            _score: (e.lockCount || 0) + (e.viewCount || 0) + (e.likes || 0) + Math.random() * 5,
          }))
          .sort((a: any, b: any) => b._score - a._score)
          .slice(0, 12)
          .map(({ _score, ...e }: any) => e);

        const data: HomepageEventData = {
          featuredEvents: featured,
          trendingEvents,
          recommendedEvents,
          liveEvents,
          upcomingEvents,
        };

        this.cacheHomepageEvents(userId, data);
        return data;
      } catch (error) {
        console.error('SharedEventService: Error fetching homepage events', error);
        throw error;
      } finally {
        this.pendingRequests.delete(cacheKey);
      }
    })();

    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  /**
   * Clear organizer events cache (useful after creating/updating/deleting events)
   */
  clearOrganizerCache(organizerId?: string): void {
    if (organizerId) {
      // Clear all cache entries for this organizer
      const keysToDelete: string[] = [];
      this.organizerEventsCache.forEach((_, key) => {
        if (key.startsWith(organizerId)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => this.organizerEventsCache.delete(key));
    } else {
      // Clear all organizer caches
      this.organizerEventsCache.clear();
    }
  }

  /**
   * Get all events for discover page (with optional additional filtering/sorting)
   */
  async getAllEvents(options?: {
    includeAll?: boolean; // Include draft events too (for organizers)
    sortBy?: 'date' | 'popularity' | 'created' | 'price';
    sortOrder?: 'asc' | 'desc';
  }): Promise<EventData[]> {
    let events: EventData[];
    
    if (options?.includeAll) {
      // ✅ FIXED: Use cache for discover page too! 
      // Check cache first before fetching from database
      // This provides the same 5-minute caching benefit as homepage
      events = await this.fetchAllEvents();
    } else {
      // Use cached events for homepage
      events = await this.fetchAllEvents();
    }

    // Apply sorting if specified
    if (options?.sortBy) {
      events = this.sortEvents(events, options.sortBy, options.sortOrder || 'asc');
    }

    return events;
  }

  /**
   * Sort events by different criteria
   */
  private sortEvents(
    events: EventData[], 
    sortBy: 'date' | 'popularity' | 'created' | 'price',
    order: 'asc' | 'desc' = 'asc'
  ): EventData[] {
    const sorted = [...events];
    const multiplier = order === 'desc' ? -1 : 1;

    switch (sortBy) {
      case 'date':
        return sorted.sort((a, b) => {
          const dateA = new Date(a.startDate).getTime();
          const dateB = new Date(b.startDate).getTime();
          return (dateA - dateB) * multiplier;
        });
      
      case 'popularity':
        return sorted.sort((a, b) => {
          const scoreA = (a.lockCount || 0) + (a.viewCount || 0) + (a.likes || 0);
          const scoreB = (b.lockCount || 0) + (b.viewCount || 0) + (b.likes || 0);
          return (scoreA - scoreB) * multiplier;
        });
      
      case 'created':
        return sorted.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return (dateA - dateB) * multiplier;
        });
      
      case 'price':
        return sorted.sort((a, b) => {
          // Extract numeric price for comparison
          const getPriceValue = (priceStr: string) => {
            if (priceStr === 'Free') return 0;
            
            // Handle price ranges like "₵100 - ₵500" or single prices like "₵200"
            const priceMatches = priceStr.match(/₵(\d+)(?:\s*-\s*₵(\d+))?/);
            
            if (!priceMatches) return 0;
            
            const minPrice = parseInt(priceMatches[1]) || 0;
            const maxPrice = priceMatches[2] ? parseInt(priceMatches[2]) : minPrice;
            
            // Use minimum price for sorting to be consistent
            return minPrice;
          };
          
          const priceA = getPriceValue(a.price);
          const priceB = getPriceValue(b.price);
          return (priceA - priceB) * multiplier;
        });
      
      default:
        return sorted;
    }
  }

  /**
   * User Tickets Caching
   * Cache per user ID for 2 minutes to reduce database queries
   */
  private userTicketsCache: Map<string, { tickets: any[], expiry: number }> = new Map();
  private readonly USER_TICKETS_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

  async getUserTickets(userEmail?: string, supabaseClient?: any): Promise<any[]> {
    // Fetch from database
    const supabase = supabaseClient || createBrowserClient();
    
    try {
      // Get authenticated user first (required for RLS)
      const { data: { user }, error: authError } = await this.withQueryTimeout<any>(
        supabase.auth.getUser(),
        'getUserTickets auth check',
        10000
      );
      
      if (authError || !user) {
        console.error('Authentication required to fetch tickets:', authError);
        return [];
      }
      
      // Check cache first (use user ID)
      const cached = this.userTicketsCache.get(user.id);
      if (cached && Date.now() < cached.expiry) {
        return cached.tickets;
      }
      
      const query = supabase
        .from('event_registrations')
        .select(`
          id,
          event_id,
          attendee_name,
          attendee_email,
          ticket_type,
          quantity_registered,
          total_amount,
          status,
          payment_status,
          created_at,
          updated_at,
          qr_code_token,
          events!inner (
            id,
            title,
            start_date,
            start_time,
            end_date,
            end_time,
            image_url,
            venue,
            location_city,
            location_type,
            online_url,
            online_platform,
            meeting_code,
            meeting_password,
            status,
            organizer_id,
            organizers!events_organizer_id_fkey (
              id,
              business_name,
              contact_email,
              business_phone
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const { data: registrations, error } = await this.withQueryTimeout<any>(query, 'getUserTickets query');
        
      if (error) {
        console.error('Error fetching user tickets:', error);
        return [];
      }
      
      const tickets = registrations || [];
      
      // Cache the results (use user ID as cache key)
      this.userTicketsCache.set(user.id, {
        tickets,
        expiry: Date.now() + this.USER_TICKETS_CACHE_DURATION
      });
      
      return tickets;
    } catch (error) {
      console.error('Error in getUserTickets:', error);
      return [];
    }
  }

  /**
   * Clear user tickets cache (useful after booking/cancelling tickets)
   */
  clearUserTicketsCache(userEmail?: string): void {
    // Cache keys are user IDs; callers may only know email.
    // Clear all to guarantee correctness after ticket mutations.
    this.userTicketsCache.clear();
  }

  /**
   * Normalize cache key for event details
   */
  private getEventDetailCacheKey(identifier: string): string {
    return identifier?.toLowerCase();
  }

  /**
   * Peek cached event details without triggering a fetch
   */
  getCachedEventDetails(identifier: string | undefined | null): any | null {
    if (!identifier) {
      return null;
    }

    const cacheKey = this.getEventDetailCacheKey(identifier);
    const cached = this.eventDetailsCache.get(cacheKey);

    if (!cached) {
      return null;
    }

    if (cached.expiry <= Date.now()) {
      this.eventDetailsCache.delete(cacheKey);
      return null;
    }

    return cached.data;
  }

  /**
   * Store event details in cache using both slug and id when available
   */
  private cacheEventDetails(event: any): void {
    const expiry = Date.now() + this.EVENT_DETAIL_CACHE_DURATION;
    if (event?.id) {
      this.eventDetailsCache.set(this.getEventDetailCacheKey(event.id), { data: event, expiry });
    }
    if (event?.slug) {
      this.eventDetailsCache.set(this.getEventDetailCacheKey(event.slug), { data: event, expiry });
    }
  }

  /**
   * Allow callers that already have event rows to warm the detail cache
   */
  primeEventDetailsCache(event: any | null): void {
    if (!event) {
      return;
    }
    this.cacheEventDetails(event);
  }

  /**
   * Fetch detailed event data with caching and request deduplication
   */
  async getEventDetails(identifier: string): Promise<any | null> {
    if (!identifier) {
      return null;
    }

    const cacheKey = this.getEventDetailCacheKey(identifier);
    const cached = this.eventDetailsCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    if (this.pendingEventDetailRequests.has(cacheKey)) {
      return this.pendingEventDetailRequests.get(cacheKey)!;
    }

    const requestPromise = this.fetchEventDetailsFromDatabase(identifier)
      .then((event) => {
        if (event) {
          this.cacheEventDetails(event);
        }
        return event;
      })
      .finally(() => {
        this.pendingEventDetailRequests.delete(cacheKey);
      });

    this.pendingEventDetailRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  prefetchEventDetails(identifier: string): void {
    if (!identifier) {
      return;
    }

    this.getEventDetails(identifier).catch(error => {
      console.warn('SharedEventService: Prefetch event details failed', error);
    });
  }

  private async fetchEventDetailsFromDatabase(identifier: string, supabaseClient?: any): Promise<any | null> {
    try {
      const supabase = supabaseClient || createBrowserClient();
      const isId = isUUID(identifier);

      let query = supabase
        .from('events')
        .select(`
          *,
          organizer:organizers(
            id,
            business_name,
            contact_email,
            logo_url,
            business_description,
            user_id,
            status
          )
        `)
        .eq('status', 'published')
        .limit(1);

      query = isId ? query.eq('id', identifier) : query.eq('slug', identifier);

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error('SharedEventService: Error fetching event detail:', error);
        return null;
      }

      if (data?.organizer && !data.organizer.logo_url && data.organizer.user_id) {
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', data.organizer.user_id)
            .maybeSingle();

          if (profileData?.avatar_url) {
            data.organizer.avatar_url = profileData.avatar_url;
          }
        } catch (profileError) {
          console.warn('SharedEventService: Failed to fetch organizer profile avatar:', profileError);
        }
      }

      return data || null;
    } catch (error) {
      console.error('SharedEventService: Exception in fetchEventDetailsFromDatabase:', error);
      return null;
    }
  }

  clearEventDetailsCache(identifier?: string): void {
    if (identifier) {
      this.eventDetailsCache.delete(this.getEventDetailCacheKey(identifier));
      return;
    }
    this.eventDetailsCache.clear();
  }

  /**
   * Get fresh lock counts for specific events
   * Uses separate cache with shorter TTL (30s)
   */
  async getLockCounts(eventIds: string[], supabaseClient?: any): Promise<Map<string, number>> {
    const now = Date.now();
    const result = new Map<string, number>();
    const idsToFetch: string[] = [];
    
    // Check cache first
    for (const id of eventIds) {
      const cached = this.lockCountCache.get(id);
      if (cached && now < cached.expiry) {
        result.set(id, cached.count);
      } else {
        idsToFetch.push(id);
      }
    }
    
    // Fetch uncached counts from database
    if (idsToFetch.length > 0) {
      try {
        const supabase = supabaseClient || createBrowserClient();
        const { data, error } = await supabase
          .from('events')
          .select('id, lock_count')
          .in('id', idsToFetch);
        
        if (error) {
          console.error('SharedEventService: Error fetching lock counts:', error);
        } else {
          data?.forEach((event: any) => {
            const count = event.lock_count || 0;
            result.set(event.id, count);
            this.lockCountCache.set(event.id, {
              count,
              expiry: now + this.LOCK_COUNT_CACHE_DURATION
            });
          });
        }
      } catch (error) {
        console.error('SharedEventService: Exception in getLockCounts:', error);
      }
    }
    
    return result;
  }

  /**
   * Invalidate lock count cache for specific events
   * Call this after lock/unlock operations
   */
  invalidateLockCounts(eventIds: string[]): void {
    eventIds.forEach(id => this.lockCountCache.delete(id));
  }
}


// Export singleton instance
export const sharedEventService = new SharedEventService();
