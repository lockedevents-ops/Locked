/**
 * authStore (End-User) – Basic Auth State (Client Mock)
 * --------------------------------------------------------------
 * CURRENT ROLE:
 *  - Holds user object & isAuthenticated flag for public/organizer side of app.
 *  - Persists in localStorage (JSON) via zustand/middleware.
 *  - No token / session management; used only for UI gating.
 *
 * MIGRATION PLAN:
 *  - Replace login/logout with server calls (POST /api/auth/login, POST /api/auth/logout).
 *  - Introduce refresh logic or rely solely on HTTP-only cookie session.
 *  - Hydrate on app start with GET /api/auth/me; set hydrated=true once resolved.
 *
 * SECURITY IMPROVEMENTS:
 *  - Add roles/permissions array; remove single role union if expanding multi-role support.
 *  - Avoid storing entire profile if large; store id + minimal attributes, fetch profile lazily.
 *
 * DEPRECATE:
 *  - Manual persisted isAuthenticated flag (derive from presence of server session instead).
 * 
 * VERSION HISTORY:
 *  - v1: Initial version
 *  - v2: Added error-safe hydration and version migration (Dec 2025)
 */
import { create } from 'zustand';
import { persist, createJSONStorage, type PersistStorage, type StorageValue } from 'zustand/middleware';

const AUTH_STORAGE_KEY = 'auth-storage';
const AUTH_STORAGE_VERSION = 2;

// Define the store's state type
interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'organizer';
  bio?: string;
  location?: string;
  website?: string;
  image?: string;
}

interface AuthStore {
  isAuthenticated: boolean;
  user: null | AuthUser;
  hydrated: boolean;
  hydrationError: string | null;
  // Actions
  login: (userData: AuthUser) => void;
  logout: () => void;
  setHydrated: (state: boolean) => void;
  setHydrationError: (error: string | null) => void;
  clearStorage: () => void;
}

/**
 * Safe JSON storage adapter with error handling
 * Prevents corrupted localStorage data from crashing the app
 */
const createSafeStorage = (): PersistStorage<AuthStore> => ({
  getItem: (name: string): StorageValue<AuthStore> | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      const raw = localStorage.getItem(name);
      if (!raw) return null;
      
      const parsed = JSON.parse(raw);
      
      // Validate basic structure
      if (typeof parsed !== 'object' || parsed === null) {
        console.warn('[authStore] Invalid storage structure, clearing');
        localStorage.removeItem(name);
        return null;
      }
      
      return parsed as StorageValue<AuthStore>;
    } catch (error) {
      console.error('[authStore] Storage read error, clearing corrupted data:', error);
      try {
        localStorage.removeItem(name);
      } catch {}
      return null;
    }
  },
  
  setItem: (name: string, value: StorageValue<AuthStore>): void => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(name, JSON.stringify(value));
    } catch (error) {
      console.error('[authStore] Storage write error:', error);
      // If quota exceeded, try to clear and retry
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        try {
          // Clear non-essential storage to make room
          const keysToCheck = ['recently-viewed-events', 'recently-viewed-venues'];
          keysToCheck.forEach(key => {
            try { localStorage.removeItem(key); } catch {}
          });
          // Retry write
          localStorage.setItem(name, JSON.stringify(value));
        } catch {
          console.error('[authStore] Storage write failed even after cleanup');
        }
      }
    }
  },
  
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(name);
    } catch {}
  },
});

// Create the store with persistence and error-safe hydration
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      hydrated: false,
      hydrationError: null,
      
      login: (userData) => set({ isAuthenticated: true, user: userData, hydrationError: null }),
      logout: () => set({ isAuthenticated: false, user: null }),
      setHydrated: (state) => set({ hydrated: state }),
      setHydrationError: (error) => set({ hydrationError: error }),
      clearStorage: () => {
        set({ isAuthenticated: false, user: null, hydrationError: null });
        try {
          localStorage.removeItem(AUTH_STORAGE_KEY);
        } catch {}
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createSafeStorage(),
      version: AUTH_STORAGE_VERSION,
      
      // Handle version migrations
      migrate: (persistedState: unknown, version: number) => {
        console.log(`[authStore] Migrating from version ${version} to ${AUTH_STORAGE_VERSION}`);
        
        // Cast to expected shape
        const state = persistedState as Partial<AuthStore>;
        
        if (version < 2) {
          // v1 -> v2: Add hydrationError field
          return {
            ...state,
            hydrationError: null,
            hydrated: false,
          } as AuthStore;
        }
        
        return state as AuthStore;
      },
      
      // Handle hydration completion and errors
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('[authStore] Hydration failed:', error);
          // Set error state but still mark as hydrated so app can continue
          if (state) {
            const errorMessage = error instanceof Error ? error.message : 'Hydration failed';
            state.setHydrationError(errorMessage);
            state.setHydrated(true);
          }
          // Try to clear corrupted storage
          try {
            localStorage.removeItem(AUTH_STORAGE_KEY);
          } catch {}
          return;
        }
        
        if (state) {
          state.setHydrated(true);
          state.setHydrationError(null);
        }
      },
      
      // Only persist essential fields
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        // Don't persist hydrated or hydrationError - they're runtime state
      } as AuthStore),
    }
  )
);

// Export storage key for external use
export { AUTH_STORAGE_KEY };
