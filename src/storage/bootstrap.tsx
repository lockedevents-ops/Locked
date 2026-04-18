"use client";
/**
 * STORAGE LAYER: bootstrap.tsx
 * -------------------------------------------------------------
 * Current Role:
 *  - Runs one-time client-side migrations to normalize legacy localStorage data
 *    (merging role requests, normalizing user maps, roles mapping, etc.).
 *  - Invoked at app root to ensure structure consistency before repositories are used.
 *  - Initializes storage cleanup systems (TTL enforcement, draft cleanup)
 * 
 * Migration Guidance (Real DB / API):
 *  - Server-side schema migrations will replace this; client should not mutate authoritative
 *    data shapes at startup once a real backend exists.
 *  - You can remove most of this file after migration, or repurpose it to perform
 *    lightweight client-only upgrades (e.g., versioned UI preferences).
 *  - STORAGE_VERSION_KEY logic can remain for strictly local concerns.
 * 
 * @version 2.0.0 - Added storage initialization with TTL and cleanup systems
 */
import { useEffect } from 'react';
import { STORAGE_KEYS, STORAGE_VERSION_KEY } from './keys';
import { initStorage, handleQuotaExceeded } from '@/utils/storageInit';

const CURRENT_VERSION = 1;

function readJSON<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); if (!raw) return fallback; return JSON.parse(raw); } catch { return fallback; }
}
function writeJSON(key: string, value: any) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }

function migrateToV1() {
  const primary = readJSON<any[]>(STORAGE_KEYS.ROLE_REQUESTS, []);
  const legacy = readJSON<any[]>(STORAGE_KEYS.ROLE_REQUESTS_LEGACY, []);
  const map = new Map<string, any>();
  [...legacy, ...primary].forEach(r => { if (r && r.id && !map.has(r.id)) map.set(r.id, r); });
  const merged = Array.from(map.values());
  writeJSON(STORAGE_KEYS.ROLE_REQUESTS, merged);
  writeJSON(STORAGE_KEYS.ROLE_REQUESTS_LEGACY, merged);

  const usersRaw = readJSON<any>(STORAGE_KEYS.USERS, {});
  let unified: Record<string, any> = {};
  if (Array.isArray(usersRaw)) {
    usersRaw.forEach(u => { if (u && u.id) unified[u.id] = u; });
  } else if (typeof usersRaw === 'object' && usersRaw) {
    unified = usersRaw;
  }
  writeJSON(STORAGE_KEYS.USERS, unified);

  const rolesRaw = readJSON<any>(STORAGE_KEYS.ROLES, {});
  let rolesMap: Record<string,string[]> = {};
  if (Array.isArray(rolesRaw)) {
    try {
      const auth = readJSON<any>(STORAGE_KEYS.AUTH, {});
      const uid = auth.state?.user?.id; if (uid) rolesMap[uid] = ['User'];
    } catch {}
  } else if (typeof rolesRaw === 'object' && rolesRaw) rolesMap = rolesRaw;
  writeJSON(STORAGE_KEYS.ROLES, rolesMap);
}

function runMigrations() {
  let version = 0;
  try { version = parseInt(localStorage.getItem(STORAGE_VERSION_KEY) || '0', 10); } catch {}
  if (version < 1) { migrateToV1(); version = 1; }
  localStorage.setItem(STORAGE_VERSION_KEY, String(version));
}

export function StorageBootstrap() {
  useEffect(() => {
    try {
      // 1. Run legacy data migrations
      runMigrations();
      
      // 2. Initialize storage cleanup systems (TTL, draft cleanup, quota monitoring)
      initStorage({
        enablePeriodicCleanup: true,
        enableLogging: process.env.NODE_ENV === 'development',
        onQuotaExceeded: handleQuotaExceeded,
      });
    } catch (e) {
      console.warn('Storage bootstrap failed', e);
    }
  }, []);
  return null;
}
