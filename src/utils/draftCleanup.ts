/**
 * Draft Cleanup System
 * --------------------------------------------------------------
 * Handles automatic cleanup of stale draft data from localStorage.
 * Drafts are temporary form data that should be cleared when:
 * - They exceed their TTL (default 24 hours)
 * - The associated event/resource has been published/deleted
 * - The user explicitly clears them
 * 
 * @module utils/draftCleanup
 */

import { STORAGE_TTL, MANAGED_STORAGE_KEYS } from './storageManager';

// Draft prefixes to monitor
const DRAFT_PREFIXES = {
  EVENT_CREATOR: 'locked:event-creator:draft',
  EVENT_EDITOR: 'locked:event-editor:draft:',
  SETTINGS: 'locked:settings:draft:',
} as const;

// Session storage flags
const SESSION_FLAGS = {
  EVENT_CREATOR_REFRESH: 'locked:event-creator:refresh',
  EVENT_EDITOR_REFRESH: 'locked:event-editor:refresh',
} as const;

interface DraftInfo {
  key: string;
  type: 'event-creator' | 'event-editor' | 'settings';
  eventId?: string;
  savedAt: number;
  age: number;
  isExpired: boolean;
}

/**
 * Get information about all drafts in storage
 */
export function getAllDrafts(): DraftInfo[] {
  if (typeof window === 'undefined') return [];
  
  const drafts: DraftInfo[] = [];
  const now = Date.now();
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    
    let type: DraftInfo['type'] | null = null;
    let eventId: string | undefined;
    
    // Determine draft type
    if (key === DRAFT_PREFIXES.EVENT_CREATOR) {
      type = 'event-creator';
    } else if (key.startsWith(DRAFT_PREFIXES.EVENT_EDITOR)) {
      type = 'event-editor';
      eventId = key.replace(DRAFT_PREFIXES.EVENT_EDITOR, '');
    } else if (key.startsWith(DRAFT_PREFIXES.SETTINGS)) {
      type = 'settings';
    }
    
    if (!type) continue;
    
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      
      const data = JSON.parse(raw);
      const savedAt = data.updatedAt || data.savedAt || data.createdAt || 0;
      const ttl = type === 'settings' ? STORAGE_TTL.SETTINGS_DRAFT : STORAGE_TTL.EVENT_DRAFT;
      const age = now - savedAt;
      
      drafts.push({
        key,
        type,
        eventId,
        savedAt,
        age,
        isExpired: ttl !== null && age > ttl,
      });
    } catch {
      // If we can't parse it, consider it expired/corrupted
      drafts.push({
        key,
        type,
        eventId,
        savedAt: 0,
        age: Infinity,
        isExpired: true,
      });
    }
  }
  
  return drafts;
}

/**
 * Clean up stale drafts that exceed their TTL
 * @param maxAgeMs Maximum age in milliseconds (default: 24 hours)
 * @returns Number of drafts cleaned up
 */
export function cleanupStaleDrafts(maxAgeMs: number = STORAGE_TTL.EVENT_DRAFT!): number {
  if (typeof window === 'undefined') return 0;
  
  let cleanedCount = 0;
  const drafts = getAllDrafts();
  
  for (const draft of drafts) {
    // Use the provided maxAge for event drafts, or the default TTL for settings
    const effectiveMaxAge = draft.type === 'settings' 
      ? STORAGE_TTL.SETTINGS_DRAFT! 
      : maxAgeMs;
    
    if (draft.age > effectiveMaxAge || draft.isExpired) {
      try {
        localStorage.removeItem(draft.key);
        cleanedCount++;
        console.log(`[DraftCleanup] Removed stale ${draft.type} draft: ${draft.key} (age: ${formatAge(draft.age)})`);
      } catch (error) {
        console.warn(`[DraftCleanup] Failed to remove ${draft.key}:`, error);
      }
    }
  }
  
  // Also clean up session storage flags
  try {
    Object.values(SESSION_FLAGS).forEach(flag => {
      sessionStorage.removeItem(flag);
    });
  } catch {}
  
  return cleanedCount;
}

/**
 * Clean up drafts for a specific event (after publish/delete)
 * @param eventId The event ID to clean up drafts for
 */
export function cleanupEventDraft(eventId: string): void {
  if (typeof window === 'undefined' || !eventId) return;
  
  const keysToRemove = [
    `${DRAFT_PREFIXES.EVENT_EDITOR}${eventId}`,
  ];
  
  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
      console.log(`[DraftCleanup] Cleared event draft: ${key}`);
    } catch {}
  });
  
  // Clear session flags
  try {
    sessionStorage.removeItem(SESSION_FLAGS.EVENT_EDITOR_REFRESH);
  } catch {}
}

/**
 * Clean up the event creator draft (after successful creation)
 */
export function cleanupEventCreatorDraft(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(DRAFT_PREFIXES.EVENT_CREATOR);
    sessionStorage.removeItem(SESSION_FLAGS.EVENT_CREATOR_REFRESH);
    console.log('[DraftCleanup] Cleared event creator draft');
  } catch (error) {
    console.warn('[DraftCleanup] Failed to clear event creator draft:', error);
  }
}

/**
 * Clean up settings draft for a specific section/user
 * @param userId The user ID
 * @param section The settings section (optional - clears all if not provided)
 */
export function cleanupSettingsDraft(userId?: string, section?: string): void {
  if (typeof window === 'undefined') return;
  
  if (section && userId) {
    // Clear specific settings draft
    const key = `${DRAFT_PREFIXES.SETTINGS}${section}:${userId}`;
    try {
      localStorage.removeItem(key);
      console.log(`[DraftCleanup] Cleared settings draft: ${key}`);
    } catch {}
  } else {
    // Clear all settings drafts (optionally for a specific user)
    const prefix = userId 
      ? `${DRAFT_PREFIXES.SETTINGS}` 
      : DRAFT_PREFIXES.SETTINGS;
    
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        if (!userId || key.includes(userId)) {
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        console.log(`[DraftCleanup] Cleared settings draft: ${key}`);
      } catch {}
    });
  }
}

/**
 * Check if a draft exists for a given event
 */
export function hasEventDraft(eventId: string): boolean {
  if (typeof window === 'undefined' || !eventId) return false;
  
  try {
    const key = `${DRAFT_PREFIXES.EVENT_EDITOR}${eventId}`;
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

/**
 * Check if the event creator has a draft
 */
export function hasEventCreatorDraft(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const raw = localStorage.getItem(DRAFT_PREFIXES.EVENT_CREATOR);
    if (!raw) return false;
    
    // Check if it has meaningful data
    const data = JSON.parse(raw);
    const formData = data.data || data;
    
    // Has draft if title has content
    return Boolean(formData.title?.trim());
  } catch {
    return false;
  }
}

/**
 * Get draft statistics for debugging/monitoring
 */
export function getDraftStats(): {
  total: number;
  expired: number;
  byType: Record<string, number>;
  totalSize: number;
} {
  const drafts = getAllDrafts();
  const byType: Record<string, number> = {};
  let totalSize = 0;
  
  drafts.forEach(draft => {
    byType[draft.type] = (byType[draft.type] || 0) + 1;
    
    try {
      const raw = localStorage.getItem(draft.key);
      if (raw) {
        totalSize += raw.length * 2; // UTF-16
      }
    } catch {}
  });
  
  return {
    total: drafts.length,
    expired: drafts.filter(d => d.isExpired).length,
    byType,
    totalSize,
  };
}

/**
 * Format age in human-readable format
 */
function formatAge(ms: number): string {
  if (ms === Infinity) return 'unknown';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

/**
 * Initialize draft cleanup system
 * - Runs immediate cleanup of very stale drafts (7+ days)
 * - Schedules periodic cleanup
 */
export function initDraftCleanup(): () => void {
  if (typeof window === 'undefined') return () => {};
  
  // Immediate cleanup of very stale drafts (7+ days)
  const veryStaleThreshold = 7 * 24 * 60 * 60 * 1000;
  const cleaned = cleanupStaleDrafts(veryStaleThreshold);
  
  if (cleaned > 0) {
    console.log(`[DraftCleanup] Initial cleanup removed ${cleaned} stale drafts`);
  }
  
  // Schedule periodic cleanup (every hour)
  const intervalId = setInterval(() => {
    const count = cleanupStaleDrafts(STORAGE_TTL.EVENT_DRAFT!);
    if (count > 0) {
      console.log(`[DraftCleanup] Periodic cleanup removed ${count} drafts`);
    }
  }, 60 * 60 * 1000);
  
  // Return cleanup function
  return () => {
    clearInterval(intervalId);
  };
}

// Export types
export type { DraftInfo };
