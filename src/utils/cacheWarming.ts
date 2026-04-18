/**
 * Cache Warming Utility
 * =====================
 * 
 * Pre-fetches and warms up caches to improve initial page load performance.
 * Runs after app initialization or user login to prepare frequently accessed data.
 * 
 * @module cacheWarming
 * @version 1.0.0
 */

import { sharedEventService } from '@/services/sharedEventService';

// Track warming state to prevent duplicate warm-ups
let isWarming = false;
let lastWarmTime = 0;
const MIN_WARM_INTERVAL = 60 * 1000; // Minimum 1 minute between warm-ups
const WARM_TASK_TIMEOUT_MS = 12000;

// Track cache warming metrics
interface WarmingMetrics {
  startTime: number;
  endTime: number;
  warmedCaches: string[];
  errors: string[];
  duration: number;
}

let lastWarmingMetrics: WarmingMetrics | null = null;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

/**
 * Warm homepage caches in the background
 * This pre-fetches data that will be needed on the homepage
 */
export async function warmHomepageCaches(userId?: string): Promise<WarmingMetrics> {
  // Prevent duplicate warm-ups
  if (isWarming) {
    console.log('[CacheWarming] Already warming, skipping...');
    return lastWarmingMetrics || {
      startTime: Date.now(),
      endTime: Date.now(),
      warmedCaches: [],
      errors: ['Already warming'],
      duration: 0
    };
  }

  // Throttle warm-ups
  const now = Date.now();
  if (now - lastWarmTime < MIN_WARM_INTERVAL) {
    console.log('[CacheWarming] Throttled, too soon since last warm-up');
    return lastWarmingMetrics || {
      startTime: now,
      endTime: now,
      warmedCaches: [],
      errors: ['Throttled'],
      duration: 0
    };
  }

  isWarming = true;
  lastWarmTime = now;

  const metrics: WarmingMetrics = {
    startTime: now,
    endTime: 0,
    warmedCaches: [],
    errors: [],
    duration: 0
  };

  console.log('[CacheWarming] Starting homepage cache warm-up...');

  try {
    // Use Promise.allSettled to continue even if some fail
    const results = await Promise.allSettled([
      // 1. Featured events (high priority - shown prominently)
      withTimeout(warmFeaturedEvents(), WARM_TASK_TIMEOUT_MS, 'featured warm-up'),
      
      // 2. Trending events
      withTimeout(warmTrendingEvents(), WARM_TASK_TIMEOUT_MS, 'trending warm-up'),
      
      // 3. Upcoming events
      withTimeout(warmUpcomingEvents(), WARM_TASK_TIMEOUT_MS, 'upcoming warm-up'),
      
      // 4. Live events (if any)
      withTimeout(warmLiveEvents(), WARM_TASK_TIMEOUT_MS, 'live warm-up'),
    ]);

    // Process results
    const cacheNames = ['featured', 'trending', 'upcoming', 'live'];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        metrics.warmedCaches.push(cacheNames[index]);
      } else {
        metrics.errors.push(`${cacheNames[index]}: ${result.reason}`);
      }
    });

  } catch (error) {
    console.error('[CacheWarming] Error during warm-up:', error);
    metrics.errors.push(String(error));
  } finally {
    isWarming = false;
    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;
    lastWarmingMetrics = metrics;

    console.log(`[CacheWarming] Completed in ${metrics.duration}ms`, {
      warmed: metrics.warmedCaches,
      errors: metrics.errors
    });
  }

  return metrics;
}

/**
 * Warm featured events cache
 */
async function warmFeaturedEvents(): Promise<void> {
  try {
    await sharedEventService.getFeaturedEvents(4);
  } catch (error) {
    console.warn('[CacheWarming] Failed to warm featured events:', error);
    throw error;
  }
}

/**
 * Warm trending events cache
 */
async function warmTrendingEvents(): Promise<void> {
  try {
    await sharedEventService.getTrendingEvents(8);
  } catch (error) {
    console.warn('[CacheWarming] Failed to warm trending events:', error);
    throw error;
  }
}

/**
 * Warm upcoming events cache
 */
async function warmUpcomingEvents(): Promise<void> {
  try {
    await sharedEventService.getUpcomingEvents(8);
  } catch (error) {
    console.warn('[CacheWarming] Failed to warm upcoming events:', error);
    throw error;
  }
}

/**
 * Warm live events cache
 */
async function warmLiveEvents(): Promise<void> {
  try {
    await sharedEventService.getLiveEvents(8);
  } catch (error) {
    console.warn('[CacheWarming] Failed to warm live events:', error);
    throw error;
  }
}

/**
 * Check if caches are warm (have valid data)
 */
export function areCachesWarm(userId?: string): boolean {
  const cachedData = sharedEventService.getCachedHomepageEvents(userId);
  return cachedData !== null;
}

/**
 * Get last warming metrics for debugging
 */
export function getLastWarmingMetrics(): WarmingMetrics | null {
  return lastWarmingMetrics;
}

/**
 * Schedule periodic cache warming (for background refresh)
 * Returns cleanup function
 */
export function schedulePeriodicWarming(
  intervalMs: number = 4 * 60 * 1000, // Default 4 minutes (before 5-min cache expires)
  userId?: string
): () => void {
  console.log(`[CacheWarming] Scheduling periodic warming every ${intervalMs / 1000}s`);
  
  const intervalId = setInterval(() => {
    // Only warm if we're not already warming and user is likely still active
    if (!document.hidden) {
      warmHomepageCaches(userId);
    }
  }, intervalMs);

  return () => {
    console.log('[CacheWarming] Stopping periodic warming');
    clearInterval(intervalId);
  };
}

/**
 * Warm caches on visibility change (when user returns to tab)
 * Returns cleanup function
 */
export function warmOnVisibilityChange(userId?: string): () => void {
  const handleVisibilityChange = () => {
    if (!document.hidden) {
      // User returned to tab - check if caches need warming
      if (!areCachesWarm(userId)) {
        console.log('[CacheWarming] User returned to tab, warming caches...');
        warmHomepageCaches(userId);
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}

/**
 * Initialize cache warming system
 * Call this on app startup
 */
export function initializeCacheWarming(options?: {
  userId?: string;
  enablePeriodicWarming?: boolean;
  enableVisibilityWarming?: boolean;
  warmOnInit?: boolean;
}): () => void {
  const {
    userId,
    enablePeriodicWarming = true,
    enableVisibilityWarming = true,
    warmOnInit = true
  } = options || {};

  const cleanups: (() => void)[] = [];

  // Initial warm-up (delayed to not block initial render)
  if (warmOnInit) {
    setTimeout(() => {
      warmHomepageCaches(userId);
    }, 1000); // 1 second delay
  }

  // Periodic warming
  if (enablePeriodicWarming) {
    cleanups.push(schedulePeriodicWarming(4 * 60 * 1000, userId));
  }

  // Visibility-based warming
  if (enableVisibilityWarming) {
    cleanups.push(warmOnVisibilityChange(userId));
  }

  // Return cleanup function
  return () => {
    cleanups.forEach(cleanup => cleanup());
  };
}

export default {
  warmHomepageCaches,
  areCachesWarm,
  getLastWarmingMetrics,
  schedulePeriodicWarming,
  warmOnVisibilityChange,
  initializeCacheWarming
};
