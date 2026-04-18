/**
 * Storage Initialization
 * =======================
 * 
 * This module handles initialization of all storage-related systems on app load.
 * It should be called once during app bootstrap (e.g., in layout.tsx or _app.tsx).
 * 
 * Responsibilities:
 * - Initialize draft cleanup scheduler
 * - Run initial storage cleanup for expired items
 * - Remove legacy localStorage keys (one-time migration)
 * - Monitor storage quota
 * - Log storage health metrics
 * - Initialize cache warming system
 * 
 * @module storageInit
 * @version 1.2.0
 */

import { storageManager, MANAGED_STORAGE_KEYS } from './storageManager';
import { initDraftCleanup, cleanupStaleDrafts } from './draftCleanup';
import { cleanupLegacyStorage, getCleanupStats, hasCleanupRun } from './cleanupLegacyStorage';
import { initializeCacheWarming } from './cacheWarming';

// Track initialization state
let isInitialized = false;
let cleanupIntervalId: NodeJS.Timeout | null = null;
let cacheWarmingCleanup: (() => void) | null = null;

// Storage health check interval (every 5 minutes)
const HEALTH_CHECK_INTERVAL = 5 * 60 * 1000;

// Convert MANAGED_STORAGE_KEYS object values to array for checking
const MANAGED_KEY_VALUES = Object.values(MANAGED_STORAGE_KEYS);

/**
 * Storage health metrics
 */
interface StorageHealthMetrics {
  totalBytes: number;
  totalItems: number;
  timestamp: Date;
  managedItems: number;
  unmanagedItems: number;
  quotaAvailable: boolean;
}

/**
 * Get current storage health metrics
 */
export function getStorageHealth(): StorageHealthMetrics | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const usage = storageManager.getUsage();
    
    // Count managed vs unmanaged items
    let managedItems = 0;
    let unmanagedItems = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      if (MANAGED_KEY_VALUES.some((mk: string) => key.startsWith(mk))) {
        managedItems++;
      } else {
        unmanagedItems++;
      }
    }
    
    return {
      totalBytes: usage.used,
      totalItems: usage.itemCount,
      timestamp: new Date(),
      managedItems,
      unmanagedItems,
      quotaAvailable: storageManager.hasQuota(1024), // Check if we have at least 1KB free
    };
  } catch {
    return null;
  }
}

/**
 * Log storage health metrics (for debugging)
 */
function logStorageHealth(): void {
  const health = getStorageHealth();
  if (!health) return;
  
  const kbUsed = (health.totalBytes / 1024).toFixed(2);
  const percentUsed = ((health.totalBytes / (5 * 1024 * 1024)) * 100).toFixed(1);
  
  console.log(
    `[Storage Health] ${kbUsed}KB used (${percentUsed}%), ` +
    `${health.totalItems} items (${health.managedItems} managed, ${health.unmanagedItems} unmanaged), ` +
    `Quota OK: ${health.quotaAvailable}`
  );
}

/**
 * Periodic cleanup task
 * Runs cleanup on both managed storage and draft cleanup
 */
function runPeriodicCleanup(): void {
  try {
    // Clean expired items from managed storage
    const cleanedCount = storageManager.cleanup();
    if (cleanedCount > 0) {
      console.log(`[Storage] Cleaned ${cleanedCount} expired items`);
    }
    
    // Clean stale drafts (older than 7 days)
    const staleDraftMs = 7 * 24 * 60 * 60 * 1000;
    const draftCleanedCount = cleanupStaleDrafts(staleDraftMs);
    if (draftCleanedCount > 0) {
      console.log(`[Storage] Cleaned ${draftCleanedCount} stale drafts`);
    }
    
    // Log health metrics
    logStorageHealth();
  } catch (error) {
    console.error('[Storage] Periodic cleanup error:', error);
  }
}

/**
 * Handle storage quota exceeded
 * Called when storage operations fail due to quota
 */
export function handleQuotaExceeded(): void {
  console.warn('[Storage] Quota exceeded, initiating emergency cleanup');
  
  try {
    // First, clean all expired items
    storageManager.cleanup();
    
    // Clean all stale drafts (older than 24 hours in emergency)
    cleanupStaleDrafts(24 * 60 * 60 * 1000);
    
    // If still not enough space, clear non-critical caches
    if (!storageManager.hasQuota(10 * 1024)) { // Need at least 10KB
      const nonCriticalKeys = [
        'recently-viewed-events',
        'recently-viewed-venues',
        'search-history',
        'discover-filters-cache',
      ];
      
      nonCriticalKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch {}
      });
      
      console.log('[Storage] Cleared non-critical caches');
    }
    
    // Final health check
    logStorageHealth();
  } catch (error) {
    console.error('[Storage] Emergency cleanup failed:', error);
  }
}

/**
 * Clear all application storage
 * Use with caution - this will log out users and clear all preferences
 */
export function clearAllStorage(): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Get all keys first (can't iterate while modifying)
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
    
    // Clear each key
    keys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch {}
    });
    
    console.log(`[Storage] Cleared ${keys.length} items`);
  } catch (error) {
    console.error('[Storage] Clear all failed:', error);
  }
}

/**
 * Initialize storage systems
 * Should be called once during app bootstrap
 * 
 * @param options Configuration options
 * @param options.enablePeriodicCleanup Enable periodic cleanup (default: true)
 * @param options.enableLogging Enable debug logging (default: NODE_ENV === 'development')
 * @param options.enableCacheWarming Enable cache pre-warming (default: true)
 * @param options.onQuotaExceeded Custom handler for quota exceeded
 */
export function initStorage(options: {
  enablePeriodicCleanup?: boolean;
  enableLogging?: boolean;
  enableCacheWarming?: boolean;
  userId?: string;
  onQuotaExceeded?: () => void;
} = {}): void {
  // Prevent double initialization
  if (isInitialized) {
    console.warn('[Storage] Already initialized, skipping');
    return;
  }
  
  // Skip on server
  if (typeof window === 'undefined') {
    return;
  }
  
  const {
    enablePeriodicCleanup = true,
    enableLogging = process.env.NODE_ENV === 'development',
    enableCacheWarming = true,
    userId,
    onQuotaExceeded: customQuotaHandler,
  } = options;
  
  try {
    if (enableLogging) {
      console.log('[Storage] Initializing storage systems...');
    }
    
    // 1. Run legacy storage cleanup (one-time migration)
    if (!hasCleanupRun()) {
      const legacyCleanup = cleanupLegacyStorage();
      if (enableLogging && legacyCleanup.removedKeys.length > 0) {
        console.log(`[Storage] Legacy cleanup: ${legacyCleanup.removedKeys.length} deprecated keys removed`);
      }
    } else if (enableLogging) {
      const stats = getCleanupStats();
      if (stats.legacyKeysFound > 0) {
        console.log(`[Storage] ${stats.legacyKeysFound} legacy keys pending cleanup`);
      }
    }
    
    // 2. Run initial cleanup for expired items
    const initialCleanup = storageManager.cleanup();
    if (enableLogging && initialCleanup > 0) {
      console.log(`[Storage] Initial cleanup: ${initialCleanup} expired items removed`);
    }
    
    // 3. Initialize draft cleanup scheduler
    initDraftCleanup();
    
    // 4. Set up periodic health check and cleanup
    if (enablePeriodicCleanup) {
      cleanupIntervalId = setInterval(runPeriodicCleanup, HEALTH_CHECK_INTERVAL);
      if (enableLogging) {
        console.log(`[Storage] Periodic cleanup scheduled every ${HEALTH_CHECK_INTERVAL / 60000} minutes`);
      }
    }
    
    // 5. Log initial storage health
    if (enableLogging) {
      logStorageHealth();
    }
    
    // 6. Set up storage event listener for cross-tab sync
    window.addEventListener('storage', (event) => {
      if (event.key && MANAGED_KEY_VALUES.some((mk: string) => event.key?.startsWith(mk))) {
        if (enableLogging) {
          console.log(`[Storage] Cross-tab update detected: ${event.key}`);
        }
      }
    });
    
    // 7. Handle page visibility for cleanup on tab focus
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // Light cleanup when tab becomes visible
        const cleaned = storageManager.cleanup();
        if (enableLogging && cleaned > 0) {
          console.log(`[Storage] Tab focus cleanup: ${cleaned} items`);
        }
      }
    });
    
    // 8. Override quota exceeded handler if provided
    if (customQuotaHandler) {
      // Store for external use
      (window as Window & { __storageQuotaHandler?: () => void }).__storageQuotaHandler = customQuotaHandler;
    }
    
    // 9. Initialize cache warming system
    if (enableCacheWarming) {
      cacheWarmingCleanup = initializeCacheWarming({
        userId,
        enablePeriodicWarming: true,
        enableVisibilityWarming: true,
        warmOnInit: true
      });
      if (enableLogging) {
        console.log('[Storage] Cache warming initialized');
      }
    }
    
    isInitialized = true;
    
    if (enableLogging) {
      console.log('[Storage] Initialization complete');
    }
  } catch (error) {
    console.error('[Storage] Initialization failed:', error);
  }
}

/**
 * Cleanup storage systems (for testing or app shutdown)
 */
export function destroyStorage(): void {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
  if (cacheWarmingCleanup) {
    cacheWarmingCleanup();
    cacheWarmingCleanup = null;
  }
  isInitialized = false;
}

/**
 * Check if storage is initialized
 */
export function isStorageInitialized(): boolean {
  return isInitialized;
}

// Export types
export type { StorageHealthMetrics };
