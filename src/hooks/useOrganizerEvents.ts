/**
 * useOrganizerEvents Hook
 * --------------------------------------------------------------
 * React hook for managing organizer dashboard event data with caching.
 * Uses shared event service to reduce API calls and improve performance.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { sharedEventService, type EventData } from '@/services/sharedEventService';

interface UseOrganizerEventsOptions {
  organizerId: string;
  status?: 'all' | 'upcoming' | 'live' | 'past';
  searchTerm?: string;
}

interface UseOrganizerEventsReturn {
  events: EventData[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  clearCache: () => void;
}

export function useOrganizerEvents({
  organizerId,
  status = 'all',
  searchTerm = ''
}: UseOrganizerEventsOptions): UseOrganizerEventsReturn {
  const [events, setEvents] = useState<EventData[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Start as false - only set true when actually fetching
  const [error, setError] = useState<string | null>(null);
  const latestRequestRef = useRef(0);

  const loadEvents = useCallback(async () => {
    const requestId = ++latestRequestRef.current;

    if (!organizerId) {
      setEvents([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Always load published events (we'll filter client-side)
    const cachedEvents = sharedEventService.getCachedOrganizerEvents(organizerId, {
      status: 'published', // Always fetch published events for time-based filtering
      searchTerm
    });

    if (cachedEvents !== null) {
      if (requestId === latestRequestRef.current) {
        setEvents(cachedEvents);
        setIsLoading(false);
      }
    } else {
      setIsLoading(true);
    }

    if (requestId === latestRequestRef.current) {
      setError(null);
    }
    
    try {
      const fetchedEvents = await sharedEventService.getOrganizerEvents(organizerId, {
        status: 'published', // Always fetch published events
        searchTerm
      });
      
      // Client-side filtering based on event timing
      const now = new Date();
      const filteredEvents = fetchedEvents.filter(event => {
        if (status === 'all') return true;
        
        // Parse event date and time
        const eventDate = new Date(event.startDate || event.date);
        const endDate = event.endDate ? new Date(event.endDate) : eventDate;
        
        if (status === 'past') {
          // Event has already ended
          return endDate < now;
        } else if (status === 'live') {
          // Event is currently happening (started but not ended)
          return eventDate <= now && endDate >= now;
        } else if (status === 'upcoming') {
          // Event hasn't started yet
          return eventDate > now;
        }
        
        return true;
      });
      
      if (requestId !== latestRequestRef.current) return;
      setEvents(filteredEvents);
    } catch (err) {
      console.error('Error loading organizer events:', err);
      if (requestId !== latestRequestRef.current) return;
      setError('Failed to load events. Please try again later.');
      setEvents([]);
    } finally {
      if (requestId === latestRequestRef.current) {
        setIsLoading(false);
      }
    }
  }, [organizerId, status, searchTerm]);

  const refresh = useCallback(async () => {
    // Clear cache and reload
    sharedEventService.clearOrganizerCache(organizerId);
    setIsLoading(true); // Show loading when manually refreshing
    await loadEvents();
  }, [organizerId, loadEvents]);

  const clearCache = useCallback(() => {
    sharedEventService.clearOrganizerCache(organizerId);
  }, [organizerId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return {
    events,
    isLoading,
    error,
    refresh,
    clearCache
  };
}
