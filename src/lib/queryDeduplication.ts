/**
 * Query Deduplication Utility
 * --------------------------------------------------------------
 * Prevents duplicate API calls when multiple components request
 * the same data simultaneously. Uses request coalescing and
 * in-memory caching to reduce server load and improve performance.
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  error?: any;
}

class QueryDeduplicator {
  private pendingRequests: Map<string, PendingRequest<any>> = new Map();
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_TTL = 60000; // 60 seconds default cache TTL
  private readonly PENDING_TIMEOUT = 30000; // 30 seconds for pending requests

  /**
   * Execute a query with deduplication
   * If the same query is already pending, returns the existing promise
   * If cached data is fresh, returns cached data
   * Otherwise, executes the query
   */
  async query<T>(
    key: string,
    queryFn: () => Promise<T>,
    options: {
      ttl?: number;
      bypassCache?: boolean;
    } = {}
  ): Promise<T> {
    const { ttl = this.DEFAULT_TTL, bypassCache = false } = options;
    const now = Date.now();

    // Check if there's a pending request for this key
    const pending = this.pendingRequests.get(key);
    if (pending) {
      const age = now - pending.timestamp;
      
      // If pending request is too old, remove it and create new one
      if (age > this.PENDING_TIMEOUT) {
        console.warn(`[QueryDedup] Pending request timed out for key: ${key}`);
        this.pendingRequests.delete(key);
      } else {
        console.log(`[QueryDedup] Reusing pending request for key: ${key}`);
        return pending.promise;
      }
    }

    // Check cache if not bypassing
    if (!bypassCache) {
      const cached = this.cache.get(key);
      if (cached) {
        const age = now - cached.timestamp;
        
        if (age < ttl) {
          console.log(`[QueryDedup] Cache hit for key: ${key} (age: ${age}ms)`);
          
          // If cached data has error, throw it
          if (cached.error) {
            throw cached.error;
          }
          
          return cached.data;
        } else {
          console.log(`[QueryDedup] Cache expired for key: ${key} (age: ${age}ms)`);
          this.cache.delete(key);
        }
      }
    }

    // Execute the query
    console.log(`[QueryDedup] Executing new query for key: ${key}`);
    const promise = this.executeQuery(key, queryFn, ttl);
    
    // Store as pending
    this.pendingRequests.set(key, {
      promise,
      timestamp: now
    });

    return promise;
  }

  private async executeQuery<T>(
    key: string,
    queryFn: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    try {
      const data = await queryFn();
      
      // Cache successful result
      this.cache.set(key, {
        data,
        timestamp: Date.now()
      });
      
      // Remove from pending
      this.pendingRequests.delete(key);
      
      return data;
    } catch (error) {
      // Cache error for short duration (5 seconds) to prevent retry storms
      this.cache.set(key, {
        data: null as any,
        timestamp: Date.now(),
        error
      });
      
      // Remove from pending
      this.pendingRequests.delete(key);
      
      // Remove error from cache after 5 seconds
      setTimeout(() => {
        const cached = this.cache.get(key);
        if (cached && cached.error === error) {
          this.cache.delete(key);
        }
      }, 5000);
      
      throw error;
    }
  }

  /**
   * Invalidate cache for a specific key or pattern
   */
  invalidate(keyOrPattern: string | RegExp): void {
    if (typeof keyOrPattern === 'string') {
      // Exact key match
      this.cache.delete(keyOrPattern);
      this.pendingRequests.delete(keyOrPattern);
      console.log(`[QueryDedup] Invalidated cache for key: ${keyOrPattern}`);
    } else {
      // Pattern match
      let invalidatedCount = 0;
      
      for (const key of this.cache.keys()) {
        if (keyOrPattern.test(key)) {
          this.cache.delete(key);
          this.pendingRequests.delete(key);
          invalidatedCount++;
        }
      }
      
      console.log(`[QueryDedup] Invalidated ${invalidatedCount} cache entries matching pattern: ${keyOrPattern}`);
    }
  }

  /**
   * Clear all cache and pending requests
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
    console.log('[QueryDedup] Cleared all cache and pending requests');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      cacheKeys: Array.from(this.cache.keys()),
      pendingKeys: Array.from(this.pendingRequests.keys())
    };
  }

  /**
   * Prefetch data (execute query and cache result without returning)
   */
  async prefetch<T>(
    key: string,
    queryFn: () => Promise<T>,
    ttl?: number
  ): Promise<void> {
    try {
      await this.query(key, queryFn, { ttl });
      console.log(`[QueryDedup] Prefetched data for key: ${key}`);
    } catch (error) {
      console.error(`[QueryDedup] Prefetch failed for key: ${key}`, error);
    }
  }
}

// Export singleton instance
export const queryDeduplicator = new QueryDeduplicator();

/**
 * Helper function to generate cache keys
 */
export function generateQueryKey(
  table: string,
  operation: string,
  params?: Record<string, any>
): string {
  if (!params) {
    return `${table}:${operation}`;
  }
  
  // Sort params for consistent keys
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, any>);
  
  return `${table}:${operation}:${JSON.stringify(sortedParams)}`;
}
