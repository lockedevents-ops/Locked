/**
 * StorageManager - Centralized localStorage Management
 * --------------------------------------------------------------
 * Provides TTL-based storage, quota management, automatic cleanup,
 * and version control for all localStorage operations.
 * 
 * Features:
 * - TTL (Time-To-Live) support for automatic expiration
 * - Version control for data migrations
 * - Quota monitoring and management
 * - Automatic cleanup of expired items
 * - Error-safe operations with corruption recovery
 * 
 * @module utils/storageManager
 */

// Storage item wrapper with metadata
interface StorageItem<T> {
  value: T;
  expiry: number | null; // null = no expiry
  version: number;
  createdAt: number;
}

// Storage usage statistics
export interface StorageUsage {
  used: number;
  total: number;
  percentage: number;
  itemCount: number;
}

// Predefined TTL values (in milliseconds)
export const STORAGE_TTL = {
  // Critical - no TTL (session-based)
  AUTH: null as null,
  
  // Short-lived (minutes)
  SEARCH_CACHE: 2 * 60 * 1000,        // 2 minutes
  LOCK_COUNTS: 30 * 1000,              // 30 seconds
  
  // Medium-lived (minutes to hours)
  EVENT_CACHE: 5 * 60 * 1000,          // 5 minutes
  ORGANIZER_CACHE: 5 * 60 * 1000,      // 5 minutes
  ANALYTICS: 3 * 60 * 1000,            // 3 minutes
  AVATAR_URL: 60 * 60 * 1000,          // 1 hour
  
  // Long-lived (hours)
  SETTINGS_DRAFT: 12 * 60 * 60 * 1000, // 12 hours
  EVENT_DRAFT: 24 * 60 * 60 * 1000,    // 24 hours
  
  // Very long-lived (days)
  RECENTLY_VIEWED: 7 * 24 * 60 * 60 * 1000, // 7 days
  USER_PREFERENCES: 30 * 24 * 60 * 60 * 1000, // 30 days
  
  // Persistent
  THEME: null as null, // Never expires
} as const;

// Storage keys that should be managed by StorageManager
export const MANAGED_STORAGE_KEYS = {
  // Drafts
  EVENT_CREATOR_DRAFT: 'locked:event-creator:draft',
  EVENT_EDITOR_DRAFT_PREFIX: 'locked:event-editor:draft:',
  SETTINGS_DRAFT_PREFIX: 'locked:settings:draft:',
  
  // User data
  USER_PREFERENCES_PREFIX: 'user-preferences-',
  LOCKED_EVENTS_PREFIX: 'locked-events-',
  RECENTLY_VIEWED_EVENTS: 'recently-viewed-events',
  RECENTLY_VIEWED_VENUES: 'recently-viewed-venues',
  FOLLOWED_ORGANIZERS: 'followed-organizers',
  
  // UI state
  ADMIN_THEME: 'admin-theme',
  VENUES_VIEW_MODE: 'venuesViewMode',
  DRAFT_VENUES_VIEW_MODE: 'draftVenuesViewMode',
  HELP_CHAT_ANCHOR: 'help-chat-anchor-side',
  AVATAR_URL_PREFIX: 'avatar_signed_url_',
  
  // System
  STORAGE_VERSION: 'locked:storage:version',
  CLEANUP_TIMESTAMP: 'locked:storage:last-cleanup',
} as const;

class StorageManager {
  private readonly VERSION = 2; // Increment when storage structure changes
  private readonly ESTIMATED_QUOTA = 5 * 1024 * 1024; // 5MB (conservative estimate)
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

  /**
   * Get a value from storage with automatic expiry checking
   */
  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      
      // Try to parse as managed item first
      const item = JSON.parse(raw) as StorageItem<T>;
      
      // Check if it's a managed item (has our metadata structure)
      if (this.isManagedItem(item)) {
        // Check version compatibility
        if (item.version !== this.VERSION) {
          console.warn(`[StorageManager] Version mismatch for ${key}, clearing`);
          this.remove(key);
          return null;
        }
        
        // Check expiry
        if (item.expiry && Date.now() > item.expiry) {
          console.log(`[StorageManager] Item expired: ${key}`);
          this.remove(key);
          return null;
        }
        
        return item.value;
      }
      
      // If not a managed item, return raw parsed value
      // This handles legacy data that wasn't stored via StorageManager
      return item as unknown as T;
    } catch (error) {
      console.warn(`[StorageManager] Failed to read ${key}:`, error);
      // Clear corrupted data
      this.remove(key);
      return null;
    }
  }

  /**
   * Set a value in storage with optional TTL
   * @param key Storage key
   * @param value Value to store
   * @param ttl Time-to-live in milliseconds (null for no expiry)
   * @returns true if successful, false if failed
   */
  set<T>(key: string, value: T, ttl?: number | null): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      const serialized = JSON.stringify(value);
      const estimatedSize = serialized.length * 2; // UTF-16 characters
      
      // Check quota before write
      if (!this.hasQuota(estimatedSize)) {
        console.warn(`[StorageManager] Quota check failed for ${key}, attempting cleanup`);
        this.cleanup(); // Try to free space
        
        if (!this.hasQuota(estimatedSize)) {
          console.error(`[StorageManager] Quota exceeded for ${key}`);
          return false;
        }
      }
      
      const item: StorageItem<T> = {
        value,
        expiry: ttl ? Date.now() + ttl : null,
        version: this.VERSION,
        createdAt: Date.now(),
      };
      
      localStorage.setItem(key, JSON.stringify(item));
      return true;
    } catch (error) {
      console.error(`[StorageManager] Failed to write ${key}:`, error);
      
      // If quota error, try cleanup and retry once
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.cleanup();
        try {
          const item: StorageItem<T> = {
            value,
            expiry: ttl ? Date.now() + ttl : null,
            version: this.VERSION,
            createdAt: Date.now(),
          };
          localStorage.setItem(key, JSON.stringify(item));
          return true;
        } catch {
          return false;
        }
      }
      
      return false;
    }
  }

  /**
   * Remove an item from storage
   */
  remove(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`[StorageManager] Failed to remove ${key}:`, error);
    }
  }

  /**
   * Check if an item exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clean up expired items and return count of items removed
   */
  cleanup(): number {
    if (typeof window === 'undefined') return 0;
    
    let freedCount = 0;
    const keysToRemove: string[] = [];
    const now = Date.now();
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        
        const item = JSON.parse(raw);
        
        // Only process managed items
        if (this.isManagedItem(item)) {
          // Remove expired items
          if (item.expiry && now > item.expiry) {
            keysToRemove.push(key);
            continue;
          }
          
          // Remove items with old versions
          if (item.version !== this.VERSION) {
            keysToRemove.push(key);
            continue;
          }
        }
      } catch {
        // Skip items that fail to parse (might be from other apps)
      }
    }
    
    keysToRemove.forEach(key => {
      this.remove(key);
      freedCount++;
      console.log(`[StorageManager] Cleaned up: ${key}`);
    });
    
    // Record cleanup timestamp
    try {
      localStorage.setItem(MANAGED_STORAGE_KEYS.CLEANUP_TIMESTAMP, String(now));
    } catch {}
    
    return freedCount;
  }

  /**
   * Get storage usage statistics
   */
  getUsage(): StorageUsage {
    if (typeof window === 'undefined') {
      return { used: 0, total: this.ESTIMATED_QUOTA, percentage: 0, itemCount: 0 };
    }
    
    let used = 0;
    let itemCount = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || '';
        used += (key.length + value.length) * 2; // UTF-16
        itemCount++;
      }
    }
    
    return {
      used,
      total: this.ESTIMATED_QUOTA,
      percentage: (used / this.ESTIMATED_QUOTA) * 100,
      itemCount,
    };
  }

  /**
   * Check if we have quota for a given size
   */
  hasQuota(bytes: number): boolean {
    if (typeof window === 'undefined') return false;
    
    const usage = this.getUsage();
    const available = this.ESTIMATED_QUOTA - usage.used;
    
    // Keep 10% buffer
    return bytes < (available * 0.9);
  }

  /**
   * Clear all managed storage (preserves non-managed items like auth)
   */
  clearManaged(): number {
    if (typeof window === 'undefined') return 0;
    
    let clearedCount = 0;
    const keysToRemove: string[] = [];
    
    // Collect keys with our prefixes
    const managedPrefixes = [
      'locked:',
      'user-preferences-',
      'locked-events-',
      'recently-viewed-',
      'followed-organizers',
      'avatar_signed_url_',
    ];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      // Don't clear auth storage
      if (key === 'auth-storage' || key === 'admin-auth-storage') continue;
      
      if (managedPrefixes.some(prefix => key.startsWith(prefix))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      this.remove(key);
      clearedCount++;
    });
    
    return clearedCount;
  }

  /**
   * Get all keys matching a prefix
   */
  getKeysByPrefix(prefix: string): string[] {
    if (typeof window === 'undefined') return [];
    
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keys.push(key);
      }
    }
    return keys;
  }

  /**
   * Check if last cleanup was within interval
   */
  shouldRunCleanup(): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      const lastCleanup = localStorage.getItem(MANAGED_STORAGE_KEYS.CLEANUP_TIMESTAMP);
      if (!lastCleanup) return true;
      
      const lastCleanupTime = parseInt(lastCleanup, 10);
      return Date.now() - lastCleanupTime > this.CLEANUP_INTERVAL;
    } catch {
      return true;
    }
  }

  /**
   * Check if item has our managed structure
   */
  private isManagedItem(item: unknown): item is StorageItem<unknown> {
    return (
      typeof item === 'object' &&
      item !== null &&
      'value' in item &&
      'version' in item &&
      'createdAt' in item
    );
  }

  /**
   * Debug: Log all storage contents
   */
  debug(): void {
    if (typeof window === 'undefined') return;
    
    const usage = this.getUsage();
    console.group('[StorageManager] Debug');
    console.log('Usage:', `${(usage.used / 1024).toFixed(2)}KB / ${(usage.total / 1024).toFixed(2)}KB (${usage.percentage.toFixed(1)}%)`);
    console.log('Items:', usage.itemCount);
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        
        const size = (key.length + raw.length) * 2;
        const item = JSON.parse(raw);
        const isManaged = this.isManagedItem(item);
        
        console.log(`  ${key}:`, {
          size: `${(size / 1024).toFixed(2)}KB`,
          managed: isManaged,
          expiry: isManaged && item.expiry ? new Date(item.expiry).toISOString() : 'none',
          version: isManaged ? item.version : 'n/a',
        });
      } catch {
        console.log(`  ${key}: [parse error]`);
      }
    }
    console.groupEnd();
  }
}

// Export singleton instance
export const storageManager = new StorageManager();

// Export for testing
export { StorageManager };
