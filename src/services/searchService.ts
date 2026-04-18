/**
 * Enhanced Search Service
 * --------------------------------------------------------------
 * High-performance cached search functionality for events, venues, organizers, and venue owners
 * Uses SharedEventService cache first, then falls back to optimized DB queries
 */

import { createClient } from '@/lib/supabase/client/client';
import { getFormattedImagePath } from '@/utils/imageHelpers';
import { sharedEventService, type EventData } from './sharedEventService';
import { isVenuesEnabled } from '@/lib/network';

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  type: 'event' | 'venue' | 'organizer' | 'venue_owner';
  url: string;
  metadata?: {
    category?: string;
    location?: string;
    date?: string;
    price?: string;
    description?: string;
  };
}

export interface SearchResponse {
  events: SearchResult[];
  venues: SearchResult[];
  organizers: SearchResult[];
  venueOwners: SearchResult[];
  total: number;
}

// Search result cache interface
interface CachedSearchResult {
  results: SearchResponse;
  timestamp: number;
}

class SearchService {
  private supabase = createClient();
  private searchCache = new Map<string, CachedSearchResult>();
  private readonly SEARCH_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for search results
  
  // ✅ Request deduplication
  private pendingSearchRequests = new Map<string, Promise<SearchResponse>>();
  
  private venueCache: any[] | null = null;
  private organizerCache: any[] | null = null;
  private venueOwnerCache: any[] | null = null;
  private venueCacheExpiry = 0;
  private organizerCacheExpiry = 0;
  private venueOwnerCacheExpiry = 0;
  private readonly ENTITY_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes for venues/organizers

  /**
   * Perform a comprehensive search across all entities with intelligent caching
   * ✅ Implements request deduplication to prevent duplicate concurrent requests
   */
  async searchAll(query: string, options?: {
    limit?: number;
    includeEvents?: boolean;
    includeVenues?: boolean;
    includeOrganizers?: boolean;
    includeVenueOwners?: boolean;
  }): Promise<SearchResponse> {
    const {
      limit = 3,
      includeEvents = true,
      includeVenues = true,
      includeOrganizers = true,
      includeVenueOwners = true,
    } = options || {};
    const venuesEnabled = isVenuesEnabled();
    const includeVenuesEffective = includeVenues && venuesEnabled;
    const includeVenueOwnersEffective = includeVenueOwners && venuesEnabled;

    if (!query.trim()) {
      return {
        events: [],
        venues: [],
        organizers: [],
        venueOwners: [],
        total: 0,
      };
    }

    const searchTerm = query.trim().toLowerCase();
    const cacheKey = `${searchTerm}-${limit}-${includeEvents}-${includeVenuesEffective}-${includeOrganizers}-${includeVenueOwnersEffective}`;
    
    // Check search result cache first
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.SEARCH_CACHE_DURATION) {
      return cached.results;
    }

    // ✅ Request deduplication: return pending request if one exists
    const pendingRequest = this.pendingSearchRequests.get(cacheKey);
    if (pendingRequest) {
      return pendingRequest;
    }

    // Create the search promise
    const searchPromise = this.executeSearch(searchTerm, limit, includeEvents, includeVenuesEffective, includeOrganizers, includeVenueOwnersEffective, cacheKey);
    
    // Store the pending request
    this.pendingSearchRequests.set(cacheKey, searchPromise);
    
    try {
      const results = await searchPromise;
      return results;
    } finally {
      // Always clean up pending request
      this.pendingSearchRequests.delete(cacheKey);
    }
  }

  /**
   * Internal search execution (separated for deduplication)
   */
  private async executeSearch(
    searchTerm: string, 
    limit: number, 
    includeEvents: boolean, 
    includeVenues: boolean, 
    includeOrganizers: boolean, 
    includeVenueOwners: boolean,
    cacheKey: string
  ): Promise<SearchResponse> {
    try {
      const [events, venues, organizers, venueOwners] = await Promise.allSettled([
        includeEvents ? this.searchEventsCached(searchTerm, limit) : Promise.resolve([]),
        includeVenues ? this.searchVenuesCached(searchTerm, limit) : Promise.resolve([]),
        includeOrganizers ? this.searchOrganizersCached(searchTerm, limit) : Promise.resolve([]),
        includeVenueOwners ? this.searchVenueOwnersCached(searchTerm, limit) : Promise.resolve([]),
      ]);

      const eventsResults = events.status === 'fulfilled' ? events.value : [];
      const venuesResults = venues.status === 'fulfilled' ? venues.value : [];
      const organizersResults = organizers.status === 'fulfilled' ? organizers.value : [];
      const venueOwnersResults = venueOwners.status === 'fulfilled' ? venueOwners.value : [];

      const results = {
        events: eventsResults,
        venues: venuesResults,
        organizers: organizersResults,
        venueOwners: venueOwnersResults,
        total: eventsResults.length + venuesResults.length + organizersResults.length + venueOwnersResults.length,
      };
      
      // Cache the search results
      this.searchCache.set(cacheKey, {
        results,
        timestamp: Date.now()
      });
      
      // Clean up old cache entries (keep cache size reasonable)
      if (this.searchCache.size > 100) {
        const oldestKey = [...this.searchCache.keys()][0];
        this.searchCache.delete(oldestKey);
      }

      return results;
    } catch (error) {
      console.error('Search error:', error);
      return {
        events: [],
        venues: [],
        organizers: [],
        venueOwners: [],
        total: 0,
      };
    }
  }

  /**
   * Search events using SharedEventService cache first (FAST!)
   */
  private async searchEventsCached(query: string, limit: number = 10): Promise<SearchResult[]> {
    try {
      // Try to use cached events from SharedEventService first (much faster!)
      const cachedEvents = await sharedEventService.getAllEvents({ includeAll: true });
      
      if (cachedEvents && cachedEvents.length > 0) {
        // Perform in-memory search on cached events
        const results = this.searchEventsInMemory(cachedEvents, query, limit);
        if (results.length > 0) {
          return results;
        }
      }
      
      // Fallback to database search if no cache or no results
      return this.searchEventsDatabase(query, limit);
    } catch (error) {
      console.error('Error in cached event search:', error);
      // Fallback to database search
      return this.searchEventsDatabase(query, limit);
    }
  }
  
  /**
   * Fast in-memory search on cached events
   */
  private searchEventsInMemory(events: EventData[], query: string, limit: number): SearchResult[] {
    const searchTerm = query.toLowerCase();
    
    return events
      .filter(event => {
        // Search in multiple fields including organizer name
        return (
          event.title.toLowerCase().includes(searchTerm) ||
          (event.description && event.description.toLowerCase().includes(searchTerm)) ||
          (event.category && event.category.toLowerCase().includes(searchTerm)) ||
          (event.location && event.location.toLowerCase().includes(searchTerm)) ||
          (event.venue && event.venue.toLowerCase().includes(searchTerm)) ||
          (event.organizer?.name && event.organizer.name.toLowerCase().includes(searchTerm))
        );
      })
      .slice(0, limit)
      .map(event => ({
        id: event.id,
        title: event.title,
        subtitle: event.organizer?.name ? `By ${event.organizer.name}` : undefined,
        image: event.imageUrl,
        type: 'event' as const,
        url: `/event/${event.id}`,
        metadata: {
          category: event.category,
          location: event.location,
          date: event.date,
          price: event.price,
          description: event.description,
        },
      }));
  }
  
  /**
   * Database fallback for event search
   */
  private async searchEventsDatabase(query: string, limit: number = 10): Promise<SearchResult[]> {
    try {
      const { data, error } = await this.supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          image_url,
          category,
          start_date,
          address,
          city,
          country,
          location_type,
          online_platform,
          tickets,
          organizer:organizers(
            id,
            business_name,
            logo_url
          )
        `)
        .eq('status', 'published')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%,city.ilike.%${query}%,country.ilike.%${query}%,address.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error searching events:', error);
        return [];
      }

      return (data || []).map((event: any) => {
        // Build location string
        let locationString = '';
        if (event.location_type === 'online') {
          locationString = event.online_platform ? `${event.online_platform} (Online)` : 'Online Event';
        } else if (event.location_type === 'hybrid') {
          locationString = event.address || event.city ? 
            `${event.address || ''} ${event.city || 'Hybrid Event'}`.trim() : 'Hybrid Event';
        } else {
          const parts = [event.address, event.city, event.country].filter(Boolean);
          locationString = parts.length > 0 ? parts.join(', ') : 'Location TBD';
        }

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

        // Format date
        const formattedDate = event.start_date ? 
          new Date(event.start_date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric'
          }) : 'Date TBD';

        return {
          id: event.id,
          title: event.title,
          subtitle: event.organizer?.name ? `By ${event.organizer.name}` : undefined,
          image: getFormattedImagePath(event.image_url),
          type: 'event' as const,
          url: `/event/${event.id}`,
          metadata: {
            category: event.category,
            location: locationString,
            date: formattedDate,
            price: priceString,
            description: event.description,
          },
        };
      });
    } catch (error) {
      console.error('Error in searchEvents:', error);
      return [];
    }
  }

  /**
   * Search venues with caching
   */
  private async searchVenuesCached(query: string, limit: number = 10): Promise<SearchResult[]> {
    try {
      // Check if we have cached venue data
      if (this.venueCache && Date.now() < this.venueCacheExpiry) {
        return this.searchVenuesInMemory(this.venueCache, query, limit);
      }
      
      // Fetch and cache venue data
      await this.loadVenueCache();
      return this.searchVenuesInMemory(this.venueCache || [], query, limit);
    } catch (error) {
      console.error('Error in cached venue search:', error);
      return [];
    }
  }
  
  /**
   * Load venue data into cache
   */
  private async loadVenueCache(): Promise<void> {
    if (!isVenuesEnabled()) {
      this.venueCache = [];
      this.venueCacheExpiry = Date.now() + this.ENTITY_CACHE_DURATION;
      return;
    }

    const { data, error } = await this.supabase
      .from('venues')
      .select(`
        id,
        name,
        description,
        featured_image,
        city,
        country,
        address,
        venue_type,
        owner:venue_owners(
          id,
          name,
          profile_image
        )
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error loading venue cache:', error);
      this.venueCache = [];
    } else {
      this.venueCache = data || [];
    }
    
    this.venueCacheExpiry = Date.now() + this.ENTITY_CACHE_DURATION;
  }
  
  /**
   * Fast in-memory venue search
   */
  private searchVenuesInMemory(venues: any[], query: string, limit: number): SearchResult[] {
    const searchTerm = query.toLowerCase();
    
    return venues
      .filter(venue => {
        return (
          venue.name.toLowerCase().includes(searchTerm) ||
          (venue.description && venue.description.toLowerCase().includes(searchTerm)) ||
          (venue.city && venue.city.toLowerCase().includes(searchTerm)) ||
          (venue.country && venue.country.toLowerCase().includes(searchTerm)) ||
          (venue.address && venue.address.toLowerCase().includes(searchTerm)) ||
          (venue.venue_type && venue.venue_type.toLowerCase().includes(searchTerm)) ||
          (venue.owner?.name && venue.owner.name.toLowerCase().includes(searchTerm))
        );
      })
      .slice(0, limit)
      .map(venue => {
        const locationParts = [venue.address, venue.city, venue.country].filter(Boolean);
        const location = locationParts.length > 0 ? locationParts.join(', ') : 'Location not specified';

        return {
          id: venue.id,
          title: venue.name,
          subtitle: venue.owner?.name ? `Managed by ${venue.owner.name}` : undefined,
          image: getFormattedImagePath(venue.featured_image),
          type: 'venue' as const,
          url: `/venue/${venue.id}`,
          metadata: {
            location,
            category: venue.venue_type,
            description: venue.description,
          },
        };
      });
  }

  /**
   * Legacy venue search (kept for compatibility)
   */
  private async searchVenues(query: string, limit: number = 10): Promise<SearchResult[]> {
    try {
      const { data, error } = await this.supabase
        .from('venues')
        .select(`
          id,
          name,
          description,
          featured_image,
          city,
          country,
          address,
          venue_type,
          owner:venue_owners(
            id,
            name,
            profile_image
          )
        `)
        .eq('status', 'published')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,city.ilike.%${query}%,country.ilike.%${query}%,address.ilike.%${query}%,venue_type.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error searching venues:', error);
        return [];
      }

      return (data || []).map((venue: any) => {
        const locationParts = [venue.address, venue.city, venue.country].filter(Boolean);
        const location = locationParts.length > 0 ? locationParts.join(', ') : 'Location not specified';

        return {
          id: venue.id,
          title: venue.name,
          subtitle: venue.owner?.name ? `Managed by ${venue.owner.name}` : undefined,
          image: getFormattedImagePath(venue.featured_image),
          type: 'venue' as const,
          url: `/venue/${venue.id}`,
          metadata: {
            location,
            category: venue.venue_type,
            description: venue.description,
          },
        };
      });
    } catch (error) {
      console.error('Error in searchVenues:', error);
      return [];
    }
  }

  /**
   * Search organizers with caching
   */
  private async searchOrganizersCached(query: string, limit: number = 10): Promise<SearchResult[]> {
    try {
      // Check if we have cached organizer data
      if (this.organizerCache && Date.now() < this.organizerCacheExpiry) {
        return this.searchOrganizersInMemory(this.organizerCache, query, limit);
      }
      
      // Fetch and cache organizer data
      await this.loadOrganizerCache();
      return this.searchOrganizersInMemory(this.organizerCache || [], query, limit);
    } catch (error) {
      console.error('Error in cached organizer search:', error);
      return [];
    }
  }
  
  /**
   * Load organizer data into cache
   */
  private async loadOrganizerCache(): Promise<void> {
    const { data, error } = await this.supabase
      .from('organizers')
      .select(`
        id,
        name,
        bio,
        profile_image,
        premium_tier,
        city,
        country,
        verification_status,
        user_id
      `)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error loading organizer cache:', error);
      this.organizerCache = [];
    } else {
      // Get company names for organizers
      const organizerUserIds = (data || []).map((org: any) => org.user_id).filter(Boolean);
      
      const { data: roleRequestsData } = await this.supabase
        .from('role_requests')
        .select('user_id, company_name, status')
        .in('user_id', organizerUserIds)
        .eq('request_type', 'organizer')
        .not('company_name', 'is', null)
        .in('status', ['approved', 'pending'])
        .order('submitted_at', { ascending: false });
        
      const companyNameMap = new Map<string, string>();
      roleRequestsData?.forEach((roleRequest: any) => {
        if (!companyNameMap.has(roleRequest.user_id)) {
          companyNameMap.set(roleRequest.user_id, roleRequest.company_name);
        }
      });
      
      // Enhance organizer data with company names
      this.organizerCache = (data || []).map((org: any) => ({
        ...org,
        company_name: org.user_id ? companyNameMap.get(org.user_id) : null
      }));
    }
    
    this.organizerCacheExpiry = Date.now() + this.ENTITY_CACHE_DURATION;
  }
  
  /**
   * Fast in-memory organizer search
   */
  private searchOrganizersInMemory(organizers: any[], query: string, limit: number): SearchResult[] {
    const searchTerm = query.toLowerCase();
    
    return organizers
      .filter(organizer => {
        return (
          organizer.name.toLowerCase().includes(searchTerm) ||
          (organizer.company_name && organizer.company_name.toLowerCase().includes(searchTerm)) ||
          (organizer.bio && organizer.bio.toLowerCase().includes(searchTerm)) ||
          (organizer.city && organizer.city.toLowerCase().includes(searchTerm)) ||
          (organizer.country && organizer.country.toLowerCase().includes(searchTerm))
        );
      })
      .slice(0, limit)
      .map(organizer => {
        const locationParts = [organizer.city, organizer.country].filter(Boolean);
        const location = locationParts.length > 0 ? locationParts.join(', ') : '';
        const displayName = organizer.company_name || organizer.name;

        return {
          id: organizer.id,
          title: displayName,
          subtitle: 'Event Organizer',
          image: organizer.profile_image,
          type: 'organizer' as const,
          url: `/profiles/${organizer.id}`,
          metadata: {
            location,
            description: organizer.bio,
            category: organizer.premium_tier || 'Standard',
          },
        };
      });
  }

  /**
   * Legacy organizer search (kept for compatibility)
   */
  private async searchOrganizers(query: string, limit: number = 10): Promise<SearchResult[]> {
    try {
      const { data, error } = await this.supabase
        .from('organizers')
        .select(`
          id,
          name,
          bio,
          profile_image,
          premium_tier,
          city,
          country,
          verification_status
        `)
        .or(`name.ilike.%${query}%,bio.ilike.%${query}%,city.ilike.%${query}%,country.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error searching organizers:', error);
        return [];
      }

      return (data || []).map((organizer: any) => {
        const locationParts = [organizer.city, organizer.country].filter(Boolean);
        const location = locationParts.length > 0 ? locationParts.join(', ') : '';

        return {
          id: organizer.id,
          title: organizer.name,
          subtitle: 'Event Organizer',
          image: organizer.profile_image,
          type: 'organizer' as const,
          url: `/profiles/${organizer.id}`,
          metadata: {
            location,
            description: organizer.bio,
            category: organizer.premium_tier || 'Standard',
          },
        };
      });
    } catch (error) {
      console.error('Error in searchOrganizers:', error);
      return [];
    }
  }

  /**
   * Search venue owners with caching
   */
  private async searchVenueOwnersCached(query: string, limit: number = 10): Promise<SearchResult[]> {
    try {
      // Check if we have cached venue owner data
      if (this.venueOwnerCache && Date.now() < this.venueOwnerCacheExpiry) {
        return this.searchVenueOwnersInMemory(this.venueOwnerCache, query, limit);
      }
      
      // Fetch and cache venue owner data
      await this.loadVenueOwnerCache();
      return this.searchVenueOwnersInMemory(this.venueOwnerCache || [], query, limit);
    } catch (error) {
      console.error('Error in cached venue owner search:', error);
      return [];
    }
  }
  
  /**
   * Load venue owner data into cache
   */
  private async loadVenueOwnerCache(): Promise<void> {
    const { data, error } = await this.supabase
      .from('venue_owners')
      .select(`
        id,
        name,
        bio,
        profile_image,
        city,
        country
      `)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error loading venue owner cache:', error);
      this.venueOwnerCache = [];
    } else {
      this.venueOwnerCache = data || [];
    }
    
    this.venueOwnerCacheExpiry = Date.now() + this.ENTITY_CACHE_DURATION;
  }
  
  /**
   * Fast in-memory venue owner search
   */
  private searchVenueOwnersInMemory(owners: any[], query: string, limit: number): SearchResult[] {
    const searchTerm = query.toLowerCase();
    
    return owners
      .filter(owner => {
        return (
          owner.name.toLowerCase().includes(searchTerm) ||
          (owner.bio && owner.bio.toLowerCase().includes(searchTerm)) ||
          (owner.city && owner.city.toLowerCase().includes(searchTerm)) ||
          (owner.country && owner.country.toLowerCase().includes(searchTerm))
        );
      })
      .slice(0, limit)
      .map(owner => {
        const locationParts = [owner.city, owner.country].filter(Boolean);
        const location = locationParts.length > 0 ? locationParts.join(', ') : '';

        return {
          id: owner.id,
          title: owner.name,
          subtitle: 'Venue Owner',
          image: owner.profile_image,
          type: 'venue_owner' as const,
          url: `/venue-owner/${owner.id}`,
          metadata: {
            location,
            description: owner.bio,
          },
        };
      });
  }

  /**
   * Legacy venue owner search (kept for compatibility)
   */
  private async searchVenueOwners(query: string, limit: number = 10): Promise<SearchResult[]> {
    try {
      const { data, error } = await this.supabase
        .from('venue_owners')
        .select(`
          id,
          name,
          bio,
          profile_image,
          city,
          country
        `)
        .or(`name.ilike.%${query}%,bio.ilike.%${query}%,city.ilike.%${query}%,country.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error searching venue owners:', error);
        return [];
      }

      return (data || []).map((owner: any) => {
        const locationParts = [owner.city, owner.country].filter(Boolean);
        const location = locationParts.length > 0 ? locationParts.join(', ') : '';

        return {
          id: owner.id,
          title: owner.name,
          subtitle: 'Venue Owner',
          image: owner.profile_image,
          type: 'venue_owner' as const,
          url: `/venue-owner/${owner.id}`,
          metadata: {
            location,
            description: owner.bio,
          },
        };
      });
    } catch (error) {
      console.error('Error in searchVenueOwners:', error);
      return [];
    }
  }

  /**
   * Search only events (for discover page) - now uses cache!
   */
  async searchEvents(query: string, limit: number = 50): Promise<SearchResult[]> {
    return this.searchEventsCached(query, limit);
  }
  
  /**
   * Clear all caches (useful for testing or when data changes)
   */
  clearCache(): void {
    this.searchCache.clear();
    this.venueCache = null;
    this.organizerCache = null;
    this.venueOwnerCache = null;
    this.venueCacheExpiry = 0;
    this.organizerCacheExpiry = 0;
    this.venueOwnerCacheExpiry = 0;
    
    // Also clear SharedEventService cache to ensure consistency
    sharedEventService.clearCache();
  }
  
  /**
   * Get cache statistics (useful for debugging)
   */
  getCacheStats(): {
    searchCacheSize: number;
    hasVenueCache: boolean;
    hasOrganizerCache: boolean;
    hasVenueOwnerCache: boolean;
    eventCacheFromSharedService: boolean;
  } {
    return {
      searchCacheSize: this.searchCache.size,
      hasVenueCache: this.venueCache !== null && Date.now() < this.venueCacheExpiry,
      hasOrganizerCache: this.organizerCache !== null && Date.now() < this.organizerCacheExpiry,
      hasVenueOwnerCache: this.venueOwnerCache !== null && Date.now() < this.venueOwnerCacheExpiry,
      eventCacheFromSharedService: true // SharedEventService always has some form of cache
    };
  }
}

// Export singleton instance
export const searchService = new SearchService();
