/**
 * DEPRECATED: useAdminAuth - Replaced by useAuth from AuthContext
 * --------------------------------------------------------------
 * This file is kept for backward compatibility but should not be used.
 * All authentication is now handled through Supabase Auth in AuthContext.
 * 
 * @deprecated Use useAuth() from @/contexts/AuthContext instead
 */
import { useAuth } from '@/contexts/AuthContext';

export function useAdminAuth() {
  console.warn('useAdminAuth is deprecated. Use useAuth() from @/contexts/AuthContext instead.');
  
  // Return a minimal compatible interface to prevent breaking changes
  const auth = useAuth();
  
  return {
    isAuthenticated: auth.isAuthenticated && auth.isAdmin,
    isFullyAuthenticated: auth.isAuthenticated && auth.isAdmin,
    user: auth.user,
    loading: auth.loading,
    error: null,
    signIn: auth.signIn,
    signOut: auth.signOut,
    verify2FA: () => true, // Deprecated - 2FA handled differently now
    updateLastActive: () => {}, // Deprecated - handled by Supabase
  };
}
