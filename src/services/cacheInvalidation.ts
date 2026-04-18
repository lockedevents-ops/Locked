/**
 * Cache Invalidation Service
 * =======================
 * 
 * Unified cache invalidation for all in-memory caches across the platform.
 * Provides centralized control over cache clearing to ensure data consistency
 * after mutations (create, update, delete operations).
 * 
 * @module services/cacheInvalidation
 * @version 1.0.0
 */

import { sharedEventService } from './sharedEventService';
import { searchService } from './searchService';
import { topOrganizersService } from './topOrganizersService';

/**
 * Cache keys that can be invalidated
 */
export type CacheKey = 
  | 'events'           // Main event cache (sharedEventService)
  | 'homepage'         // Homepage event snapshots
  | 'search'           // Search results cache
  | 'organizers'       // Top organizers cache
  | 'event-details'    // Individual event detail cache
  | 'lock-counts'      // Real-time lock count cache
  | 'organizer-events' // Organizer-specific events cache
  | 'all';             // Clear all caches

/**
 * Cache invalidation configuration
 */
interface InvalidationConfig {
  /** Log cache invalidation events */
  logging?: boolean;
  /** Delay before invalidation (useful for batch operations) */
  delayMs?: number;
}

/**
 * Map of cache keys to their invalidation functions
 */
const cacheInvalidators: Record<Exclude<CacheKey, 'all'>, () => void> = {
  'events': () => {
    sharedEventService.clearCache();
  },
  'homepage': () => {
    // Clear homepage-specific snapshots (part of sharedEventService)
    sharedEventService.clearCache();
  },
  'search': () => {
    searchService.clearCache();
  },
  'organizers': () => {
    topOrganizersService.clearCache();
  },
  'event-details': () => {
    // Clear individual event detail cache
    sharedEventService.clearCache();
  },
  'lock-counts': () => {
    // Lock counts are part of sharedEventService cache
    sharedEventService.clearCache();
  },
  'organizer-events': () => {
    // Organizer events are part of sharedEventService
    sharedEventService.clearCache();
  },
};

/**
 * Default configuration
 */
const defaultConfig: InvalidationConfig = {
  logging: process.env.NODE_ENV === 'development',
  delayMs: 0,
};

/**
 * Invalidate specific caches
 * 
 * @param keys - Cache keys to invalidate
 * @param config - Optional configuration
 * 
 * @example
 * // Invalidate events and homepage caches
 * invalidateCaches('events', 'homepage');
 * 
 * @example
 * // Invalidate all caches with logging
 * invalidateCaches('all', { logging: true });
 */
export function invalidateCaches(
  ...args: [...CacheKey[]] | [...CacheKey[], InvalidationConfig]
): void {
  // Extract config if provided as last argument
  let keys: CacheKey[];
  let config: InvalidationConfig = { ...defaultConfig };
  
  const lastArg = args[args.length - 1];
  if (typeof lastArg === 'object' && lastArg !== null && !Array.isArray(lastArg) && 
      ('logging' in lastArg || 'delayMs' in lastArg)) {
    keys = args.slice(0, -1) as CacheKey[];
    config = { ...defaultConfig, ...lastArg };
  } else {
    keys = args as CacheKey[];
  }
  
  const doInvalidate = () => {
    // Handle 'all' key
    if (keys.includes('all')) {
      if (config.logging) {
        console.log('[CacheInvalidation] Clearing all caches');
      }
      Object.entries(cacheInvalidators).forEach(([key, invalidator]) => {
        try {
          invalidator();
          if (config.logging) {
            console.log(`[CacheInvalidation] Cleared: ${key}`);
          }
        } catch (error) {
          console.error(`[CacheInvalidation] Failed to clear ${key}:`, error);
        }
      });
      return;
    }
    
    // Handle specific keys
    keys.forEach(key => {
      const invalidator = cacheInvalidators[key as Exclude<CacheKey, 'all'>];
      if (invalidator) {
        try {
          invalidator();
          if (config.logging) {
            console.log(`[CacheInvalidation] Cleared: ${key}`);
          }
        } catch (error) {
          console.error(`[CacheInvalidation] Failed to clear ${key}:`, error);
        }
      } else {
        console.warn(`[CacheInvalidation] Unknown cache key: ${key}`);
      }
    });
  };
  
  // Apply delay if configured
  if (config.delayMs && config.delayMs > 0) {
    setTimeout(doInvalidate, config.delayMs);
  } else {
    doInvalidate();
  }
}

/**
 * Wrap a mutation function with automatic cache invalidation
 * 
 * @param mutation - Async function that performs a mutation
 * @param cacheKeys - Cache keys to invalidate after successful mutation
 * @returns The result of the mutation
 * 
 * @example
 * const result = await withCacheInvalidation(
 *   () => eventService.createEvent(eventData),
 *   ['events', 'homepage', 'search']
 * );
 */
export async function withCacheInvalidation<T>(
  mutation: () => Promise<T>,
  cacheKeys: CacheKey[],
  config?: InvalidationConfig
): Promise<T> {
  const result = await mutation();
  invalidateCaches(...cacheKeys, config || {});
  return result;
}

/**
 * Invalidate caches related to event mutations
 * Convenience function for common event-related cache invalidation
 */
export function invalidateEventCaches(): void {
  invalidateCaches('events', 'homepage', 'search', 'event-details');
}

/**
 * Invalidate caches related to organizer mutations
 */
export function invalidateOrganizerCaches(): void {
  invalidateCaches('organizers', 'organizer-events');
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats(): Record<string, unknown> {
  return {
    search: searchService.getCacheStats(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Cache invalidation triggers for specific operations
 * Maps operation types to the caches they should invalidate
 */
export const CACHE_INVALIDATION_MAP = {
  // Event operations
  'event:create': ['events', 'homepage', 'search', 'organizer-events'] as CacheKey[],
  'event:update': ['events', 'homepage', 'search', 'event-details', 'organizer-events'] as CacheKey[],
  'event:delete': ['events', 'homepage', 'search', 'event-details', 'organizer-events'] as CacheKey[],
  'event:publish': ['events', 'homepage', 'search', 'event-details'] as CacheKey[],
  'event:unpublish': ['events', 'homepage', 'search', 'event-details'] as CacheKey[],
  
  // Lock operations
  'lock:add': ['lock-counts', 'events'] as CacheKey[],
  'lock:remove': ['lock-counts', 'events'] as CacheKey[],
  
  // Organizer operations
  'organizer:create': ['organizers'] as CacheKey[],
  'organizer:update': ['organizers', 'organizer-events'] as CacheKey[],
  
  // Bulk operations
  'bulk:refresh': ['all'] as CacheKey[],
} as const;

/**
 * Invalidate caches for a specific operation
 * 
 * @example
 * invalidateForOperation('event:create');
 */
export function invalidateForOperation(
  operation: keyof typeof CACHE_INVALIDATION_MAP,
  config?: InvalidationConfig
): void {
  const cacheKeys = CACHE_INVALIDATION_MAP[operation];
  if (cacheKeys) {
    invalidateCaches(...cacheKeys, config || {});
  }
}
