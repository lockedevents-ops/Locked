/**
 * STORAGE LAYER: keys.ts
 * -------------------------------------------------------------
 * Current Role:
 *  - Central list of string keys used with localStorage via kvAdapter.
 *  - Helps avoid scattering raw string literals across the codebase.
 * Migration Guidance (Real DB / API):
 *  - Keys representing server-owned entities (USERS, EVENTS, VENUES, ROLE_REQUESTS, etc.)
 *    will be replaced by API endpoints / table names and can be removed from here.
 *  - Retain only client-only persistence (UI_STATE, PREFERENCES, maybe METRICS_HISTORY if
 *    you still compute locally) after migration.
 *  - During incremental migration, you can map old keys to cache namespaces (e.g. query keys).
 *  - Once all domain data is remote, trim this file to a minimal set or delete entirely.
 */

export const STORAGE_KEYS = {
  USERS: 'locked_users',
  AUTH: 'auth-storage',
  ADMIN_AUTH: 'admin-auth-storage',
  ROLE_REQUESTS: 'locked_role_requests',
  ROLE_REQUESTS_LEGACY: 'role_requests',
  ADMIN_NOTIFICATIONS: 'admin_notifications',
  ROLES: 'roles',
  FOLLOWED_ORGANIZERS: 'followed-organizers',
  VENUES: 'venues',
  EVENTS: 'events',
  RECENT_VENUES: 'recently_viewed_venues',
  RECENT_EVENTS: 'recently_viewed_events',
  ACTIVITY_LOGS: 'admin_activity_logs',
  PREFERENCES: 'locked_preferences',
  ORGANIZER_PROFILES: 'organizer_profiles'
  , PAYOUT_METHODS: 'payout_methods'
  , UI_STATE: 'ui_state'
  , METRICS_HISTORY: 'metrics_history'
};

// Meta key for tracking migration version (Phase 3)
export const STORAGE_VERSION_KEY = 'storage_version';

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
