/**
 * useViewMode / useBoolViewMode – Persisted UI View Preferences
 * --------------------------------------------------------------
 * CURRENT ROLE:
 *  - Persists arbitrary view mode values per key inside preferencesRepo.viewModes with
 *    cross-tab synchronization via StorageEvents.
 *
 * MIGRATION PLAN:
 *  - Optionally sync selected keys to server (PATCH /api/preferences) for multi-device continuity.
 *  - Replace manual repo access with a preferences query + mutation hooks.
 *  - Consider namespacing keys (e.g. admin.sidebarCollapsed) for clarity.
 *
 * FUTURE:
 *  - Add versioning / schema to preferences; allow reset to defaults.
 */
import { useCallback, useEffect, useState } from 'react';
import { preferencesRepo } from '@/storage/repositories';
import { useFilteredStorageEvents } from '@/storage/events';

// Generic hook to read/write a single viewModes key with multi-tab sync
export function useViewMode(key: string, defaultValue: string = ''): [string, (v: string) => void] {
  const [value, setValue] = useState<string>(defaultValue);

  // hydrate once
  useEffect(() => {
    try {
      const vm = preferencesRepo.get().viewModes || {};
      if (vm[key] !== undefined) setValue(vm[key]!);
    } catch {}
  }, [key]);

  const setPersisted = useCallback((v: string) => {
    setValue(v);
    preferencesRepo.update(p => {
      const viewModes = { ...(p.viewModes || {}) };
      viewModes[key] = v;
      return { ...p, viewModes };
    });
  }, [key]);

  // cross-tab sync
  useFilteredStorageEvents(['PREFERENCES_UPDATED'], () => {
    try {
      const vm = preferencesRepo.get().viewModes || {};
      if (vm[key] !== undefined && vm[key] !== value) setValue(vm[key]!);
    } catch {}
  }, [key, value]);

  return [value, setPersisted];
}

// Convenience boolean variant
export function useBoolViewMode(key: string, defaultValue = false): [boolean, (v: boolean) => void] {
  const [raw, setRaw] = useViewMode(key, defaultValue ? '1' : '0');
  const setBool = useCallback((v: boolean) => setRaw(v ? '1' : '0'), [setRaw]);
  return [raw === '1', setBool];
}
