/**
 * useDiscoverEvents Hook
 * --------------------------------------------------------------
 * React hook for managing discover page event data with filtering.
 * Uses shared event service to reduce API calls and manage state.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { sharedEventService, type EventData } from '@/services/sharedEventService';
import { createClient } from '@/lib/supabase/client/client';

export interface DiscoverFilters {
  search: string;
  category: string;
  location: string;
  date?: Date;
  price: [number, number] | null;
  freeOnly: boolean;
  hasVoting: boolean;
  hasMerch: boolean;
  isFeatured: boolean;
  isAdult: boolean; // 18+ events filter
  eventType?: 'all' | 'online' | 'in-person';
  priceRange?: string; // e.g., "0-50", "50-100", "free"
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
}

export interface UseDiscoverEventsReturn {
  allEvents: EventData[];
  filteredEvents: EventData[];
  isLoading: boolean;
  error: string | null;
  applyFilters: (filters: DiscoverFilters) => void;
  sortEvents: (sortBy: 'date' | 'popularity' | 'created' | 'price' | 'locks', order: 'asc' | 'desc') => void;
  refresh: () => Promise<void>;
}

const isSameDate = (a?: Date, b?: Date) => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.getTime() === b.getTime();
};

const isSamePriceTuple = (a: [number, number] | null, b: [number, number] | null) => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a[0] === b[0] && a[1] === b[1];
};

const areFiltersEqual = (a: DiscoverFilters, b: DiscoverFilters) => {
  if (a === b) return true;
  return (
    a.search === b.search &&
    a.category === b.category &&
    a.location === b.location &&
    isSameDate(a.date, b.date) &&
    isSamePriceTuple(a.price, b.price) &&
    a.freeOnly === b.freeOnly &&
    a.freeOnly === b.freeOnly &&
    a.hasVoting === b.hasVoting &&
    a.hasMerch === b.hasMerch &&
    a.isFeatured === b.isFeatured &&
    a.isAdult === b.isAdult &&
    a.eventType === b.eventType &&
    a.priceRange === b.priceRange &&
    a.startDate === b.startDate &&
    a.endDate === b.endDate
  );
};

export function useDiscoverEvents(initialFilters?: Partial<DiscoverFilters>): UseDiscoverEventsReturn {
  const [allEvents, setAllEvents] = useState<EventData[]>([]);
  const [currentFilters, setCurrentFilters] = useState<DiscoverFilters>({
    search: '',
    category: '',
    location: '',
    date: undefined,
    price: null,
    freeOnly: false,
    hasVoting: false,
    hasMerch: false,
    isFeatured: false,
    isAdult: false,
    eventType: 'all',
    ...initialFilters
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    sortBy: 'date' | 'popularity' | 'created' | 'price' | 'locks';
    order: 'asc' | 'desc';
  } | null>(null);

  const loadEvents = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const events = await sharedEventService.getAllEvents({ 
        includeAll: true // Uses 5-min cache from sharedEventService
      });
      setAllEvents(events);
    } catch (err) {
      console.error('Error loading discover events:', err);
      setError('Failed to load events. Please try again later.');
      setAllEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load events on mount
  useEffect(() => {
    loadEvents();
  }, []);

  // ✅ REALTIME: Subscribe to lock count updates for all visible events
  useEffect(() => {
    if (!allEvents.length) return;
    
    let unsubscribed = false;
    const eventIds = allEvents.map(e => e.id);
    const supabase = createClient();
    
    // Batch subscribe to lock count changes
    const channel = supabase
      .channel(`discover-lock-counts-${Date.now()}`) // Unique channel name to avoid conflicts
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: `id=in.(${eventIds.join(',')})`,
        },
        (payload: any) => {
          // Ignore updates if component is unmounting
          if (unsubscribed) return;
          
          try {
            // Update the specific event's lock count in real-time
            const { id, lock_count } = payload.new as { id: string; lock_count: number };
            console.log(`[useDiscoverEvents] Realtime update: event ${id} lock count = ${lock_count}`);
            
            setAllEvents(prev => prev.map(event => 
              event.id === id 
                ? { ...event, lockCount: lock_count || 0 }
                : event
            ));
          } catch (err) {
            console.error('[useDiscoverEvents] Error handling realtime update:', err);
          }
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log('[useDiscoverEvents] Realtime subscription established');
        }
      });
    
    return () => {
      unsubscribed = true;
      // Properly unsubscribe from channel
      try {
        supabase.removeChannel(channel).catch(() => {
          // Ignore unsubscribe errors
        });
      } catch (err) {
        console.error('[useDiscoverEvents] Error unsubscribing from realtime:', err);
      }
    };
  }, [allEvents.length]); // Re-subscribe when event list changes

  // Apply client-side filtering and sorting
  const filteredEvents = useMemo(() => {
    if (!allEvents.length) {
      return [];
    }
    
    let result = [...allEvents];
    
    // Apply sorting first if specified
    if (sortConfig) {
      const sortMultiplier = sortConfig.order === 'desc' ? -1 : 1;
      
      switch (sortConfig.sortBy) {
        case 'date':
          result.sort((a, b) => {
            const dateA = new Date(a.startDate).getTime();
            const dateB = new Date(b.startDate).getTime();
            return (dateA - dateB) * sortMultiplier;
          });
          break;
        
        case 'locks':
          result.sort((a, b) => {
            const locksA = a.lockCount || 0;
            const locksB = b.lockCount || 0;
            return (locksA - locksB) * sortMultiplier;
          });
          break;
        
        case 'popularity':
          result.sort((a, b) => {
            const scoreA = (a.lockCount || 0) + (a.viewCount || 0) + (a.likes || 0);
            const scoreB = (b.lockCount || 0) + (b.viewCount || 0) + (b.likes || 0);
            return (scoreA - scoreB) * sortMultiplier;
          });
          break;
        
        case 'created':
          result.sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return (dateA - dateB) * sortMultiplier;
          });
          break;
        
        case 'price':
          result.sort((a, b) => {
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
            return (priceA - priceB) * sortMultiplier;
          });
          break;
      }
    }
    
    // Filter by search term
    if (currentFilters.search) {
      const searchLower = currentFilters.search.toLowerCase();
      const beforeCount = result.length;
      result = result.filter(event => 
        event.title.toLowerCase().includes(searchLower) ||
        (event.location && event.location.toLowerCase().includes(searchLower)) ||
        (event.category && event.category.toLowerCase().includes(searchLower)) ||
        (event.description && event.description.toLowerCase().includes(searchLower))
      );
    }
    
    // Filter by category - handle category groups
    // Skip category filtering for '18+' since it's handled by isAdult filter
    if (currentFilters.category && currentFilters.category.toLowerCase() !== '18+') {
      const beforeCount = result.length;
      const filterCategory = currentFilters.category.toLowerCase();
      
      // Define category groups to match CategoryStrip exactly
      const categoryGroups: Record<string, string[]> = {
        "arts": ["music", "arts_culture", "theatre", "dance", "film", "traditional"],
        "business": ["business", "corporate", "networking", "career"],
        "lifestyle": ["food_drink", "fashion", "beauty", "health_wellness"],
        "sports": ["sports_fitness", "gaming", "outdoor", "adventure"],
        "learning": ["technology", "education", "academic", "workshop"],
        "community": ["community", "charity", "religious", "political"],
        "other": ["entertainment", "family_kids", "holiday", "other"]
      };
      
      result = result.filter(event => {
        if (!event.category) return false;
        const eventCategory = event.category.toLowerCase();
        
        // Check if filter matches a category group
        const groupSubcategories = categoryGroups[filterCategory];
        if (groupSubcategories) {
          // Filter is a group - check if event matches any subcategory
          return groupSubcategories.some(subcat => {
            return eventCategory.includes(subcat) || 
                   subcat.includes(eventCategory) ||
                   eventCategory === subcat;
          });
        }
        
        // Filter is not a group - use bidirectional matching
        return eventCategory.includes(filterCategory) || 
               filterCategory.includes(eventCategory) ||
               eventCategory === filterCategory;
      });
    }
    
    // Filter by location
    if (currentFilters.location) {
      const beforeCount = result.length;
      result = result.filter(event => 
        event.location && event.location.toLowerCase().includes(currentFilters.location.toLowerCase())
      );
    }

    // Filter by event type (online vs in-person)
    if (currentFilters.eventType && currentFilters.eventType !== 'all') {
      result = result.filter(event => {
        if (!event.location) return false;
        
        const location = event.location.toLowerCase();
        const isOnline = location.startsWith('http') || 
                        location.startsWith('www.') || 
                        location.includes('zoom') || 
                        location.includes('teams') || 
                        location.includes('meet.google') ||
                        location.includes('online') ||
                        location.includes('virtual');
        
        if (currentFilters.eventType === 'online') {
          return isOnline;
        } else if (currentFilters.eventType === 'in-person') {
          return !isOnline && !location.includes('hybrid');
        }
        
        return true;
      });
    }

    // Filter by date
    if (currentFilters.date) {
      const targetDate = currentFilters.date;
      // Normalizing target date to start of day for comparison
      const targetDateStart = new Date(targetDate);
      targetDateStart.setHours(0, 0, 0, 0);
      
      // Normalizing target date to end of day for comparison
      const targetDateEnd = new Date(targetDate);
      targetDateEnd.setHours(23, 59, 59, 999);

      result = result.filter(event => {
        // Parse event start date
        const eventStartDate = new Date(event.startDate);
        eventStartDate.setHours(0, 0, 0, 0);
        
        // If event has end date, use it for range check
        if (event.endDate) {
          const eventEndDate = new Date(event.endDate);
          eventEndDate.setHours(23, 59, 59, 999);
          
          // Check if target date falls within event range [start, end]
          return targetDateStart >= eventStartDate && targetDateEnd <= eventEndDate ||
                 // Also match if any part of the target date overlaps with the event
                 (targetDateStart <= eventEndDate && targetDateEnd >= eventStartDate);
        }
        
        // Single day event - exact match
        return eventStartDate.getTime() === targetDateStart.getTime();
      });
    }
    
    // Filter by price (free only)
    if (currentFilters.freeOnly) {
      const beforeCount = result.length;
      result = result.filter(event => 
        event.price === 'Free' || event.price === '₵0'
      );
    }
    
    // Filter by price range from search modal (string format like "0-50", "50-100", etc.)
    if (currentFilters.priceRange && currentFilters.priceRange !== 'free' && !currentFilters.freeOnly) {
      result = result.filter(event => {
        const priceString = typeof event.price === 'string' ? event.price : String(event.price || '');
        
        // Handle free events
        if (priceString === 'Free' || priceString === '₵0') {
          return currentFilters.priceRange === '0-50'; // Include free events only in lowest range
        }
        
        // Extract numeric price from string
        const priceMatches = priceString.match(/₵(\d+)(?:\s*-\s*₵(\d+))?/);
        if (!priceMatches) return false;
        
        const minPrice = parseInt(priceMatches[1]) || 0;
        const maxPrice = priceMatches[2] ? parseInt(priceMatches[2]) : minPrice;
        const eventPrice = minPrice; // Use minimum price for filtering
        
        // Parse price range filter
        const range = currentFilters.priceRange;
        if (!range) {
          return true; // No price range filter applied
        }
        
        if (range === '500+') {
          return eventPrice >= 500;
        }
        
        const [min, max] = range.split('-').map(Number);
        return eventPrice >= min && eventPrice <= max;
      });
    }
    
    // Filter by price range (if not free only)
    if (currentFilters.price && !currentFilters.freeOnly) {
      result = result.filter(event => {
        if (event.price === 'Free') {
          // Free events should be included if the filter starts from 0
          return currentFilters.price![0] === 0;
        }
        
        const priceString = typeof event.price === 'string' ? event.price : String(event.price || '');
        
        // Handle price ranges like "₵100 - ₵500" or single prices like "₵200"
        const priceMatches = priceString.match(/₵(\d+)(?:\s*-\s*₵(\d+))?/);
        
        if (!priceMatches) {
          return false; // Invalid price format
        }
        
        const minPrice = parseInt(priceMatches[1]) || 0;
        const maxPrice = priceMatches[2] ? parseInt(priceMatches[2]) : minPrice;
        
        // Event should be included if its price range overlaps with the filter range
        // Event range: [minPrice, maxPrice]
        // Filter range: [currentFilters.price[0], currentFilters.price[1]]
        // Overlap if: minPrice <= filter_max AND maxPrice >= filter_min
        return minPrice <= currentFilters.price![1] && maxPrice >= currentFilters.price![0];
      });
    }
    
    // Filter by date range (startDate and endDate from search modal)
    if (currentFilters.startDate || currentFilters.endDate) {
      result = result.filter(event => {
        const eventDate = new Date(event.startDate);
        
        // Check start date constraint
        if (currentFilters.startDate) {
          const filterStartDate = new Date(currentFilters.startDate);
          if (eventDate < filterStartDate) return false;
        }
        
        // Check end date constraint
        if (currentFilters.endDate) {
          const filterEndDate = new Date(currentFilters.endDate);
          // Set to end of day for inclusive comparison
          filterEndDate.setHours(23, 59, 59, 999);
          if (eventDate > filterEndDate) return false;
        }
        
        return true;
      });
    }
    
    // Filter by voting events
    if (currentFilters.hasVoting) {
      const beforeCount = result.length;
      result = result.filter(event => event.hasVoting);
    }
    
    // Filter by merchandise
    if (currentFilters.hasMerch) {
      result = result.filter(event => event.hasMerch);
    }
    
    // Filter by featured events
    if (currentFilters.isFeatured) {
      const beforeCount = result.length;
      result = result.filter(event => event.isFeatured === true);
    }
    
    // Filter by 18+ events (adult content)
    if (currentFilters.isAdult) {
      result = result.filter(event => 
        (event.ageRestriction && event.ageRestriction >= 18) || event.isAdult
      );
    }
    
    return result;
  }, [allEvents, currentFilters, sortConfig]);

  const applyFilters = useCallback((filters: DiscoverFilters) => {
    setCurrentFilters(prev => (areFiltersEqual(prev, filters) ? prev : filters));
  }, []);

  const sortEvents = (sortBy: 'date' | 'popularity' | 'created' | 'price' | 'locks', order: 'asc' | 'desc') => {
    setSortConfig({ sortBy, order });
  };

  const refresh = async () => {
    // Clear any cache and reload
    sharedEventService.clearCache();
    await loadEvents();
  };

  return {
    allEvents,
    filteredEvents,
    isLoading,
    error,
    applyFilters,
    sortEvents,
    refresh
  };
}
