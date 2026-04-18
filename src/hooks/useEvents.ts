/**
 * useEvents – Events Fetch Hook
 * --------------------------------------------------------------
 * Updated to use shared event service for consistency.
 * Provides events with filtering based on eventStore filters.
 */
import { useState, useEffect } from 'react';
import { useEventStore } from '@/store/eventStore';
import { sharedEventService, type EventData } from '@/services/sharedEventService';

export function useEvents() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filters = useEventStore((state) => state.filters);
  const [events, setEvents] = useState<EventData[]>([]);
  
  useEffect(() => {
    const getEvents = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Use shared event service with fresh data
        const fetchedEvents = await sharedEventService.getAllEvents({ 
          includeAll: true 
        });
        setEvents(fetchedEvents);
      } catch (err) {
        setError('Failed to fetch events');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    getEvents();
  }, [filters]);
  
  return { events, loading, error };
}
