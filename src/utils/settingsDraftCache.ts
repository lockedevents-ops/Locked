const SETTINGS_DRAFT_PREFIX = 'locked:settings:draft:';
const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

interface SettingsDraftPayload<T> {
  version: number;
  savedAt: number;
  ttl: number;
  data: T;
}

export const DEFAULT_SETTINGS_DRAFT_TTL = DEFAULT_TTL_MS;

export const buildSettingsDraftKey = (userId: string | undefined, section: string) => {
  if (!userId) {
    return `${SETTINGS_DRAFT_PREFIX}${section}:anonymous`;
  }
  return `${SETTINGS_DRAFT_PREFIX}${section}:${userId}`;
};

export const saveSettingsDraft = <T>(key: string | null, data: T, ttl: number = DEFAULT_TTL_MS) => {
  if (typeof window === 'undefined' || !key) return;
  try {
    const payload: SettingsDraftPayload<T> = {
      version: 1,
      savedAt: Date.now(),
      ttl,
      data,
    };
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch (error) {
    console.error('[settingsDraftCache] Failed to persist draft', error);
  }
};

export const loadSettingsDraft = <T>(key: string | null, fallbackTtl: number = DEFAULT_TTL_MS): T | null => {
  if (typeof window === 'undefined' || !key) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const payload = JSON.parse(raw) as SettingsDraftPayload<T>;
    const ttl = payload?.ttl ?? fallbackTtl;
    if (!payload?.savedAt || Date.now() - payload.savedAt > ttl) {
      window.localStorage.removeItem(key);
      return null;
    }
    return payload.data;
  } catch (error) {
    console.error('[settingsDraftCache] Failed to load draft', error);
    window.localStorage.removeItem(key);
    return null;
  }
};

export const clearSettingsDraft = (key: string | null) => {
  if (typeof window === 'undefined' || !key) return;
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error('[settingsDraftCache] Failed to clear draft', error);
  }
};
