/**
 * STORAGE LAYER: adapters.ts
 * -------------------------------------------------------------
 * Current Role:
 *  - Provides a synchronous KeyValueAdapter backed by browser localStorage.
 *  - Repositories import kvAdapter so the rest of the app does not touch
 *    localStorage directly.
 * Migration Guidance (Real DB / API):
 *  - Replace LocalStorageAdapter with an Async adapter (methods returning Promises)
 *    that calls your REST/GraphQL/SDK layer.
 *  - Keep the interface shape (get/set/transact) only if you still want a
 *    generic key-value cache; otherwise you can retire this file once all
 *    domain access goes through explicit repository methods.
 *  - 'transact' is a convenience for read-modify-write. In a real backend it
 *    should become an optimistic update or be removed in favor of dedicated
 *    mutation endpoints.
 *  - Safe to delete after migration IF no code imports kvAdapter directly.
 */

import { StorageKey } from './keys';

export interface KeyValueAdapter {
  get<T=any>(key: StorageKey): T | null;
  set<T=any>(key: StorageKey, value: T): void;
  remove(key: StorageKey): void;
  /** Atomic-ish read-modify-write helper */
  transact<T=any>(key: StorageKey, fn: (current: T | null) => T): T;
}

class LocalStorageAdapter implements KeyValueAdapter {
  get<T>(key: StorageKey): T | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
  set<T>(key: StorageKey, value: T) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }
  remove(key: StorageKey) {
    if (typeof window === 'undefined') return;
    try { localStorage.removeItem(key); } catch {}
  }
  transact<T>(key: StorageKey, fn: (current: T | null) => T): T {
    const current = this.get<T>(key);
    const next = fn(current);
    this.set(key, next);
    return next;
  }
}

export const kvAdapter: KeyValueAdapter = new LocalStorageAdapter();
