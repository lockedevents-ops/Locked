/**
 * STORAGE LAYER: repositories.ts
 * -------------------------------------------------------------
 * Current Role:
 *  - Provides synchronous, in-browser repositories over a key-value adapter (localStorage).
 *  - Encapsulates domain CRUD logic and dispatches synthetic StorageEvents for reactive UI.
 *  - Includes both true domain repositories (users, events, venues, role requests, etc.) and
 *    purely client-side helpers (preferences, metricsHistoryRepo).
 * Migration Guidance (Real DB / API):
 *  PHASE 1 (Introduce Async Interfaces):
 *    - Convert each repository method to async (return Promise) and adapt callers.
 *    - Keep existing logic temporarily (still local) to avoid a big-bang change.
 *  PHASE 2 (Backend Wiring):
 *    - Replace bodies with API calls (fetch/axios/GraphQL). Remove direct kvAdapter usage for
 *      server-owned data (users/events/pages/venues/role requests/activity logs/notifications/payments).
 *    - preferencesRepo & possibly view-mode related helpers can remain local (or sync to server if desired).
 *  PHASE 3 (Reactive Updates):
 *    - Replace StorageEvents with: WebSocket/SSE push, or query client invalidations (TanStack Query).
 *    - metricsHistoryRepo should be replaced by a reporting endpoint returning current + previous snapshot.
 *  PHASE 4 (Security & Cleanup):
 *    - Remove adminUserRepo (credentials must not live client-side). Use proper auth endpoints.
 *    - Drop any repositories that only wrapped local mocks. Keep thin adapters that map to clearly
 *      named API services (e.g. EventsService.list, UsersService.updateRoles).
 *  Notes:
 *    - transact patterns should become explicit mutation endpoints with optimistic UI logic.
 *    - Keep types (interfaces) – they become your shared contract with backend responses.
 */

import { kvAdapter } from './adapters';
import { STORAGE_KEYS } from './keys';
import { StorageEvents } from './events';
/**
 * @deprecated authService moved to /legacy/auth/authService.ts
 * Use activityLogRepo from this file instead for logging
 */
import type { RoleRequest } from '@/legacy/auth/authService';

// Generic helper types
type IdLike = { id: string };

// ---------------- Role Requests ----------------

export interface RoleRequestRepository {
  all(): RoleRequest[];
  save(req: RoleRequest): void; // upsert new
  update(id: string, mut: (r: RoleRequest) => RoleRequest): RoleRequest | null;
}

function mergeLegacy(primary: RoleRequest[] | null, legacy: RoleRequest[] | null): RoleRequest[] {
  const combined: RoleRequest[] = [];
  const map = new Map<string, RoleRequest>();
  [...(primary || []), ...(legacy || [])].forEach(r => {
    if (!r || !r.id) return;
    if (!map.has(r.id)) map.set(r.id, r);
  });
  map.forEach(v => combined.push(v));
  return combined;
}

export const roleRequestRepo: RoleRequestRepository = {
  all() {
    const primary = kvAdapter.get<RoleRequest[]>(STORAGE_KEYS.ROLE_REQUESTS) || [];
    const legacy = kvAdapter.get<RoleRequest[]>(STORAGE_KEYS.ROLE_REQUESTS_LEGACY) || [];
    return mergeLegacy(primary, legacy);
  },
  save(req) {
    const existing = this.all();
    existing.push(req);
    kvAdapter.set(STORAGE_KEYS.ROLE_REQUESTS, existing);
    kvAdapter.set(STORAGE_KEYS.ROLE_REQUESTS_LEGACY, existing); // keep mirrored until cleanup
  StorageEvents.dispatch('ROLE_REQUEST_CREATED', { id: req.id });
  },
  update(id, mut) {
    const existing = this.all();
    let updated: RoleRequest | null = null;
    const next = existing.map(r => {
      if (r.id === id) {
        updated = mut(r);
        return updated!;
      }
      return r;
    });
    if (!updated) return null;
    kvAdapter.set(STORAGE_KEYS.ROLE_REQUESTS, next);
    kvAdapter.set(STORAGE_KEYS.ROLE_REQUESTS_LEGACY, next);
  StorageEvents.dispatch('ROLE_REQUEST_UPDATED', { id });
    return updated;
  }
};

// ---------------- Users ----------------
export interface UserRecord extends IdLike { [k: string]: any; }
export const userRepo = {
  all(): Record<string, UserRecord> {
    return kvAdapter.get<Record<string, UserRecord>>(STORAGE_KEYS.USERS) || {};
  },
  get(id: string): UserRecord | null { return this.all()[id] || null; },
  upsert(user: UserRecord) {
    kvAdapter.transact<Record<string, UserRecord>>(STORAGE_KEYS.USERS, cur => {
      const next = { ...(cur || {}) };
      next[user.id] = { ...(next[user.id] || {}), ...user };
      return next;
    });
  StorageEvents.dispatch('USER_UPDATED', { id: user.id });
  },
  update(id: string, mut: (u: UserRecord) => UserRecord) {
    kvAdapter.transact<Record<string, UserRecord>>(STORAGE_KEYS.USERS, cur => {
      const next = { ...(cur || {}) };
      if (next[id]) next[id] = mut(next[id]);
      return next;
    });
  StorageEvents.dispatch('USER_UPDATED', { id });
  }
};

// ---------------- Events ----------------
export interface EventRecord extends IdLike { [k: string]: any; }
export const eventRepo = {
  list(): EventRecord[] { return kvAdapter.get<EventRecord[]>(STORAGE_KEYS.EVENTS) || []; },
  save(event: EventRecord) {
    kvAdapter.transact<EventRecord[]>(STORAGE_KEYS.EVENTS, cur => {
      const list = [...(cur || [])];
      const idx = list.findIndex(e => e.id === event.id);
      if (idx >= 0) list[idx] = { ...list[idx], ...event }; else list.push(event);
      return list;
    });
  StorageEvents.dispatch('EVENT_SAVED', { id: event.id });
  }
};

// ---------------- Venues ----------------
export interface VenueRecord extends IdLike { [k: string]: any; }
export const venueRepo = {
  list(): VenueRecord[] { return kvAdapter.get<VenueRecord[]>(STORAGE_KEYS.VENUES) || []; },
  save(v: VenueRecord) {
    kvAdapter.transact<VenueRecord[]>(STORAGE_KEYS.VENUES, cur => {
      const list = [...(cur || [])];
      const idx = list.findIndex(e => e.id === v.id);
      if (idx >= 0) list[idx] = { ...list[idx], ...v }; else list.push(v);
      return list;
    });
  StorageEvents.dispatch('VENUE_SAVED', { id: v.id });
  }
};

// ---------------- Organizer Profiles ----------------
export interface OrganizerProfile extends IdLike { [k: string]: any; }
export const organizerProfileRepo = {
  all(): Record<string, OrganizerProfile> { return kvAdapter.get<Record<string, OrganizerProfile>>(STORAGE_KEYS.ORGANIZER_PROFILES) || {}; },
  get(id: string): OrganizerProfile | null { return this.all()[id] || null; },
  upsert(profile: OrganizerProfile) {
    kvAdapter.transact<Record<string, OrganizerProfile>>(STORAGE_KEYS.ORGANIZER_PROFILES, cur => ({ ...(cur || {}), [profile.id]: { ...(cur?.[profile.id] || {}), ...profile } }));
  StorageEvents.dispatch('USER_UPDATED', { id: profile.id });
  }
};

// ---------------- Notifications (admin) ----------------
export interface AdminNotification extends IdLike {
  title: string; message: string; type?: string; read: boolean; time: string; link?: string; [k: string]: any;
}
export const notificationRepo = {
  list(): AdminNotification[] { return kvAdapter.get<AdminNotification[]>(STORAGE_KEYS.ADMIN_NOTIFICATIONS) || []; },
  prepend(notif: AdminNotification, clamp = 200) {
    kvAdapter.transact<AdminNotification[]>(STORAGE_KEYS.ADMIN_NOTIFICATIONS, cur => {
      const list = [notif, ...(cur || [])];
      return list.slice(0, clamp);
    });
  StorageEvents.dispatch('ADMIN_NOTIFICATION_CREATED', { id: notif.id });
  },
  markRead(id: string) {
    kvAdapter.transact<AdminNotification[]>(STORAGE_KEYS.ADMIN_NOTIFICATIONS, cur => (cur || []).map(n => n.id === id ? { ...n, read: true } : n));
  StorageEvents.dispatch('ADMIN_NOTIFICATION_UPDATED', { id });
  },
  markAllRead() {
    kvAdapter.transact<AdminNotification[]>(STORAGE_KEYS.ADMIN_NOTIFICATIONS, cur => (cur || []).map(n => ({ ...n, read: true })));
  StorageEvents.dispatch('ADMIN_NOTIFICATION_UPDATED', { id: '*'});
  },
  clear() {
    kvAdapter.set(STORAGE_KEYS.ADMIN_NOTIFICATIONS, [] as AdminNotification[]);
  StorageEvents.dispatch('ADMIN_NOTIFICATION_UPDATED', { id: '*' });
  }
};

// ---------------- Activity Logs ----------------
export interface ActivityLog extends IdLike { [k: string]: any; }
export const activityLogRepo = {
  list(): ActivityLog[] { return kvAdapter.get<ActivityLog[]>(STORAGE_KEYS.ACTIVITY_LOGS) || []; },
  append(entry: ActivityLog, clamp = 1000) {
    kvAdapter.transact<ActivityLog[]>(STORAGE_KEYS.ACTIVITY_LOGS, cur => {
      const list = [...(cur || []), entry];
      if (list.length > clamp) return list.slice(list.length - clamp);
      return list;
    });
  }
};

// ---------------- Preferences ----------------
export interface PreferencesState { followedOrganizers?: string[]; recentEvents?: string[]; recentVenues?: string[]; viewModes?: Record<string,string>; [k: string]: any; }
export const preferencesRepo = {
  get(): PreferencesState { return kvAdapter.get<PreferencesState>(STORAGE_KEYS.PREFERENCES) || {}; },
  update(mut: (current: PreferencesState) => PreferencesState) {
    kvAdapter.transact<PreferencesState>(STORAGE_KEYS.PREFERENCES, cur => mut(cur || {}));
  StorageEvents.dispatch('PREFERENCES_UPDATED');
  }
};

// ---------------- Roles ----------------
export const rolesRepo = {
  map(): Record<string,string[]> { return kvAdapter.get<Record<string,string[]>>(STORAGE_KEYS.ROLES) || {}; },
  setForUser(userId: string, roles: string[]) {
    kvAdapter.transact<Record<string,string[]>>(STORAGE_KEYS.ROLES, cur => ({ ...(cur || {}), [userId]: roles }));
  StorageEvents.dispatch('USER_UPDATED', { id: userId });
  },
  addRole(userId: string, role: string) {
    this.setForUser(userId, Array.from(new Set([...(this.map()[userId] || ['User']), role])));
  }
};

// ---------------- Admin Users (legacy key) ----------------
export interface AdminUserRecord extends IdLike { email: string; name: string; role: 'admin' | 'super_admin' | 'support_agent'; is2FAVerified?: boolean; lastActive?: number; [k:string]:any; }
export const adminUserRepo = {
  list(): AdminUserRecord[] { return kvAdapter.get<AdminUserRecord[]>('admin_users') || []; },
  saveAll(users: AdminUserRecord[]) { kvAdapter.set('admin_users', users); },
  upsert(user: AdminUserRecord) {
    kvAdapter.transact<AdminUserRecord[]>('admin_users', cur => {
      const list = [...(cur || [])];
      const idx = list.findIndex(u => u.id === user.id);
      if (idx >= 0) list[idx] = { ...list[idx], ...user }; else list.push(user);
      return list;
    });
    StorageEvents.dispatch('USER_UPDATED', { id: user.id });
  },
  ensureDefaultSuperAdmin() {
    const all = this.list();
    const existing = all.find(a => a.role === 'super_admin');
    if (!existing) {
      // Seed with default demo password
      this.upsert({ id: 'super_admin-1', email: 'admin@locked.gh', name: 'Super Admin', role:'super_admin', password: 'locked2023', is2FAVerified:true, lastActive: Date.now() });
    } else if (!('password' in existing)) {
      // Upgrade existing record created before password field was added
      this.upsert({ ...existing, password: 'locked2023' });
    }
  }
};

// ---------------- Payment Methods (payout) ----------------
export interface PaymentMethod { id: string; userId: string; type: string; details?: any; createdAt: string; updatedAt?: string; active?: boolean; [k: string]: any; }
export const paymentMethodRepo = {
  all(): Record<string, PaymentMethod[]> { return kvAdapter.get<Record<string, PaymentMethod[]>>(STORAGE_KEYS.PAYOUT_METHODS) || {}; },
  listForUser(userId: string): PaymentMethod[] { return this.all()[userId] || []; },
  upsert(userId: string, method: PaymentMethod) {
    kvAdapter.transact<Record<string, PaymentMethod[]>>(STORAGE_KEYS.PAYOUT_METHODS, cur => {
      const map = { ...(cur||{}) };
      const arr = map[userId] ? [...map[userId]] : [];
      const i = arr.findIndex(m=>m.id===method.id);
      if (i>=0) arr[i] = { ...arr[i], ...method, updatedAt: new Date().toISOString() }; else arr.unshift({ ...method, createdAt: method.createdAt || new Date().toISOString() });
      map[userId] = arr;
      return map;
    });
  },
  remove(userId: string, id: string) {
    kvAdapter.transact<Record<string, PaymentMethod[]>>(STORAGE_KEYS.PAYOUT_METHODS, cur => {
      const map = { ...(cur||{}) };
      map[userId] = (map[userId]||[]).filter(m=>m.id!==id);
      return map;
    });
  }
};

// ---------------- Follow Service Helpers ----------------
export const followService = {
  listFollowed(): string[] { return preferencesRepo.get().followedOrganizers || []; },
  isFollowing(id: string) { return this.listFollowed().includes(id); },
  toggle(id: string) {
    preferencesRepo.update(cur => {
      const list = new Set(cur.followedOrganizers || []);
      if (list.has(id)) list.delete(id); else list.add(id);
      return { ...cur, followedOrganizers: Array.from(list) };
    });
  }
};

// ---------------- Metrics History (for dashboard deltas) ----------------
/**
 * Persists lightweight rolling history of key platform metrics to enable
 * percentage change calculations on the dashboard. Designed so that when
 * migrating to a real backend, this can be replaced with an analytics or
 * reporting query without changing the dashboard component.
 */
export interface MetricsSnapshot {
  ts: number; // epoch ms
  totalUsers: number;
  totalEvents: number;
  totalVenues: number;
  pendingApprovals: number;
}

const METRICS_RETENTION = 30; // keep last 30 daily snapshots

export const metricsHistoryRepo = {
  list(): MetricsSnapshot[] { return kvAdapter.get<MetricsSnapshot[]>(STORAGE_KEYS.METRICS_HISTORY) || []; },
  /** Append a snapshot (dedupe by day) */
  append(s: MetricsSnapshot) {
    kvAdapter.transact<MetricsSnapshot[]>(STORAGE_KEYS.METRICS_HISTORY, cur => {
      const list = [...(cur || [])];
      // Remove any snapshot from same UTC day (keep only latest for that day)
      const dayKey = new Date(s.ts).toISOString().slice(0,10);
      const filtered = list.filter(existing => new Date(existing.ts).toISOString().slice(0,10) !== dayKey);
      filtered.push(s);
      // Sort ascending by time
      filtered.sort((a,b)=>a.ts-b.ts);
      // Enforce retention (keep most recent N)
      return filtered.slice(Math.max(0, filtered.length - METRICS_RETENTION));
    });
  },
  /** Returns the most recent snapshot prior to the provided timestamp */
  previous(beforeTs: number): MetricsSnapshot | null {
    const list = this.list();
    let prev: MetricsSnapshot | null = null;
    for (const s of list) {
      if (s.ts < beforeTs) prev = s; else break;
    }
    return prev;
  },
  latest(): MetricsSnapshot | null {
    const list = this.list();
    return list.length ? list[list.length-1] : null;
  }
};
