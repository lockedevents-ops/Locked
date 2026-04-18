/**
 * useTopOrganizers Hook
 * --------------------------------------------------------------
 * React hook for managing top organizers data fetching and state.
 * Provides caching, loading states, and error handling.
 */

import { useState, useEffect, useCallback } from 'react';
import { topOrganizersService, type TopOrganizerMetrics, type TopOrganizersConfig } from '@/services/topOrganizersService';

interface UseTopOrganizersReturn {
  organizers: TopOrganizerMetrics[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isEmpty: boolean;
}

export function useTopOrganizers(config?: TopOrganizersConfig): UseTopOrganizersReturn {
  const [organizers, setOrganizers] = useState<TopOrganizerMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganizers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await topOrganizersService.getTopOrganizers(config);
      setOrganizers(data);
    } catch (err) {
      console.error('Error fetching top organizers:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch top organizers');
      setOrganizers([]);
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  useEffect(() => {
    fetchOrganizers();
  }, [fetchOrganizers]);

  return {
    organizers,
    isLoading,
    error,
    refetch: fetchOrganizers,
    isEmpty: !isLoading && organizers.length === 0
  };
}

export default useTopOrganizers;
