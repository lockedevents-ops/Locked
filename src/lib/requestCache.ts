/**
 * Request Cache Utility
 * --------------------------------------------------------------
 * Implements request deduplication and caching for API calls.
 * Prevents duplicate concurrent requests and caches responses.
 * 
 * ✅ PHASE 3 OPTIMIZATION: Reduces unnecessary API calls and improves performance
 * 🚀 UPDATE: Added timeouts to prevent infinite loading
 */

import { toast } from 'sonner';

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  promise?: Promise<T>;
};

type CacheConfig = {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
  staleWhileRevalidate?: boolean; // Return stale data while fetching fresh (default: true)
  timeout?: number; // Request timeout in milliseconds (default: 15s)
};

class RequestCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private inflightRequests: Map<string, Promise<any>> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  private defaultTimeout = 15000; // 15 seconds

  /**
   * Fetch data with deduplication and caching
   * @param key - Unique cache key for the request
   * @param fetcher - Function that performs the actual fetch
   * @param config - Cache configuration
   */
  async fetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    config: CacheConfig = {}
  ): Promise<T> {
    const { ttl = this.defaultTTL, staleWhileRevalidate = true, timeout = this.defaultTimeout } = config;
    
    // ✅ Check if there's an inflight request for this key
    const inflightRequest = this.inflightRequests.get(key);
    if (inflightRequest) {
      console.log(`[RequestCache] Deduplicating request for: ${key}`);
      return inflightRequest;
    }

    // ✅ Check cache
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached) {
      const age = now - cached.timestamp;
      
      // ✅ Cache is fresh - return immediately
      if (age < ttl) {
        console.log(`[RequestCache] Cache HIT (fresh) for: ${key}, age: ${age}ms`);
        return cached.data;
      }

      // ✅ Cache is stale but staleWhileRevalidate is enabled
      if (staleWhileRevalidate && age < ttl * 2) {
        console.log(`[RequestCache] Cache HIT (stale) for: ${key}, revalidating in background`);
        
        // Return stale data immediately
        const staleData = cached.data;
        
        // Revalidate in background (don't await)
        this.revalidate(key, fetcher, ttl, timeout).catch(err => {
          console.error(`[RequestCache] Background revalidation failed for: ${key}`, err);
        });
        
        return staleData;
      }
    }

    // ✅ No valid cache - fetch fresh data
    console.log(`[RequestCache] Cache MISS for: ${key}, fetching...`);
    return this.fetchAndCache(key, fetcher, ttl, timeout);
  }

  /**
   * Fetch fresh data and update cache
   */
  private async fetchAndCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number,
    timeout: number
  ): Promise<T> {
    // Helper to cleanup inflight request on error or timeout
    const cleanup = () => this.inflightRequests.delete(key);

    // Create a promise that rejects after timeout
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Request timed out after ${timeout}ms`));
      }, timeout);
    });

    // Race the fetcher against the timeout
    const fetchPromise = Promise.race([fetcher(), timeoutPromise]) as Promise<T>;
    
    this.inflightRequests.set(key, fetchPromise);

    try {
      const data = await fetchPromise;
      
      // Update cache
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
      });
      
      console.log(`[RequestCache] Cached fresh data for: ${key}`);
      cleanup();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      return data;
    } catch (error) {
      cleanup();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Enhanced error handling for timeouts
      const err = error as Error;
      if (err.message.includes('timed out')) {
        console.warn(`[RequestCache] ⚠️ ${key} :: ${err.message}`);
        
        // Only show toast for client-side fetches
        if (typeof window !== 'undefined') {
          toast.error('Connection is slow', {
            description: 'The request took too long. Please refresh the page.',
            duration: 5000,
          });
        }
      }
      
      throw error;
    }
  }

  /**
   * Revalidate cache in background
   */
  private async revalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number,
    timeout: number
  ): Promise<void> {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      // Background revalidation also needs timeouts to prevent zombie promises
      // using a simpler race here without inflight management as logic matches fetchAndCache flow
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Background revalidation timed out')), timeout);
      });
      
      const data = await Promise.race([fetcher(), timeoutPromise]);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
      });
      console.log(`[RequestCache] Background revalidation complete for: ${key}`);
    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      console.error(`[RequestCache] Revalidation failed for: ${key}`, error);
      // Don't throw - background revalidation failures shouldn't affect the user
    }
  }

  /**
   * Manually invalidate cache for a key
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    console.log(`[RequestCache] Invalidated cache for: ${key}`);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.inflightRequests.clear();
    console.log('[RequestCache] Cleared all cache');
  }

  /**
   * Get cached value synchronously (respecting optional max age)
   */
  getCachedValue<T>(key: string, maxAge?: number): T | undefined {
    const cached = this.cache.get(key);
    if (!cached) return undefined;

    if (typeof maxAge === 'number') {
      const age = Date.now() - cached.timestamp;
      if (age > maxAge) {
        return undefined;
      }
    }

    return cached.data as T;
  }

  /**
   * Prime the cache with a known value (useful after manual fetches)
   */
  prime<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Get cache stats for debugging
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      inflightRequests: this.inflightRequests.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Prefetch data and store in cache
   */
  async prefetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    config: CacheConfig = {}
  ): Promise<void> {
    const { ttl = this.defaultTTL, timeout = this.defaultTimeout } = config;
    
    // Check if already cached and fresh
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      console.log(`[RequestCache] Prefetch skipped (already cached): ${key}`);
      return;
    }

    // Check if already being fetched
    if (this.inflightRequests.has(key)) {
      console.log(`[RequestCache] Prefetch skipped (already fetching): ${key}`);
      return;
    }

    console.log(`[RequestCache] Prefetching: ${key}`);
    // We catch errors here because prefetching shouldn't crash the app
    try {
      await this.fetchAndCache(key, fetcher, ttl, timeout);
    } catch (err) {
      console.warn(`[RequestCache] Prefetch failed for ${key}:`, err);
    }
  }
}

// ✅ Export singleton instance
export const requestCache = new RequestCache();

// ✅ Helper functions for common use cases

/**
 * Fetch events with caching and deduplication
 */
export async function fetchEvents<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const cacheKey = `events:${endpoint}`;
  
  return requestCache.fetch(
    cacheKey,
    async () => {
      const response = await fetch(endpoint, options);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      return response.json();
    },
    {
      ttl: 5 * 60 * 1000, // 5 minutes
      staleWhileRevalidate: true,
      timeout: 15000 // 15s timeout
    }
  );
}

/**
 * Prefetch events for faster subsequent loads
 */
export async function prefetchEvents(endpoint: string): Promise<void> {
  const cacheKey = `events:${endpoint}`;
  
  return requestCache.prefetch(
    cacheKey,
    async () => {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Failed to prefetch: ${response.statusText}`);
      }
      return response.json();
    },
    {
      ttl: 5 * 60 * 1000,
      staleWhileRevalidate: true,
      timeout: 15000
    }
  );
}

/**
 * Invalidate events cache (use after mutations)
 */
export function invalidateEventsCache(endpoint?: string): void {
  if (endpoint) {
    requestCache.invalidate(`events:${endpoint}`);
  } else {
    // Invalidate all events caches
    const stats = requestCache.getStats();
    stats.keys.forEach(key => {
      if (key.startsWith('events:')) {
        requestCache.invalidate(key);
      }
    });
  }
}

// ✅ Export for debugging in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__requestCache = requestCache;
}
