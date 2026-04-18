/**
 * useHomepageEvents Hook
 * --------------------------------------------------------------
 * React hook for managing shared homepage event data.
 * Fetches all event sections in one call to improve performance.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { sharedEventService, type HomepageEventData } from '@/services/sharedEventService';

interface UseHomepageEventsReturn {
  eventData: HomepageEventData;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const defaultHomepageData: HomepageEventData = {
  featuredEvents: [],
  trendingEvents: [],
  recommendedEvents: [],
  liveEvents: [],
  upcomingEvents: []
};

export function useHomepageEvents(): UseHomepageEventsReturn {
  const { user } = useAuth();
  const initialSnapshot = sharedEventService.getCachedHomepageEvents(user?.id);
  const [eventData, setEventData] = useState<HomepageEventData>(initialSnapshot ?? defaultHomepageData);
  // Only show loading if we have zero cached data
  const [isLoading, setIsLoading] = useState(!initialSnapshot);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async (options?: { soft?: boolean }) => {
    // ✅ STALE-WHILE-REVALIDATE: If we already have data, never show spinner
    // Only show spinner on the very first cold load
    if (!options?.soft) {
      setIsLoading(true);
    }
    setError(null);
    
    try {
      const data = await sharedEventService.getHomepageEvents(user?.id);
      setEventData(data);
    } catch (err) {
      console.error('Error loading homepage events:', err);
      // Only show error if we don't already have data to display
      if (!options?.soft) {
        setError('Failed to load events. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const refresh = useCallback(async () => {
    // Hard refresh: clear cache and reload with spinner
    sharedEventService.clearCache();
    await loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const cached = sharedEventService.getCachedHomepageEvents(user?.id);
    if (cached) {
      // ✅ Instant: serve cached data, no spinner at all
      setEventData(cached);
      setIsLoading(false);
      // Silently revalidate in the background (soft = true → no spinner)
      loadEvents({ soft: true });
    } else {
      // First ever load → show spinner
      loadEvents();
    }
  }, [user?.id, loadEvents]);

  return {
    eventData,
    isLoading,
    error,
    refresh
  };
}
