/**
 * Cache Metrics Utility
 * =====================
 * 
 * Tracks cache performance metrics including hit rates, miss rates,
 * and eviction events. Useful for debugging and optimization.
 * 
 * @module cacheMetrics
 * @version 1.0.0
 */

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  lastAccess: number;
  totalRequests: number;
}

interface CacheMetricsData {
  caches: Map<string, CacheStats>;
  startTime: number;
}

// Singleton metrics store
const metricsData: CacheMetricsData = {
  caches: new Map(),
  startTime: Date.now()
};

/**
 * Record a cache hit
 */
export function recordCacheHit(cacheName: string): void {
  const stats = getOrCreateStats(cacheName);
  stats.hits++;
  stats.totalRequests++;
  stats.lastAccess = Date.now();
}

/**
 * Record a cache miss
 */
export function recordCacheMiss(cacheName: string): void {
  const stats = getOrCreateStats(cacheName);
  stats.misses++;
  stats.totalRequests++;
  stats.lastAccess = Date.now();
}

/**
 * Record a cache eviction
 */
export function recordCacheEviction(cacheName: string): void {
  const stats = getOrCreateStats(cacheName);
  stats.evictions++;
}

/**
 * Get or create stats for a cache
 */
function getOrCreateStats(cacheName: string): CacheStats {
  let stats = metricsData.caches.get(cacheName);
  if (!stats) {
    stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      lastAccess: 0,
      totalRequests: 0
    };
    metricsData.caches.set(cacheName, stats);
  }
  return stats;
}

/**
 * Calculate hit rate for a cache
 */
export function getHitRate(cacheName: string): number {
  const stats = metricsData.caches.get(cacheName);
  if (!stats || stats.totalRequests === 0) {
    return 0;
  }
  return (stats.hits / stats.totalRequests) * 100;
}

/**
 * Get all cache metrics
 */
export function getAllMetrics(): Record<string, {
  hits: number;
  misses: number;
  evictions: number;
  hitRate: string;
  totalRequests: number;
  lastAccess: string;
}> {
  const result: Record<string, any> = {};
  
  metricsData.caches.forEach((stats, cacheName) => {
    const hitRate = stats.totalRequests > 0 
      ? ((stats.hits / stats.totalRequests) * 100).toFixed(1)
      : '0.0';
      
    result[cacheName] = {
      hits: stats.hits,
      misses: stats.misses,
      evictions: stats.evictions,
      hitRate: `${hitRate}%`,
      totalRequests: stats.totalRequests,
      lastAccess: stats.lastAccess > 0 
        ? new Date(stats.lastAccess).toISOString()
        : 'never'
    };
  });
  
  return result;
}

/**
 * Get summary of all caches
 */
export function getMetricsSummary(): {
  totalHits: number;
  totalMisses: number;
  totalEvictions: number;
  overallHitRate: string;
  uptimeMs: number;
  cacheCount: number;
} {
  let totalHits = 0;
  let totalMisses = 0;
  let totalEvictions = 0;
  
  metricsData.caches.forEach(stats => {
    totalHits += stats.hits;
    totalMisses += stats.misses;
    totalEvictions += stats.evictions;
  });
  
  const totalRequests = totalHits + totalMisses;
  const hitRate = totalRequests > 0 
    ? ((totalHits / totalRequests) * 100).toFixed(1)
    : '0.0';
  
  return {
    totalHits,
    totalMisses,
    totalEvictions,
    overallHitRate: `${hitRate}%`,
    uptimeMs: Date.now() - metricsData.startTime,
    cacheCount: metricsData.caches.size
  };
}

/**
 * Reset metrics (for testing)
 */
export function resetMetrics(): void {
  metricsData.caches.clear();
  metricsData.startTime = Date.now();
}

/**
 * Log metrics to console (for debugging)
 */
export function logMetrics(): void {
  const summary = getMetricsSummary();
  const allMetrics = getAllMetrics();
  
  console.group('📊 Cache Metrics');
  console.log('Summary:', summary);
  console.log('Per-cache breakdown:');
  Object.entries(allMetrics).forEach(([name, stats]) => {
    console.log(`  ${name}:`, stats);
  });
  console.groupEnd();
}

/**
 * Create a wrapper that tracks cache access
 */
export function withCacheMetrics<T>(
  cacheName: string,
  cacheGetter: () => T | null | undefined,
  fallback: () => Promise<T>
): () => Promise<T> {
  return async () => {
    const cached = cacheGetter();
    
    if (cached !== null && cached !== undefined) {
      recordCacheHit(cacheName);
      return cached;
    }
    
    recordCacheMiss(cacheName);
    return fallback();
  };
}

/**
 * Export metrics data for external analysis
 */
export function exportMetrics(): string {
  return JSON.stringify({
    summary: getMetricsSummary(),
    caches: getAllMetrics(),
    exportedAt: new Date().toISOString()
  }, null, 2);
}

// Development-only: expose metrics globally for debugging
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__cacheMetrics = {
    getAllMetrics,
    getMetricsSummary,
    logMetrics,
    exportMetrics,
    resetMetrics
  };
}

export default {
  recordCacheHit,
  recordCacheMiss,
  recordCacheEviction,
  getHitRate,
  getAllMetrics,
  getMetricsSummary,
  resetMetrics,
  logMetrics,
  withCacheMetrics,
  exportMetrics
};
