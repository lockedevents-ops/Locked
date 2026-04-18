/**
 * Legacy Storage Cleanup
 * ======================
 * 
 * Removes deprecated localStorage keys that are no longer used.
 * This migration runs once on app initialization and marks itself
 * as complete to avoid re-running.
 * 
 * IMPORTANT: Add new legacy keys to LEGACY_STORAGE_KEYS when deprecating
 * localStorage-based features in favor of database storage.
 * 
 * @module utils/cleanupLegacyStorage
 * @version 1.0.0
 */

/**
 * Keys that should be removed from localStorage
 * These are either:
 * - Mock data keys (replaced by Supabase)
 * - Legacy auth keys (replaced by Supabase Auth)
 * - Deprecated feature keys
 */
export const LEGACY_STORAGE_KEYS = [
  // Mock data keys (replaced by Supabase)
  'events',                    // Old events array - now in Supabase events table
  'venues',                    // Mock venues - now in Supabase venues table
  'venue-bookings',            // Mock booking data
  'event-attendees',           // Generated mock attendees - use event_registrations table
  'temp_users',                // Temporary user storage - use profiles table
  'flagged_content',           // Mock flagged content - use content_flags table
  'user_profiles',             // Mock profiles - use Supabase profiles table
  'notification_settings',     // Mock settings - use user_settings table
  'team_members',              // Mock team data - use team_members table
  'privacy_settings',          // Mock privacy - use user_settings table
  'account_preferences',       // Mock preferences - use user_settings table
  
  // Legacy auth keys
  'admin-auth-storage',        // Deprecated admin auth - use Supabase Auth
  
  // Deprecated feature keys
  'locked:event-taxonomy:v1',  // Old taxonomy version
  'activity_migration_logged', // One-time flag
  'organizers',                // Old organizers array
  'users',                     // Old users storage
  'roles',                     // Old roles storage
  'role_requests',             // Old role requests
  'role_requests_legacy',      // Legacy role requests
  
  // Old cache keys (replaced by service caches)
  'search-cache',              // Old search cache
  'event-cache',               // Old event cache
];

/**
 * Keys that match a prefix pattern and should be cleaned up
 * These patterns will match keys that start with the given prefix
 */
export const LEGACY_KEY_PREFIXES = [
  'old_',                      // Any key starting with old_
  'deprecated_',               // Any deprecated keys
  'mock_',                     // Mock data prefixes
];

/**
 * Migration version key - used to track if cleanup has run
 */
const CLEANUP_VERSION_KEY = 'locked:legacy-cleanup:version';
const CURRENT_CLEANUP_VERSION = 1;

/**
 * Result of cleanup operation
 */
interface CleanupResult {
  removedKeys: string[];
  skippedKeys: string[];
  errors: Array<{ key: string; error: string }>;
  version: number;
  timestamp: string;
}

/**
 * Check if legacy cleanup has already been performed
 */
export function hasCleanupRun(): boolean {
  if (typeof window === 'undefined') return true;
  
  try {
    const version = localStorage.getItem(CLEANUP_VERSION_KEY);
    return version !== null && parseInt(version, 10) >= CURRENT_CLEANUP_VERSION;
  } catch {
    return false;
  }
}

/**
 * Get all localStorage keys that should be removed
 * Includes both exact matches and prefix matches
 */
export function getLegacyKeys(): string[] {
  if (typeof window === 'undefined') return [];
  
  const keysToRemove: string[] = [];
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      // Check exact matches
      if (LEGACY_STORAGE_KEYS.includes(key)) {
        keysToRemove.push(key);
        continue;
      }
      
      // Check prefix matches
      if (LEGACY_KEY_PREFIXES.some(prefix => key.startsWith(prefix))) {
        keysToRemove.push(key);
        continue;
      }
    }
  } catch (error) {
    console.error('[LegacyCleanup] Error scanning keys:', error);
  }
  
  return keysToRemove;
}

/**
 * Preview what would be cleaned up without actually removing anything
 * Useful for debugging
 */
export function previewCleanup(): { keysToRemove: string[]; totalSize: number } {
  if (typeof window === 'undefined') {
    return { keysToRemove: [], totalSize: 0 };
  }
  
  const keysToRemove = getLegacyKeys();
  let totalSize = 0;
  
  keysToRemove.forEach(key => {
    try {
      const value = localStorage.getItem(key);
      if (value) {
        totalSize += key.length + value.length;
      }
    } catch {}
  });
  
  return {
    keysToRemove,
    totalSize: totalSize * 2, // UTF-16 encoding
  };
}

/**
 * Run legacy storage cleanup
 * Removes all deprecated localStorage keys
 * 
 * @param force - Force cleanup even if it has already run
 * @returns Cleanup result with details of what was removed
 */
export function cleanupLegacyStorage(force: boolean = false): CleanupResult {
  const result: CleanupResult = {
    removedKeys: [],
    skippedKeys: [],
    errors: [],
    version: CURRENT_CLEANUP_VERSION,
    timestamp: new Date().toISOString(),
  };
  
  if (typeof window === 'undefined') {
    return result;
  }
  
  // Check if cleanup has already run (unless forced)
  if (!force && hasCleanupRun()) {
    console.log('[LegacyCleanup] Already run, skipping');
    return result;
  }
  
  const keysToRemove = getLegacyKeys();
  
  keysToRemove.forEach(key => {
    try {
      // Check if key still exists (might have been removed by another process)
      if (localStorage.getItem(key) === null) {
        result.skippedKeys.push(key);
        return;
      }
      
      localStorage.removeItem(key);
      result.removedKeys.push(key);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[LegacyCleanup] Removed: ${key}`);
      }
    } catch (error) {
      result.errors.push({
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
  
  // Mark cleanup as complete
  try {
    localStorage.setItem(CLEANUP_VERSION_KEY, String(CURRENT_CLEANUP_VERSION));
  } catch {}
  
  // Log summary
  if (result.removedKeys.length > 0) {
    console.log(
      `[LegacyCleanup] Completed: ${result.removedKeys.length} keys removed, ` +
      `${result.skippedKeys.length} skipped, ${result.errors.length} errors`
    );
  }
  
  return result;
}

/**
 * Reset cleanup status (for testing)
 * This will cause cleanup to run again on next app init
 */
export function resetCleanupStatus(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(CLEANUP_VERSION_KEY);
  } catch {}
}

/**
 * Get cleanup statistics
 */
export function getCleanupStats(): {
  hasRun: boolean;
  version: number | null;
  legacyKeysFound: number;
  estimatedSavings: number;
} {
  if (typeof window === 'undefined') {
    return { hasRun: true, version: null, legacyKeysFound: 0, estimatedSavings: 0 };
  }
  
  const preview = previewCleanup();
  let version: number | null = null;
  
  try {
    const versionStr = localStorage.getItem(CLEANUP_VERSION_KEY);
    if (versionStr) {
      version = parseInt(versionStr, 10);
    }
  } catch {}
  
  return {
    hasRun: hasCleanupRun(),
    version,
    legacyKeysFound: preview.keysToRemove.length,
    estimatedSavings: preview.totalSize,
  };
}
