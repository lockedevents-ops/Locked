/**
 * Storage Debug Utility
 * =====================
 * 
 * Development-only utility for debugging localStorage usage,
 * cache states, and storage health. Provides visibility into
 * what's stored and helps identify bloat.
 * 
 * @module storageDebug
 * @version 1.0.0
 */

import { getAllMetrics, getMetricsSummary, logMetrics } from './cacheMetrics';
import { getLastWarmingMetrics, areCachesWarm } from './cacheWarming';

interface StorageItem {
  key: string;
  size: number;
  sizeFormatted: string;
  type: 'auth' | 'draft' | 'cache' | 'settings' | 'legacy' | 'unknown';
  hasExpiry: boolean;
  isExpired: boolean;
  preview: string;
}

interface StorageAnalysis {
  totalItems: number;
  totalSize: number;
  totalSizeFormatted: string;
  byType: Record<string, { count: number; size: number }>;
  items: StorageItem[];
  largestItems: StorageItem[];
  expiredItems: StorageItem[];
  legacyItems: StorageItem[];
}

// Known key patterns for categorization
const KEY_PATTERNS: [RegExp, StorageItem['type']][] = [
  [/^auth-storage|^admin-auth-storage/, 'auth'],
  [/^locked:(event-creator|event-editor|settings):draft/, 'draft'],
  [/^locked:cache:|^avatar_signed_url_/, 'cache'],
  [/^user-preferences|^admin-theme|^help-chat/, 'settings'],
  [/^events$|^venues$|^venue-bookings|^event-attendees|^temp_users|^flagged_content|^user_profiles$|^notification_settings$|^team_members$|^privacy_settings$|^account_preferences$/, 'legacy'],
];

/**
 * Format bytes to human readable size
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Get size of a string in bytes
 */
function getStringSize(str: string): number {
  return new Blob([str]).size;
}

/**
 * Categorize a key by its pattern
 */
function categorizeKey(key: string): StorageItem['type'] {
  for (const [pattern, type] of KEY_PATTERNS) {
    if (pattern.test(key)) {
      return type;
    }
  }
  return 'unknown';
}

/**
 * Check if an item has expiry and if it's expired
 */
function checkExpiry(value: string): { hasExpiry: boolean; isExpired: boolean } {
  try {
    const parsed = JSON.parse(value);
    
    // Check common expiry patterns
    if (parsed.expiry && typeof parsed.expiry === 'number') {
      return { hasExpiry: true, isExpired: Date.now() > parsed.expiry };
    }
    if (parsed.expiresAt && typeof parsed.expiresAt === 'number') {
      return { hasExpiry: true, isExpired: Date.now() > parsed.expiresAt };
    }
    if (parsed.ttl && parsed.timestamp) {
      const expiry = parsed.timestamp + parsed.ttl;
      return { hasExpiry: true, isExpired: Date.now() > expiry };
    }
    if (parsed.state?.lastUpdated && parsed.version) {
      // Zustand store - check for staleness (24h)
      const staleThreshold = 24 * 60 * 60 * 1000;
      const isStale = Date.now() - parsed.state.lastUpdated > staleThreshold;
      return { hasExpiry: false, isExpired: isStale };
    }
    
    return { hasExpiry: false, isExpired: false };
  } catch {
    return { hasExpiry: false, isExpired: false };
  }
}

/**
 * Get a preview of the value (truncated)
 */
function getPreview(value: string, maxLength: number = 100): string {
  try {
    const parsed = JSON.parse(value);
    const preview = JSON.stringify(parsed).substring(0, maxLength);
    return preview.length < JSON.stringify(parsed).length 
      ? preview + '...' 
      : preview;
  } catch {
    return value.substring(0, maxLength) + (value.length > maxLength ? '...' : '');
  }
}

/**
 * Analyze localStorage usage
 */
export function analyzeStorage(): StorageAnalysis {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      totalItems: 0,
      totalSize: 0,
      totalSizeFormatted: '0 B',
      byType: {},
      items: [],
      largestItems: [],
      expiredItems: [],
      legacyItems: []
    };
  }

  const items: StorageItem[] = [];
  const byType: Record<string, { count: number; size: number }> = {};
  let totalSize = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    const value = localStorage.getItem(key) || '';
    const size = getStringSize(key) + getStringSize(value);
    const type = categorizeKey(key);
    const { hasExpiry, isExpired } = checkExpiry(value);

    totalSize += size;

    // Update by-type stats
    if (!byType[type]) {
      byType[type] = { count: 0, size: 0 };
    }
    byType[type].count++;
    byType[type].size += size;

    items.push({
      key,
      size,
      sizeFormatted: formatBytes(size),
      type,
      hasExpiry,
      isExpired,
      preview: getPreview(value)
    });
  }

  // Sort by size for largest items
  const largestItems = [...items].sort((a, b) => b.size - a.size).slice(0, 10);
  
  // Filter expired and legacy items
  const expiredItems = items.filter(item => item.isExpired);
  const legacyItems = items.filter(item => item.type === 'legacy');

  return {
    totalItems: items.length,
    totalSize,
    totalSizeFormatted: formatBytes(totalSize),
    byType,
    items,
    largestItems,
    expiredItems,
    legacyItems
  };
}

/**
 * Get storage health status
 */
export function getStorageHealth(): {
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  recommendations: string[];
} {
  const analysis = analyzeStorage();
  const recommendations: string[] = [];
  
  // Check total size (warning at 2MB, critical at 4MB)
  const sizeMB = analysis.totalSize / (1024 * 1024);
  
  // Check for expired items
  if (analysis.expiredItems.length > 0) {
    recommendations.push(`Remove ${analysis.expiredItems.length} expired items`);
  }
  
  // Check for legacy items
  if (analysis.legacyItems.length > 0) {
    recommendations.push(`Clean up ${analysis.legacyItems.length} legacy items`);
  }
  
  // Check for items without expiry
  const noExpiryItems = analysis.items.filter(i => !i.hasExpiry && i.type !== 'auth' && i.type !== 'settings');
  if (noExpiryItems.length > 5) {
    recommendations.push(`${noExpiryItems.length} items have no expiry - consider adding TTL`);
  }

  if (sizeMB > 4 || analysis.legacyItems.length > 10) {
    return {
      status: 'critical',
      message: `Storage usage is high: ${analysis.totalSizeFormatted}`,
      recommendations
    };
  }
  
  if (sizeMB > 2 || analysis.expiredItems.length > 5) {
    return {
      status: 'warning',
      message: `Storage could be optimized: ${analysis.totalSizeFormatted}`,
      recommendations
    };
  }
  
  return {
    status: 'healthy',
    message: `Storage is healthy: ${analysis.totalSizeFormatted}`,
    recommendations
  };
}

/**
 * Log storage analysis to console
 */
export function logStorageAnalysis(): void {
  const analysis = analyzeStorage();
  const health = getStorageHealth();
  
  const statusEmoji = {
    healthy: '✅',
    warning: '⚠️',
    critical: '🔴'
  };
  
  console.group(`${statusEmoji[health.status]} Storage Analysis`);
  console.log('Health:', health.message);
  
  if (health.recommendations.length > 0) {
    console.log('Recommendations:', health.recommendations);
  }
  
  console.log(`Total: ${analysis.totalItems} items, ${analysis.totalSizeFormatted}`);
  
  console.group('By Type:');
  Object.entries(analysis.byType).forEach(([type, stats]) => {
    console.log(`  ${type}: ${stats.count} items, ${formatBytes(stats.size)}`);
  });
  console.groupEnd();
  
  console.group('Largest Items (top 10):');
  analysis.largestItems.forEach(item => {
    console.log(`  ${item.key}: ${item.sizeFormatted} (${item.type})`);
  });
  console.groupEnd();
  
  if (analysis.expiredItems.length > 0) {
    console.group(`Expired Items (${analysis.expiredItems.length}):`);
    analysis.expiredItems.forEach(item => {
      console.log(`  ${item.key}: ${item.sizeFormatted}`);
    });
    console.groupEnd();
  }
  
  if (analysis.legacyItems.length > 0) {
    console.group(`Legacy Items (${analysis.legacyItems.length}):`);
    analysis.legacyItems.forEach(item => {
      console.log(`  ${item.key}: ${item.sizeFormatted}`);
    });
    console.groupEnd();
  }
  
  console.groupEnd();
}

/**
 * Get full debug dashboard data
 */
export function getDebugDashboard(): {
  storage: StorageAnalysis;
  health: ReturnType<typeof getStorageHealth>;
  cacheMetrics: ReturnType<typeof getAllMetrics>;
  cacheSummary: ReturnType<typeof getMetricsSummary>;
  cacheWarming: {
    isWarm: boolean;
    lastMetrics: ReturnType<typeof getLastWarmingMetrics>;
  };
} {
  return {
    storage: analyzeStorage(),
    health: getStorageHealth(),
    cacheMetrics: getAllMetrics(),
    cacheSummary: getMetricsSummary(),
    cacheWarming: {
      isWarm: areCachesWarm(),
      lastMetrics: getLastWarmingMetrics()
    }
  };
}

/**
 * Log full debug dashboard to console
 */
export function logDebugDashboard(): void {
  console.group('🔧 Debug Dashboard');
  
  // Storage analysis
  logStorageAnalysis();
  
  // Cache metrics
  logMetrics();
  
  // Cache warming status
  const warmingMetrics = getLastWarmingMetrics();
  console.group('🔥 Cache Warming');
  console.log('Caches warm:', areCachesWarm());
  if (warmingMetrics) {
    console.log('Last warm-up:', {
      duration: `${warmingMetrics.duration}ms`,
      warmed: warmingMetrics.warmedCaches,
      errors: warmingMetrics.errors
    });
  }
  console.groupEnd();
  
  console.groupEnd();
}

/**
 * Clean up expired and legacy items
 */
export function cleanupStorage(): { removed: string[]; freedBytes: number } {
  const analysis = analyzeStorage();
  const removed: string[] = [];
  let freedBytes = 0;

  // Remove expired items
  analysis.expiredItems.forEach(item => {
    try {
      localStorage.removeItem(item.key);
      removed.push(item.key);
      freedBytes += item.size;
    } catch (e) {
      console.warn(`Failed to remove ${item.key}:`, e);
    }
  });

  // Remove legacy items
  analysis.legacyItems.forEach(item => {
    try {
      localStorage.removeItem(item.key);
      removed.push(item.key);
      freedBytes += item.size;
    } catch (e) {
      console.warn(`Failed to remove ${item.key}:`, e);
    }
  });

  console.log(`[StorageDebug] Cleaned up ${removed.length} items, freed ${formatBytes(freedBytes)}`);
  return { removed, freedBytes };
}

// Development-only: expose debug functions globally
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__storageDebug = {
    analyze: analyzeStorage,
    health: getStorageHealth,
    log: logStorageAnalysis,
    dashboard: getDebugDashboard,
    logDashboard: logDebugDashboard,
    cleanup: cleanupStorage
  };
  
  console.log('💡 Storage debug available: window.__storageDebug.log()');
}

export default {
  analyzeStorage,
  getStorageHealth,
  logStorageAnalysis,
  getDebugDashboard,
  logDebugDashboard,
  cleanupStorage
};
