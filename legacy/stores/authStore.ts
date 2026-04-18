/**
 * authStore (End-User) – Basic Auth State (Client Mock)
 * DEPRECATED - Use AuthContext instead
 * 
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
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
  hydrated: boolean; // Add this line
  // Actions
  login: (userData: AuthUser) => void;
  logout: () => void;
  setHydrated: (state: boolean) => void; // Add this line
}

// Create the store with persistence
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      hydrated: false, // Add this line
      
      login: (userData) => set({ isAuthenticated: true, user: userData }),
      logout: () => set({ isAuthenticated: false, user: null }),
      setHydrated: (state) => set({ hydrated: state }), // Add this line
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.setHydrated(true);
      },
    }
  )
);
