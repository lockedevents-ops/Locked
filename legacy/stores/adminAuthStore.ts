/**
 * DEPRECATED: adminAuthStore - Replaced by Supabase Auth
 * This file is kept for backward compatibility but should not be used.
 * All authentication is now handled through Supabase Auth in AuthContext.
 * 
 * @deprecated Use useAuth() from @/contexts/AuthContext instead
 */

// Deprecated exports for backward compatibility
export const useAdminAuthStore = () => {
  console.warn('useAdminAuthStore is deprecated. Use useAuth() from @/contexts/AuthContext instead.');
  return {
    isAuthenticated: false,
    user: null,
    sessionTimeout: 30 * 60 * 1000,
    login: () => {},
    logout: () => {},
    updateLastActive: () => {},
    set2FAVerified: () => {},
    _hasHydrated: true,
    _setHasHydrated: () => {},
  };
};

// Deprecated function - no longer needed with Supabase
export function ensureSuperAdminExists() {
  console.warn('ensureSuperAdminExists is deprecated and no longer needed with Supabase auth.');
}
