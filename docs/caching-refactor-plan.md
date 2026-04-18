# Locked Platform - Caching & Storage Refactoring Plan

> **Generated:** December 17, 2025  
> **Purpose:** Comprehensive audit and improvement plan for caching, localStorage usage, and performance optimization across the platform.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Identified Issues](#identified-issues)
4. [Refactoring Plan](#refactoring-plan)
5. [Implementation Priority](#implementation-priority)
6. [Migration Checklist](#migration-checklist)

---

## Executive Summary

### Key Findings

The platform has **100+ localStorage references** across the codebase with:
- **No centralized TTL management** - each component manages its own expiration
- **No automatic cleanup** - stale data accumulates indefinitely
- **No quota management** - risk of hitting browser storage limits (~5-10MB)
- **Event editor drafts persist after publish** - no cleanup when events are saved to Supabase
- **Inconsistent cache durations** - ranging from 30 seconds to infinity
- **Browser-specific failures** - corrupted localStorage can block app initialization

### Impact

- 🔴 **Critical:** Chrome users experiencing app initialization failures
- 🟠 **High:** localStorage bloat over time (especially for power users)
- 🟡 **Medium:** Inconsistent data freshness across features
- 🟢 **Low:** Redundant data fetching opportunities

---

## Current State Analysis

### 1. In-Memory Service Caches

| Service | Cache Type | TTL | Auto-Clear | Notes |
|---------|-----------|-----|------------|-------|
| `sharedEventService` | Map | 5 min (events), 2 min (homepage), 30s (locks) | On manual refresh | Primary event cache |
| `searchService` | Map | 2 min (search), 10 min (entities) | Size-limited (100 entries) | Multi-entity search |
| `chatbotUserContextService` | Map | 2 min | ❌ | User context for chatbot |
| `topOrganizersService` | Map | 5 min | ❌ | Homepage organizers |
| `analyticsService` | External | 3 min | ❌ | Organizer analytics |

### 2. localStorage Usage by Category

#### A. Authentication & Session (Critical - Handle Carefully)
```
auth-storage                    → Zustand persist (authStore)
admin-auth-storage             → Zustand persist (adminAuthStore)
```

#### B. Event/Venue Drafts (Major Cleanup Opportunity)
```
locked:event-creator:draft     → Create event form data
locked:event-creator:refresh   → sessionStorage flag
locked:event-editor:draft:*    → Edit event form data (per event ID)
locked:event-editor:refresh    → sessionStorage flag
locked:settings:draft:*        → Settings drafts with TTL (12h)
```

#### C. User Data (Needs TTL)
```
user-preferences-{userId}      → User category/location preferences
locked-events-{userId}         → User's locked events
recently-viewed-events         → Recently viewed events (max 20)
recently-viewed-venues         → Recently viewed venues (max 20)
followed-organizers            → Organizer follows
```

#### D. Legacy/Mock Data (Should Be Removed)
```
events                         → Legacy events array
venues                         → Mock venues data
venue-bookings                 → Mock booking data
event-attendees                → Generated mock attendees
temp_users                     → Temporary user storage
flagged_content                → Mock flagged content
user_profiles                  → Mock profiles
notification_settings          → Mock settings
team_members                   → Mock team data
privacy_settings               → Mock privacy
account_preferences            → Mock preferences
```

#### E. UI State (Acceptable)
```
admin-theme                    → Theme preference
venuesViewMode                 → Grid/list toggle
draftVenuesViewMode           → Grid/list toggle
help-chat-anchor-side         → Chat panel position
avatar_signed_url_{userId}    → Cached signed URLs (with expiry)
```

#### F. Migrations & Flags
```
locked:storage:version         → Migration version tracker
locked:event-taxonomy:v2      → Taxonomy migration flag
activity_migration_logged      → Activity service flag
```

### 3. Zustand Stores with Persistence

| Store | Key | Persistence | Issues |
|-------|-----|-------------|--------|
| `authStore` | `auth-storage` | localStorage | No hydration error handling |
| `adminAuthStore` | `admin-auth-storage` | localStorage | No hydration error handling |
| `lockStore` | `lock-storage` | localStorage | No TTL, grows indefinitely |
| `organizerStore` | `organizer-storage` | localStorage | Contains mock data |

### 4. Event Draft System Analysis

**Current Flow:**
```
User edits form → Auto-save to localStorage (800ms debounce)
                → On publish/draft save → clearDraftFromStorage()
```

**Problem Areas:**
1. Draft cleanup only happens on successful submission
2. If user navigates away or browser closes, draft persists forever
3. No TTL on drafts - data remains until manual clear
4. Each event edit creates a new key: `locked:event-editor:draft:{eventId}`

---

## Identified Issues

### 🔴 Critical Issues

#### 1. No Cleanup for Stale Event Drafts
**Location:** `src/app/dashboards/organizer/create-event/page.tsx`, `events/[id]/edit/page.tsx`
**Problem:** Event editor drafts persist in localStorage even after:
- Successful publish/save to Supabase
- Event deletion
- User account changes

**Impact:** localStorage bloat, potential data conflicts

#### 2. Missing Error Handling in Storage Hydration
**Location:** `src/store/authStore.ts`, `src/storage/bootstrap.tsx`
**Problem:** JSON parse failures during hydration can block app initialization

**Impact:** Chrome users seeing blank pages

#### 3. Mock Data in Production Services
**Location:** `src/services/userSettingsService.ts`, `src/services/attendeeService.ts`, `src/services/flaggedContentService.ts`
**Problem:** Services read/write mock data to localStorage instead of Supabase

**Impact:** Data not persisted across devices, inconsistent state

### 🟠 High Priority Issues

#### 4. No TTL on Recently Viewed Lists
**Location:** `src/components/events/EventDetails.tsx`, `src/app/venue/[id]/page.tsx`
**Problem:** `recently-viewed-events` and `recently-viewed-venues` accumulate without cleanup

#### 5. Inconsistent Cache Invalidation
**Problem:** In-memory caches don't invalidate when underlying data changes
- Creating an event doesn't clear `sharedEventService` cache
- Publishing a draft doesn't refresh homepage cache

#### 6. No Storage Quota Management
**Problem:** No checks before localStorage writes; quota errors silently caught

### 🟡 Medium Priority Issues

#### 7. Redundant Caching Layers
**Problem:** Some data cached in both in-memory service AND localStorage:
- Events: `sharedEventService` cache + localStorage `events`
- Venues: `searchService` cache + localStorage `venues`

#### 8. Signed URL Cache Expiry Mismatch
**Location:** `src/components/admin/AdminHeader.tsx`
**Problem:** Avatar signed URLs cached for 1 year locally but generated with 1 year server expiry - no refresh mechanism

---

## Refactoring Plan

### Phase 1: Critical Fixes (Week 1)

#### 1.1 Create Centralized Storage Manager

```typescript
// src/utils/storageManager.ts

interface StorageItem<T> {
  value: T;
  expiry: number | null; // null = no expiry
  version: number;
}

export const STORAGE_TTL = {
  // Critical - no TTL (session-based)
  AUTH: null,
  
  // Short-lived
  SEARCH_CACHE: 2 * 60 * 1000,      // 2 minutes
  LOCK_COUNTS: 30 * 1000,            // 30 seconds
  
  // Medium-lived  
  EVENT_CACHE: 5 * 60 * 1000,        // 5 minutes
  ORGANIZER_CACHE: 5 * 60 * 1000,    // 5 minutes
  ANALYTICS: 3 * 60 * 1000,          // 3 minutes
  
  // Long-lived
  SETTINGS_DRAFT: 12 * 60 * 60 * 1000, // 12 hours
  EVENT_DRAFT: 24 * 60 * 60 * 1000,    // 24 hours
  RECENTLY_VIEWED: 7 * 24 * 60 * 60 * 1000, // 7 days
  
  // Persistent
  USER_PREFERENCES: 30 * 24 * 60 * 60 * 1000, // 30 days
  THEME: null, // Never expires
} as const;

class StorageManager {
  private readonly VERSION = 2;
  
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      
      const item: StorageItem<T> = JSON.parse(raw);
      
      // Check version
      if (item.version !== this.VERSION) {
        this.remove(key);
        return null;
      }
      
      // Check expiry
      if (item.expiry && Date.now() > item.expiry) {
        this.remove(key);
        return null;
      }
      
      return item.value;
    } catch (error) {
      console.warn(`[StorageManager] Failed to read ${key}:`, error);
      this.remove(key); // Clear corrupted data
      return null;
    }
  }
  
  set<T>(key: string, value: T, ttl?: number | null): boolean {
    try {
      // Check quota before write
      if (!this.hasQuota(JSON.stringify(value).length)) {
        this.cleanup(); // Try to free space
        if (!this.hasQuota(JSON.stringify(value).length)) {
          console.error(`[StorageManager] Quota exceeded for ${key}`);
          return false;
        }
      }
      
      const item: StorageItem<T> = {
        value,
        expiry: ttl ? Date.now() + ttl : null,
        version: this.VERSION,
      };
      
      localStorage.setItem(key, JSON.stringify(item));
      return true;
    } catch (error) {
      console.error(`[StorageManager] Failed to write ${key}:`, error);
      return false;
    }
  }
  
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {}
  }
  
  // Clean up expired items
  cleanup(): number {
    let freedCount = 0;
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        
        const item = JSON.parse(raw);
        if (item.expiry && Date.now() > item.expiry) {
          keysToRemove.push(key);
        }
      } catch {}
    }
    
    keysToRemove.forEach(key => {
      this.remove(key);
      freedCount++;
    });
    
    return freedCount;
  }
  
  // Check if we have quota for a given size
  private hasQuota(bytes: number): boolean {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'x'.repeat(bytes));
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
  
  // Get total storage usage
  getUsage(): { used: number; total: number; percentage: number } {
    let used = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        used += (localStorage.getItem(key) || '').length * 2; // UTF-16
      }
    }
    const total = 5 * 1024 * 1024; // 5MB estimate
    return { used, total, percentage: (used / total) * 100 };
  }
}

export const storageManager = new StorageManager();
```

#### 1.2 Add Draft Cleanup System

```typescript
// src/utils/draftCleanup.ts

const DRAFT_PREFIXES = [
  'locked:event-creator:draft',
  'locked:event-editor:draft:',
  'locked:settings:draft:',
];

export function cleanupStaleDrafts(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
  let cleanedCount = 0;
  const now = Date.now();
  
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key) continue;
    
    // Check if it's a draft key
    const isDraft = DRAFT_PREFIXES.some(prefix => key.startsWith(prefix));
    if (!isDraft) continue;
    
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      
      const data = JSON.parse(raw);
      const savedAt = data.updatedAt || data.savedAt;
      
      if (savedAt && (now - savedAt) > maxAgeMs) {
        localStorage.removeItem(key);
        cleanedCount++;
        console.log(`[DraftCleanup] Removed stale draft: ${key}`);
      }
    } catch {
      // Remove corrupted drafts
      localStorage.removeItem(key);
      cleanedCount++;
    }
  }
  
  return cleanedCount;
}

// Clean drafts for a specific event that was published/deleted
export function cleanupEventDraft(eventId: string): void {
  const keys = [
    `locked:event-editor:draft:${eventId}`,
  ];
  
  keys.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch {}
  });
}

// Run cleanup on app initialization
export function initDraftCleanup(): void {
  // Immediate cleanup of very stale drafts (7+ days)
  cleanupStaleDrafts(7 * 24 * 60 * 60 * 1000);
  
  // Schedule periodic cleanup
  setInterval(() => {
    cleanupStaleDrafts(24 * 60 * 60 * 1000);
  }, 60 * 60 * 1000); // Every hour
}
```

#### 1.3 Fix Hydration Error Handling in authStore

```typescript
// src/store/authStore.ts - Updated

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      hydrated: false,
      
      login: (userData) => set({ isAuthenticated: true, user: userData }),
      logout: () => set({ isAuthenticated: false, user: null }),
      setHydrated: (state) => set({ hydrated: state }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('[authStore] Hydration failed:', error);
          // Clear corrupted storage
          try {
            localStorage.removeItem('auth-storage');
          } catch {}
        }
        if (state) state.setHydrated(true);
      },
      // Add version for migrations
      version: 1,
      migrate: (persistedState, version) => {
        if (version === 0) {
          // Migration logic for version 0 -> 1
          return persistedState;
        }
        return persistedState;
      },
    }
  )
);
```

### Phase 2: Cache Improvements (Week 2)

#### 2.1 Unified Cache Invalidation

```typescript
// src/services/cacheInvalidation.ts

type CacheKey = 
  | 'events'
  | 'homepage'
  | 'search'
  | 'organizers'
  | 'analytics';

const cacheInvalidators: Record<CacheKey, () => void> = {
  events: () => sharedEventService.clearCache(),
  homepage: () => sharedEventService.clearHomepageCache(),
  search: () => searchService.clearCache(),
  organizers: () => topOrganizersService.clearCache(),
  analytics: () => organizerAnalyticsService.clearCache(),
};

export function invalidateCaches(...keys: CacheKey[]): void {
  keys.forEach(key => {
    const invalidator = cacheInvalidators[key];
    if (invalidator) {
      invalidator();
      console.log(`[CacheInvalidation] Cleared ${key} cache`);
    }
  });
}

// Auto-invalidate on mutations
export function withCacheInvalidation<T>(
  mutation: () => Promise<T>,
  cacheKeys: CacheKey[]
): Promise<T> {
  return mutation().then(result => {
    invalidateCaches(...cacheKeys);
    return result;
  });
}
```

#### 2.2 Event Publish Integration

```typescript
// In eventDatabaseService.ts

async createEvent(eventData, userId) {
  const result = await this._createEvent(eventData, userId);
  
  // Clean up localStorage draft
  cleanupEventDraft(result.id);
  localStorage.removeItem('locked:event-creator:draft');
  sessionStorage.removeItem('locked:event-creator:refresh');
  
  // Invalidate relevant caches
  invalidateCaches('events', 'homepage', 'search');
  
  return result;
}

async updateEvent(eventId, eventData, userId) {
  const result = await this._updateEvent(eventId, eventData, userId);
  
  // Clean up localStorage draft
  cleanupEventDraft(eventId);
  
  // Invalidate relevant caches
  invalidateCaches('events', 'homepage');
  
  return result;
}
```

### Phase 3: Remove Legacy localStorage (Week 3)

#### 3.1 Services to Migrate to Supabase

| Service | Current Storage | Target |
|---------|----------------|--------|
| `userSettingsService` | localStorage | `user_settings` table |
| `attendeeService` | localStorage | Already has DB, remove mocks |
| `flaggedContentService` | localStorage | Already has DB, remove fallback |
| `organizerService` (follows) | localStorage | `user_organizer_follows` table |

#### 3.2 Cleanup Legacy Keys on App Init

```typescript
// src/storage/cleanupLegacy.ts

const LEGACY_KEYS = [
  'events',           // Replaced by Supabase
  'venues',           // Mock data
  'venue-bookings',   // Mock data
  'event-attendees',  // Mock data
  'temp_users',       // Legacy auth
  'flagged_content',  // Has DB
  'user_profiles',    // Use Supabase profiles
  'notification_settings', // Has DB
  'team_members',     // Mock data
  'privacy_settings', // Mock data
  'account_preferences', // Mock data
];

export function cleanupLegacyStorage(): void {
  const migrationKey = 'locked:legacy-cleanup:v1';
  
  if (localStorage.getItem(migrationKey)) {
    return; // Already cleaned up
  }
  
  LEGACY_KEYS.forEach(key => {
    try {
      localStorage.removeItem(key);
      console.log(`[LegacyCleanup] Removed: ${key}`);
    } catch {}
  });
  
  localStorage.setItem(migrationKey, Date.now().toString());
}
```

### Phase 4: Performance Optimizations (Week 4)

#### 4.1 Add Cache Warming for Critical Data

```typescript
// src/services/cacheWarming.ts

export async function warmCriticalCaches(): Promise<void> {
  // Run in parallel for faster initialization
  await Promise.allSettled([
    sharedEventService.getAllEvents({ includeAll: true }),
    topOrganizersService.getTopOrganizers({ limit: 3 }),
  ]);
}

// Call from homepage or layout
export function useWarmCaches(): void {
  useEffect(() => {
    warmCriticalCaches();
  }, []);
}
```

#### 4.2 Add Request Deduplication to All Services

Ensure all services implement the pattern from `sharedEventService`:

```typescript
private pendingRequests = new Map<string, Promise<any>>();

async getData(key: string): Promise<Data> {
  // Check pending requests
  const pending = this.pendingRequests.get(key);
  if (pending) return pending;
  
  // Create new request
  const request = this._fetchData(key).finally(() => {
    this.pendingRequests.delete(key);
  });
  
  this.pendingRequests.set(key, request);
  return request;
}
```

---

## Implementation Priority

### Week 1 (Critical) ✅ COMPLETED
- [x] Create `StorageManager` utility - `src/utils/storageManager.ts`
- [x] Add draft cleanup system - `src/utils/draftCleanup.ts`
- [x] Fix authStore hydration error handling - `src/store/authStore.ts`
- [x] Add storage quota monitoring - Integrated in StorageManager
- [x] Create storage initialization system - `src/utils/storageInit.ts`
- [x] Integrate with app bootstrap - Updated `src/storage/bootstrap.tsx`

**Week 1 Implementation Summary:**
1. **StorageManager** (`src/utils/storageManager.ts`): Centralized storage with TTL support, version control (v2), quota monitoring (~5MB), automatic cleanup
2. **DraftCleanup** (`src/utils/draftCleanup.ts`): Functions for stale draft removal, event-specific cleanup, periodic cleanup scheduling
3. **authStore** (`src/store/authStore.ts`): Safe JSON storage adapter, error handling in onRehydrateStorage, version migration support, hydrationError state
4. **StorageInit** (`src/utils/storageInit.ts`): Health metrics, periodic cleanup (5min), quota exceeded handling, cross-tab sync
5. **Bootstrap** (`src/storage/bootstrap.tsx`): Calls initStorage() on app load with proper configuration

### Week 2 (High) ✅ COMPLETED
- [x] Implement unified cache invalidation - `src/services/cacheInvalidation.ts`
- [x] Integrate draft cleanup with event publish flow - Updated `eventDatabaseService.ts`
- [x] Add TTL to `recently-viewed-*` lists - `src/utils/recentlyViewed.ts`
- [x] Update event editor to clear drafts on publish - Already implemented, added backup in service

**Week 2 Implementation Summary:**
1. **CacheInvalidation** (`src/services/cacheInvalidation.ts`): Unified invalidation for events, homepage, search, organizers caches with `invalidateCaches()`, `withCacheInvalidation()`, `invalidateForOperation()` helpers
2. **EventDatabaseService** (`src/services/eventDatabaseService.ts`): Now calls `cleanupEventCreatorDraft()` on create and `cleanupEventDraft(eventId)` on update; also calls `invalidateForOperation()` for cache consistency
3. **RecentlyViewed** (`src/utils/recentlyViewed.ts`): TTL-based storage (7 days default) with automatic expiration, migration from legacy format, max 20 items
4. **Updated Components**: EventDetails.tsx, venue/[id]/page.tsx, user dashboard, sharedEventService - all now use new recentlyViewed utility

### Week 3 (Medium) ✅ COMPLETED
- [x] Migrate `userSettingsService` to Supabase - Full migration of profile, notifications, privacy, preferences
- [x] Remove mock data from `attendeeService` - Now uses `event_registrations` table
- [x] Add legacy storage cleanup migration - `src/utils/cleanupLegacyStorage.ts`
- [x] Audit and remove unused localStorage keys - Integrated in cleanup system
- [x] Integrate `attendeeService` with organizer dashboard - Check-in functionality added
- [x] Connect user check-in (CheckInWithKeys) with registration system

**Week 3 Implementation Summary:**
1. **LegacyCleanup** (`src/utils/cleanupLegacyStorage.ts`): One-time migration to remove deprecated localStorage keys including `events`, `venues`, `venue-bookings`, `event-attendees`, `user_profiles`, `notification_settings`, `team_members`, `privacy_settings`, `account_preferences`, `organizers`, mock data keys
2. **StorageInit** (`src/utils/storageInit.ts`): Now runs legacy cleanup on first app init, tracks cleanup version to avoid re-running
3. **attendeeService** (`src/services/attendeeService.ts`): Complete rewrite to use Supabase `event_registrations` table; integrated with `eventRegistrationService`; added `getEventAttendees()`, `updateAttendeeCheckIn()`, `searchAttendees()`, `getAttendeeStats()`, `cancelRegistration()` methods
4. **userSettingsService** (`src/services/userSettingsService.ts`): Migrated all methods to Supabase:
   - `getUserProfile/updateUserProfile`: Now uses `profiles` + `user_profiles` tables
   - `getNotificationSettings/updateNotificationSettings`: Now uses `user_settings.email_notifications/push_notifications/sms_notifications` JSONB columns
   - `getPrivacySettings/updatePrivacySettings`: Now uses `user_settings` privacy columns
   - `getAccountPreferences/updateAccountPreferences`: Now uses `user_settings` + `user_profiles` for date/time/currency
   - `getTeamMembers/addTeamMember/updateTeamMember/removeTeamMember`: Now uses `organization_profiles` + `team_members` tables
5. **Organizer Event Page** (`src/app/dashboards/organizer/events/[id]/page.tsx`): Updated Attendees tab with:
   - Search and filter functionality for attendees
   - Check-in/check-out buttons for each attendee
   - Real-time status updates (registered/checked_in/cancelled)
   - Attendee statistics summary
6. **CheckInWithKeys** (`src/components/events/CheckInWithKeys.tsx`): Now integrates with `attendeeService`:
   - Automatically finds user's registration for the event
   - Updates check-in status in database when user checks in
   - Shows loading state during check-in process
   - Displays checked-in state if already checked in

### Week 4 (Optimization) ✅ COMPLETED
- [x] Add cache warming for homepage
- [x] Implement request deduplication across all services
- [x] Add performance monitoring for cache hit rates
- [x] Create storage usage dashboard for debugging

**Week 4 Implementation Summary:**

1. **CacheWarming** (`src/utils/cacheWarming.ts`): Pre-fetches homepage caches on app initialization:
   - `warmHomepageCaches()`: Warms featured, trending, upcoming, and live events caches
   - `schedulePeriodicWarming()`: Background refresh every 4 minutes (before 5-min cache expires)
   - `warmOnVisibilityChange()`: Re-warms caches when user returns to tab
   - `initializeCacheWarming()`: Combined initialization with all warming strategies
   - Tracks warming metrics (duration, warmed caches, errors)

2. **CacheMetrics** (`src/utils/cacheMetrics.ts`): Tracks cache performance across all services:
   - `recordCacheHit()`, `recordCacheMiss()`, `recordCacheEviction()`: Track cache events
   - `getHitRate()`: Calculate hit rate percentage per cache
   - `getAllMetrics()`, `getMetricsSummary()`: Get detailed metrics for all caches
   - `withCacheMetrics()`: Higher-order function wrapper for automatic tracking
   - Dev-only global: `window.__cacheMetrics` for debugging

3. **StorageDebug** (`src/utils/storageDebug.ts`): Development debugging utility:
   - `analyzeStorage()`: Full localStorage analysis with size, type categorization
   - `getStorageHealth()`: Health status (healthy/warning/critical) with recommendations
   - `logStorageAnalysis()`, `logDebugDashboard()`: Console output for debugging
   - `cleanupStorage()`: Remove expired and legacy items
   - Dev-only global: `window.__storageDebug` for debugging

4. **Request Deduplication** added to:
   - `searchService.ts`: `pendingSearchRequests` Map prevents duplicate concurrent searches
   - `chatbotUserContextService.ts`: `pendingContextRequests` Map prevents duplicate context fetches
   - (Already existed in `sharedEventService.ts` and `topOrganizersService.ts`)

5. **StorageInit** (`src/utils/storageInit.ts`): Updated to v1.2.0:
   - New `enableCacheWarming` option (default: true)
   - Integrates cache warming initialization
   - Cleanup function now stops cache warming timers

6. **SharedEventService** metrics integration:
   - `getCachedHomepageEvents()` now records hits/misses/evictions
   - Enables monitoring of homepage cache effectiveness

**Debug Commands (Development Only):**
```javascript
// Storage analysis
window.__storageDebug.log()        // Log storage analysis to console
window.__storageDebug.dashboard()  // Get full debug data object
window.__storageDebug.cleanup()    // Clean up expired/legacy items

// Cache metrics
window.__cacheMetrics.logMetrics() // Log cache hit rates to console
window.__cacheMetrics.getAllMetrics() // Get all cache metrics
window.__cacheMetrics.getMetricsSummary() // Get summary stats
```

---

## Migration Checklist

### Before Deploying

- [ ] Test localStorage cleanup doesn't break existing users
- [ ] Verify draft recovery still works for non-stale drafts
- [ ] Test auth flow after hydration changes
- [ ] Verify cache invalidation triggers correctly

### Monitoring After Deploy

- [ ] Monitor error rates in auth flow
- [ ] Track localStorage usage metrics
- [ ] Watch for draft recovery complaints
- [ ] Monitor cache hit rates

### Rollback Plan

1. Revert `authStore` changes if auth failures spike
2. Increase draft TTL if users report lost work
3. Disable legacy cleanup if data loss reported

---

## Appendix: Complete localStorage Key Inventory

### Keep (with improvements)
```
auth-storage               - Add version migration
admin-auth-storage         - Add version migration
lock-storage               - Add TTL, limit items
admin-theme                - Keep as-is
help-chat-anchor-side      - Keep as-is
avatar_signed_url_*        - Already has expiry
locked:storage:version     - Keep for migrations
```

### Improve (add TTL)
```
locked:event-creator:draft   - Add 24h TTL
locked:event-editor:draft:*  - Add 24h TTL
locked:settings:draft:*      - Already has 12h TTL
user-preferences-*           - Add 30d TTL
locked-events-*              - Add 7d TTL
recently-viewed-events       - Add 7d TTL
recently-viewed-venues       - Add 7d TTL
followed-organizers          - Migrate to Supabase
```

### Remove (migrate or delete)
```
events                       - Use Supabase
venues                       - Use Supabase
venue-bookings               - Mock data
event-attendees              - Mock data
temp_users                   - Legacy
flagged_content              - Has DB
user_profiles                - Use profiles table
notification_settings        - Has DB
team_members                 - Mock data
privacy_settings             - Mock data
account_preferences          - Mock data
```

---

*Document maintained by: Development Team*  
*Last updated: December 17, 2025*  
*Phase 1 (Week 1) completed: December 17, 2025*  
*Phase 2 (Week 2) completed: December 17, 2025*
*Phase 3 (Week 3) completed: December 17, 2025*  
*Phase 4 (Week 4) completed: December 17, 2025*
