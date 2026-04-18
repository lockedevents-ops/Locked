/**
 * Recently Viewed Storage Utility
 * ================================
 * 
 * Provides TTL-based storage for recently viewed items (events, venues).
 * Items automatically expire after the configured TTL (default 7 days).
 * 
 * Features:
 * - Automatic TTL enforcement on read
 * - Maximum item limit (default 20)
 * - Deduplication by ID
 * - Type-safe storage
 * 
 * @module utils/recentlyViewed
 * @version 1.0.0
 */

import { storageManager, STORAGE_TTL, MANAGED_STORAGE_KEYS } from './storageManager';

/**
 * Base interface for recently viewed items
 */
interface RecentlyViewedItem {
  id: string;
  viewedAt: number; // Timestamp when item was viewed
}

/**
 * Recently viewed event
 */
export interface RecentlyViewedEvent extends RecentlyViewedItem {
  title: string;
  date?: string;
  location?: string;
  imageUrl?: string | null;
}

/**
 * Recently viewed venue
 */
export interface RecentlyViewedVenue extends RecentlyViewedItem {
  name?: string;
  location?: string;
  imageUrl?: string | null;
}

/**
 * Configuration for recently viewed storage
 */
interface RecentlyViewedConfig {
  maxItems: number;
  ttlMs: number;
}

const DEFAULT_CONFIG: RecentlyViewedConfig = {
  maxItems: 20,
  ttlMs: STORAGE_TTL.RECENTLY_VIEWED, // 7 days
};

/**
 * Storage wrapper for recently viewed items with TTL
 */
interface RecentlyViewedStorage<T extends RecentlyViewedItem> {
  items: T[];
  updatedAt: number;
}

/**
 * Filter out expired items based on TTL
 */
function filterExpiredItems<T extends RecentlyViewedItem>(
  items: T[],
  ttlMs: number
): T[] {
  const now = Date.now();
  return items.filter(item => (now - item.viewedAt) < ttlMs);
}

/**
 * Get recently viewed events
 * Automatically filters out expired items
 */
export function getRecentlyViewedEvents(config?: Partial<RecentlyViewedConfig>): RecentlyViewedEvent[] {
  const { maxItems, ttlMs } = { ...DEFAULT_CONFIG, ...config };
  
  try {
    // Try new format first (with TTL)
    const stored = storageManager.get<RecentlyViewedStorage<RecentlyViewedEvent>>(
      MANAGED_STORAGE_KEYS.RECENTLY_VIEWED_EVENTS
    );
    
    if (stored?.items) {
      const validItems = filterExpiredItems(stored.items, ttlMs);
      return validItems.slice(0, maxItems);
    }
    
    // Fall back to legacy format (without TTL)
    if (typeof window !== 'undefined') {
      const legacyString = localStorage.getItem('recently-viewed-events');
      if (legacyString) {
        const legacyItems = JSON.parse(legacyString) as Array<{
          id: string;
          title?: string;
          date?: string;
          location?: string;
          imageUrl?: string | null;
        }>;
        
        // Migrate to new format with timestamps
        const migratedItems: RecentlyViewedEvent[] = legacyItems.map(item => ({
          ...item,
          title: item.title || 'Event',
          viewedAt: Date.now() - (24 * 60 * 60 * 1000), // Assume 1 day old
        }));
        
        // Save in new format
        saveRecentlyViewedEvents(migratedItems);
        
        // Remove legacy key
        localStorage.removeItem('recently-viewed-events');
        
        return migratedItems.slice(0, maxItems);
      }
    }
    
    return [];
  } catch (error) {
    console.error('[RecentlyViewed] Error reading events:', error);
    return [];
  }
}

/**
 * Save recently viewed events
 */
export function saveRecentlyViewedEvents(
  items: RecentlyViewedEvent[],
  config?: Partial<RecentlyViewedConfig>
): void {
  const { maxItems, ttlMs } = { ...DEFAULT_CONFIG, ...config };
  
  try {
    // Filter expired and limit items
    const validItems = filterExpiredItems(items, ttlMs).slice(0, maxItems);
    
    const storage: RecentlyViewedStorage<RecentlyViewedEvent> = {
      items: validItems,
      updatedAt: Date.now(),
    };
    
    storageManager.set(
      MANAGED_STORAGE_KEYS.RECENTLY_VIEWED_EVENTS,
      storage,
      ttlMs
    );
  } catch (error) {
    console.error('[RecentlyViewed] Error saving events:', error);
  }
}

/**
 * Add an event to recently viewed
 * Handles deduplication and limit enforcement
 */
export function addRecentlyViewedEvent(
  event: Omit<RecentlyViewedEvent, 'viewedAt'>,
  config?: Partial<RecentlyViewedConfig>
): void {
  const { maxItems, ttlMs } = { ...DEFAULT_CONFIG, ...config };
  
  try {
    const existing = getRecentlyViewedEvents(config);
    
    // Add new item at the beginning, remove duplicates
    const newItem: RecentlyViewedEvent = {
      ...event,
      viewedAt: Date.now(),
    };
    
    const updated = [
      newItem,
      ...existing.filter(e => e.id !== event.id)
    ].slice(0, maxItems);
    
    saveRecentlyViewedEvents(updated, { maxItems, ttlMs });
  } catch (error) {
    console.error('[RecentlyViewed] Error adding event:', error);
  }
}

/**
 * Get recently viewed venues
 * Automatically filters out expired items
 */
export function getRecentlyViewedVenues(config?: Partial<RecentlyViewedConfig>): RecentlyViewedVenue[] {
  const { maxItems, ttlMs } = { ...DEFAULT_CONFIG, ...config };
  
  try {
    // Try new format first (with TTL)
    const stored = storageManager.get<RecentlyViewedStorage<RecentlyViewedVenue>>(
      MANAGED_STORAGE_KEYS.RECENTLY_VIEWED_VENUES
    );
    
    if (stored?.items) {
      const validItems = filterExpiredItems(stored.items, ttlMs);
      return validItems.slice(0, maxItems);
    }
    
    // Fall back to legacy format (without TTL)
    if (typeof window !== 'undefined') {
      const legacyString = localStorage.getItem('recently-viewed-venues');
      if (legacyString) {
        const legacyItems = JSON.parse(legacyString) as Array<{
          id: string;
          name?: string;
          date?: string;
          location?: string;
          imageUrl?: string | null;
        }>;
        
        // Migrate to new format with timestamps
        const migratedItems: RecentlyViewedVenue[] = legacyItems.map(item => ({
          ...item,
          viewedAt: Date.now() - (24 * 60 * 60 * 1000), // Assume 1 day old
        }));
        
        // Save in new format
        saveRecentlyViewedVenues(migratedItems);
        
        // Remove legacy key
        localStorage.removeItem('recently-viewed-venues');
        
        return migratedItems.slice(0, maxItems);
      }
    }
    
    return [];
  } catch (error) {
    console.error('[RecentlyViewed] Error reading venues:', error);
    return [];
  }
}

/**
 * Save recently viewed venues
 */
export function saveRecentlyViewedVenues(
  items: RecentlyViewedVenue[],
  config?: Partial<RecentlyViewedConfig>
): void {
  const { maxItems, ttlMs } = { ...DEFAULT_CONFIG, ...config };
  
  try {
    // Filter expired and limit items
    const validItems = filterExpiredItems(items, ttlMs).slice(0, maxItems);
    
    const storage: RecentlyViewedStorage<RecentlyViewedVenue> = {
      items: validItems,
      updatedAt: Date.now(),
    };
    
    storageManager.set(
      MANAGED_STORAGE_KEYS.RECENTLY_VIEWED_VENUES,
      storage,
      ttlMs
    );
  } catch (error) {
    console.error('[RecentlyViewed] Error saving venues:', error);
  }
}

/**
 * Add a venue to recently viewed
 * Handles deduplication and limit enforcement
 */
export function addRecentlyViewedVenue(
  venue: Omit<RecentlyViewedVenue, 'viewedAt'>,
  config?: Partial<RecentlyViewedConfig>
): void {
  const { maxItems, ttlMs } = { ...DEFAULT_CONFIG, ...config };
  
  try {
    const existing = getRecentlyViewedVenues(config);
    
    // Add new item at the beginning, remove duplicates
    const newItem: RecentlyViewedVenue = {
      ...venue,
      viewedAt: Date.now(),
    };
    
    const updated = [
      newItem,
      ...existing.filter(v => v.id !== venue.id)
    ].slice(0, maxItems);
    
    saveRecentlyViewedVenues(updated, { maxItems, ttlMs });
  } catch (error) {
    console.error('[RecentlyViewed] Error adding venue:', error);
  }
}

/**
 * Clear all recently viewed items
 */
export function clearRecentlyViewed(): void {
  try {
    storageManager.remove(MANAGED_STORAGE_KEYS.RECENTLY_VIEWED_EVENTS);
    storageManager.remove(MANAGED_STORAGE_KEYS.RECENTLY_VIEWED_VENUES);
    
    // Also clear legacy keys if they exist
    if (typeof window !== 'undefined') {
      localStorage.removeItem('recently-viewed-events');
      localStorage.removeItem('recently-viewed-venues');
    }
  } catch (error) {
    console.error('[RecentlyViewed] Error clearing:', error);
  }
}

/**
 * Get statistics about recently viewed items
 */
export function getRecentlyViewedStats(): {
  events: { count: number; oldestDaysAgo: number | null };
  venues: { count: number; oldestDaysAgo: number | null };
} {
  const events = getRecentlyViewedEvents();
  const venues = getRecentlyViewedVenues();
  
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;
  
  const getOldestDaysAgo = (items: RecentlyViewedItem[]): number | null => {
    if (items.length === 0) return null;
    const oldest = Math.min(...items.map(i => i.viewedAt));
    return Math.floor((now - oldest) / msPerDay);
  };
  
  return {
    events: {
      count: events.length,
      oldestDaysAgo: getOldestDaysAgo(events),
    },
    venues: {
      count: venues.length,
      oldestDaysAgo: getOldestDaysAgo(venues),
    },
  };
}
