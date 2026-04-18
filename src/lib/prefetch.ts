/**
 * ✅ PHASE 3: Prefetch Utility
 * 
 * Prefetches data on hover to make navigation feel instant
 * Uses the API route with proper caching headers
 */

import { fetchWithTimeout } from '@/lib/network';

export class PrefetchManager {
  private prefetchedUrls: Set<string> = new Set();
  private prefetchPromises: Map<string, Promise<any>> = new Map();

  /**
   * Prefetch homepage events on hover
   * Uses the API route for better caching
   */
  async prefetchHomepageEvents(): Promise<void> {
    const url = '/api/homepage-events';
    
    if (this.prefetchedUrls.has(url)) {
      return; // Already prefetched
    }

    try {
      const response = await fetchWithTimeout(url, {
        // Use GET request with cache
        method: 'GET',
        // Respect cache headers
        cache: 'force-cache',
      }, 6000, 'Prefetch homepage events');

      if (response.ok) {
        this.prefetchedUrls.add(url);
      }
    } catch (error) {
      console.error('Prefetch failed:', error);
    }
  }

  /**
   * Prefetch event details on hover
   */
  async prefetchEventDetails(eventId: string): Promise<void> {
    const url = `/api/events/${eventId}`;
    
    if (this.prefetchedUrls.has(url) || this.prefetchPromises.has(url)) {
      return;
    }

    const promise = fetchWithTimeout(url, {
      method: 'GET',
      cache: 'force-cache',
    }, 6000, 'Prefetch event details').then(res => {
      if (res.ok) {
        this.prefetchedUrls.add(url);
      }
      return res;
    }).catch(error => {
      console.error(`Prefetch failed for event ${eventId}:`, error);
    });

    this.prefetchPromises.set(url, promise);
    
    try {
      await promise;
    } finally {
      this.prefetchPromises.delete(url);
    }
  }

  /**
   * Clear prefetch cache (useful for testing)
   */
  clear(): void {
    this.prefetchedUrls.clear();
    this.prefetchPromises.clear();
  }
}

// Export singleton instance
export const prefetchManager = new PrefetchManager();

/**
 * React Hook for easy prefetching
 */
export function usePrefetch() {
  const prefetchHomepage = () => {
    prefetchManager.prefetchHomepageEvents();
  };

  const prefetchEvent = (eventId: string) => {
    prefetchManager.prefetchEventDetails(eventId);
  };

  return {
    prefetchHomepage,
    prefetchEvent,
  };
}
