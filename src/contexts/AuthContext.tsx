"use client";

/**
 * AuthContext – Supabase Auth Context
 * --------------------------------------------------------------
 * MERGED IMPLEMENTATION:
 *  - Uses Supabase authentication directly instead of localStorage
 *  - Maintains compatibility with existing code structure
 *  - Provides real-time session state updates
 *  - Includes proper error handling and loading states
 *  - Merged functionality from useAuth hook
 */

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { getClientInfo, logAuthEvent } from '@/services/databaseActivityService';
import { createClient } from '@/lib/supabase/client/client'
import { useRouter, usePathname } from 'next/navigation'
import { useToast } from '@/hooks/useToast'
import { useAuthStore } from '@/store/authStore'
import { incrementRuntimeCounter, recordRuntimeDuration, setRuntimeGauge, setRuntimeGaugeMax } from '@/lib/runtimeTelemetry'
import { requestCache } from '@/lib/requestCache'
import { sharedEventService } from '@/services/sharedEventService'

// Activity logging removed - only admin dashboard activities are logged now

interface AuthContextType {
  // Enhanced user object with roles and profile data
  user: any | null
  session: Session | null
  isAuthenticated: boolean
  loading: boolean
  isSigningOut: boolean
  isLoggingIn: boolean
  setIsLoggingIn: (value: boolean) => void
  error: string | null
  // Roles (moved from RoleContext for single round trip)
  roles: string[]
  rolesLoading: boolean
  hasRole: (role: string) => boolean
  hasAnyRole: (roles: string[]) => boolean
  isReady: boolean // unified readiness (auth + roles resolved at least once)
  isAdmin: boolean
  isOrganizer: boolean
  isVenueOwner: boolean
  // Enhanced auth methods with full functionality from useAuth
  signIn: (identifier: string, password: string) => Promise<any>
  verifyMFA: (factorId: string, code: string, method?: 'totp' | 'email') => Promise<any>
  signUp: (name: string, email: string, password: string, phoneNumber?: string, role?: 'user' | 'organizer') => Promise<any>
  verifyEmail: (tempUserId: string, verificationCode: string) => Promise<any>
  signOut: (reason?: 'manual' | 'idle' | 'session_expired') => Promise<void>
  resetPassword: (email: string) => Promise<{ error: any }>
  updatePassword: (password: string) => Promise<{ error: any }>
  refreshSession: (options?: { isLogin?: boolean }) => Promise<void>
  refreshRoles: (force?: boolean) => Promise<void>
  refreshUserProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false)
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [roles, setRoles] = useState<string[]>([])
  const [rolesLoading, setRolesLoading] = useState<boolean>(true)
  const [rolesFetchedAt, setRolesFetchedAt] = useState<number | null>(null)
  const ROLE_TTL_MS = 10000; // ✅ SECURITY: 10s role cache TTL (reduced from 60s to minimize stale access window)
  const [initialized, setInitialized] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const queryClient = useQueryClient();
  const toast = useToast();
  const refreshSessionInFlightRef = useRef<Promise<void> | null>(null);
  const refreshSessionVersionRef = useRef(0);
  const refreshSessionConcurrentRef = useRef(0);

  const clearRuntimeCaches = () => {
    try { queryClient.clear(); } catch (e) {}
    try { requestCache.clear(); } catch (e) {}
    try { sharedEventService.clearAllRuntimeState(); } catch (e) {}
  };

  async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
      ),
    ]);
  }
  
  // Initialize auth state from Supabase session
  useEffect(() => {
    let subscription: any = null;
    
    const initializeAuth = async () => {
      try {
        // ✅ SECURITY: Verify user authentication with server validation
        // 🚀 UPDATE: Add 30s timeout to prevent infinite loading on cold starts
        const timeoutPromise = new Promise<{ data: { user: User | null }, error: any }>((_, reject) => {
          setTimeout(() => reject(new Error('Auth initialization timed out')), 30000);
        });

        const { data: { user }, error: userError } = await Promise.race([
          supabase.auth.getUser(),
          timeoutPromise
        ]).catch(err => {
          console.warn('[AuthContext] Auth check timed out or failed:', err);
          return { data: { user: null }, error: err };
        });
        
        // ✅ FIX: If user verification fails (invalid JWT), clear the stale session
        if (userError) {
          console.warn('[AuthContext] User verification failed, clearing stale session:', userError.message);
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          setUser(null);
          setIsAuthenticated(false);
          setSession(null);
          setRoles([]);
          setRolesLoading(false);
          setLoading(false);
          setInitialized(true);
          return; // Exit early, don't throw
        }
        
        // Get session data only after user is verified
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        
        if (session) {
          // Get user roles if session exists (excluding revoked roles)
          const { data: roleRows } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .is('revoked_at', null);

          // Get user profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
            
          // Create user object that matches expected structure from previous implementation
          const userData = {
            id: session.user.id,
            email: session.user.email,
            name: profile?.full_name || session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
            roles: roleRows?.map((r: any) => r.role) || [],
            // Add other fields expected by your app
            verified: true,
            accountStatus: profile?.status || 'active',
            avatar_url: profile?.avatar_url || null,
            // Map any other needed fields from user metadata or profile
          };
          
          // Check if account is scheduled for deletion
          if (profile?.status === 'deleted') {
            console.warn('[AuthContext] Blocking access for deleted account:', session.user.id);
            await supabase.auth.signOut({ scope: 'local' });
            setUser(null);
            setIsAuthenticated(false);
            setSession(null);
            setRoles([]);
            setRolesLoading(false);
            setError('This account is scheduled for deletion. Please contact support to restore it.');
            toast.showError('Account Scheduled for Deletion', 'This account is scheduled for deletion. Please contact support to restore it.');
            setLoading(false);
            setInitialized(true);
            return;
          }

          setUser(userData);
          setRoles(userData.roles || []);
          setRolesFetchedAt(Date.now());
          setIsAuthenticated(true);
          setRolesLoading(false);
        } else {
          setUser(null);
          setIsAuthenticated(false);
          setRoles([]);
          setRolesLoading(false);
        }
        
        // Set loading to false AFTER auth check completes
        setLoading(false);
        setInitialized(true);
        
        // Listen for auth changes
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
          async (event: string, session: any) => {
            
            // Handle token refresh
            if (event === 'TOKEN_REFRESHED') {
              setSession(session);
              // Don't need to refetch user data, just update session
              return;
            }
            
            setSession(session);

            // Token lifespan logging removed to minimize console noise
            
            if (event === 'SIGNED_IN' && session) {
              clearRuntimeCaches();
              // ✅ SECURITY: Verify user authentication before using session data
              const { data: { user: verifiedUser }, error: userError } = await supabase.auth.getUser();
              if (userError || !verifiedUser) {
                console.error('[AuthContext] Failed to verify user on SIGNED_IN:', userError);
                // ✅ FIX: Clear invalid session
                await supabase.auth.signOut({ scope: 'local' });
                setUser(null);
                setIsAuthenticated(false);
                setSession(null);
                setRoles([]);
                setRolesLoading(false);
                return;
              }
              
              // Similar to above, get roles and profile (excluding revoked roles)
              const { data: roleRows } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', verifiedUser.id)
                .is('revoked_at', null);
              
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', verifiedUser.id)
                .maybeSingle();
                
              const userData = {
                id: verifiedUser.id,
                email: verifiedUser.email,
                name: profile?.full_name || verifiedUser.user_metadata?.full_name || verifiedUser.user_metadata?.name || verifiedUser.email?.split('@')[0] || 'User',
                roles: roleRows?.map((r: any) => r.role) || [],
                verified: true,
                accountStatus: profile?.status || 'active',
                avatar_url: profile?.avatar_url || null,
              };

              // Check if account is scheduled for deletion
              if (profile?.status === 'deleted') {
                console.warn('[AuthContext] Blocking SIGNED_IN for deleted account:', verifiedUser.id);
                await supabase.auth.signOut({ scope: 'local' });
                setUser(null);
                setIsAuthenticated(false);
                setSession(null);
                setRoles([]);
                setRolesLoading(false);
                setError('This account is scheduled for deletion. Please contact support to restore it.');
                toast.showError('Account Scheduled for Deletion', 'This account is scheduled for deletion. Please contact support to restore it.');
                return;
              }
              
              setUser(userData);
              setRoles(userData.roles || []);
              setRolesFetchedAt(Date.now());
              setIsAuthenticated(true);
              setRolesLoading(false);
            } else if (event === 'SIGNED_OUT') {
              clearRuntimeCaches();
              
              // Log auto-logout if user data exists (means it wasn't a manual logout)
              if (user && user.id) {
                // Get user profile for display name and log auto-logout
                (async () => {
                  try {
                    const { data: userProfile, error: profileError } = await supabase
                      .from('profiles')
                      .select('full_name, email')
                      .eq('id', user.id)
                      .maybeSingle();

                    if (profileError) {
                      console.warn('Failed to fetch user profile for audit log:', profileError);
                      return;
                    }

                    const userName = userProfile?.full_name || userProfile?.email || 'User';
                    // Don't log here - signOut() will handle logging with 'session_expired' reason
                    // This prevents duplicate logging
                  } catch (err) {
                    console.warn('Failed to handle auto-logout audit log:', err);
                  }
                })();
              }

              setUser(null);
              setIsAuthenticated(false);
              setRoles([]);
              setRolesFetchedAt(null);
              setRolesLoading(false);
              
              // Only redirect to homepage if currently on a protected route (but not login pages)
              if (pathname && (pathname.startsWith('/dashboards') || pathname.startsWith('/admin'))) {
                // Don't redirect if on login pages - user should stay to see error messages
                if (!pathname.includes('/login') && !pathname.includes('/signin')) {
                  router.push('/');
                }
              }
            }
            
            setLoading(false);
              setInitialized(true);
          }
        );
        
        subscription = authSubscription;
        
      } catch (err) {
        console.error('Auth initialization error:', err);
        // ✅ FIX: Clear any potentially stale session on initialization error
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        setUser(null);
        setIsAuthenticated(false);
        setSession(null);
        setRoles([]);
        setRolesLoading(false);
        setLoading(false);
        setInitialized(true);
      }
    };
    
    initializeAuth();
    
    // Cleanup subscription on unmount
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
    // IMPORTANT: Empty dependency array so this runs only once on mount.
    // Including pathname/router caused re-initialization (setLoading(true)) on every route change,
    // producing persistent "Loading..." flashes in admin pages.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = async (identifier: string, password: string) => {
    setLoading(true);
    setError(null);
  setRolesLoading(true);
    
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: identifier,
        password
      });
      
      if (authError) {
        // Check if MFA is required (special error code from Supabase)
        if (authError.message?.includes('MFA') || authError.status === 403) {
          // This shouldn't happen here since we handle MFA separately
          // But good to have as fallback
          throw new Error('MFA_REQUIRED');
        }
        
        // Log failed login attempt with full details
        logAuthEvent(null, identifier, null, null, 'login', 'failure', authError.message);
        
        throw authError;
      }
      
      if (!data.user) {
        throw new Error('Authentication failed');
      }

      // ✅ 2FA: Check if user has MFA enabled
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const hasTOTP = factors && factors.totp && factors.totp.length > 0;
      
      // Also check for email 2FA in security settings
      const { data: securitySettings } = await supabase
        .from('security_settings')
        .select('two_factor_enabled, two_factor_methods')
        .eq('user_id', data.user.id)
        .maybeSingle();
      
      const hasEmail2FA = securitySettings?.two_factor_enabled && 
                         securitySettings?.two_factor_methods?.includes('email');
      
      if (hasTOTP || hasEmail2FA) {
        // User has MFA enabled, return special response
        const availableMethods: Array<'totp' | 'email'> = [];
        if (hasTOTP) availableMethods.push('totp');
        if (hasEmail2FA) availableMethods.push('email');
        
        return {
          mfaRequired: true,
          userId: data.user.id,
          email: data.user.email,
          factors: factors?.totp || [],
          availableMethods
        };
      }
      
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();
      
      // Get user roles (excluding revoked roles)
  const { data: roleRows, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .is('revoked_at', null);
      
      // Check account status
      const accountStatus = profile?.status?.toLowerCase() || 'active';
      if (accountStatus === 'suspended') {
        throw new Error('Account suspended. Please contact support.');
      }
      if (['deactivated', 'disabled', 'deleted'].includes(accountStatus)) {
        throw new Error('Account inactive or deleted. Please contact support.');
      }
      
      // Create user object for compatibility
              const userData = {
                id: data.user.id,
                email: data.user.email,
                name: profile?.full_name || data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
                roles: roleRows?.map((r: any) => r.role) || [],
                verified: true,
                accountStatus,
                avatar_url: profile?.avatar_url || null,
              };
      
      // ✅ FIX: Immediately update auth state to prevent navbar delay
      setUser(userData);
      setSession(data.session);
      setIsAuthenticated(true);
      setRoles(userData.roles || []);
      setRolesFetchedAt(Date.now());
      setRolesLoading(false);
      
      // 🔄 Update last login timestamp for activity tracking (DAU/MAU/YAU stats)
      // Call server-side API for proper logging
      fetch('/api/auth/track-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).catch(err => {
        // Don't fail the login if tracking fails
        console.error('Failed to track login:', err);
      });

      // ✅ LOGGING: Log successful admin login
      const isAdminUser = userData.roles.some((r: string) => ['admin', 'super_admin', 'support_agent'].includes(r));
      if (isAdminUser || (pathname && pathname.startsWith('/admin'))) {
        const primaryRole = userData.roles.find((r: string) => ['super_admin', 'admin', 'support_agent'].includes(r)) || userData.roles[0] || 'user';
        // USE AWAIT: Ensure the log is sent before potential redirects in layout
        await logAuthEvent(data.user.id, data.user.email, userData.name, primaryRole, 'login', 'success', undefined, userData.avatar_url);
      }
      
      return userData;
    } catch (err: any) {
      const message = err instanceof AuthError ? err.message : 'Failed to sign in';
      setError(message);
      
      // Activity logging removed - only admin dashboard activities are logged
      
      throw err;
    } finally {
      setLoading(false);
  setRolesLoading(false);
    }
  }

  const verifyMFA = async (factorId: string, code: string, method: 'totp' | 'email' = 'totp') => {
    setLoading(true);
    setError(null);
    setRolesLoading(true);

    try {
      // Handle different verification methods
      if (method === 'email') {
        // Verify email OTP via API
        const response = await fetch('/api/auth/2fa/email/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Invalid verification code');
        }

        // Email OTP verified, continue with session
      } else {
        // Verify TOTP code
        const { data, error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
          factorId,
          code
        });

        if (verifyError) throw verifyError;

        if (!data) {
          throw new Error('MFA verification failed');
        }
      }

      // Get fresh session after MFA verification
      const { data: { session: newSession } } = await supabase.auth.getSession();
      if (!newSession) {
        throw new Error('Failed to get session after MFA');
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', newSession.user.id)
        .maybeSingle();

      // Get user roles (excluding revoked roles)
      const { data: roleRows } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', newSession.user.id)
        .is('revoked_at', null);

      // Create user object
      const userData = {
        id: newSession.user.id,
        email: newSession.user.email,
        name: profile?.full_name || newSession.user.user_metadata?.full_name || newSession.user.user_metadata?.name || newSession.user.email?.split('@')[0] || 'User',
        roles: roleRows?.map((r: any) => r.role) || [],
        verified: true,
        accountStatus: profile?.status || 'active',
        avatar_url: profile?.avatar_url || null,
      };

      // Update auth state
      setUser(userData);
      setSession(newSession);
      setIsAuthenticated(true);
      setRoles(userData.roles || []);
      setRolesFetchedAt(Date.now());
      setRolesLoading(false);

      // 🔄 Update last login timestamp for activity tracking (DAU/MAU/YAU stats)
      // Call server-side API for proper logging
      fetch('/api/auth/track-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).catch(err => {
        // Don't fail the login if tracking fails
        console.error('Failed to track login:', err);
      });

      return userData;
    } catch (err: any) {
      const message = err instanceof AuthError ? err.message : 'MFA verification failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
      setRolesLoading(false);
    }
  };

  const signUp = async (name: string, email: string, password: string, phoneNumber?: string, role: 'user' | 'organizer' = 'user') => {
    setLoading(true);
    setError(null);
    
    try {
      // Sign up the user
      // Note: Supabase handles duplicate emails securely - it won't create duplicate accounts
      // but also won't expose whether an email already exists (for privacy/security)
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name, // ✅ Supabase Auth uses 'full_name' for Display Name
            name, // Keep for backward compatibility
            phone: phoneNumber,
            requested_role: role
          },
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        }
      });
      
      if (signUpError) throw signUpError;
      
      if (!data.user) {
        throw new Error('Registration failed');
      }
      
      // Profile will be created automatically via database trigger when email is verified
      // (create_profile_on_email_verification trigger fires on auth.users UPDATE when email_confirmed_at is set)
      // No need to create profile here - it happens AFTER email verification
      
      // Create role request for organizers
      if (role === 'organizer') {
        try {
          await supabase
            .from('role_requests')
            .insert({
              user_id: data.user.id,
              requested_role: 'organizer',
              status: 'pending'
            });
        } catch (roleErr) {
          console.warn('Role request creation failed:', roleErr);
        }
      } else {
        // For regular users, add the role directly
        try {
          await supabase
            .from('user_roles')
            .insert({
              user_id: data.user.id,
              role: 'user'
            });
        } catch (roleErr) {
          console.warn('User role creation failed:', roleErr);
        }
      }
      
      // Activity logging removed - only admin dashboard activities are logged
      
      // Toast will be shown by SignUpForm component
      
      return {
        tempUserId: data.user.id,
        email
      };
    } catch (err: any) {
      const message = err instanceof AuthError ? err.message : 'Failed to sign up';
      setError(message);
      
      // Activity logging removed - only admin dashboard activities are logged
      
      // Toast will be shown by SignUpForm component
      throw err;
    } finally {
      setLoading(false);
    }
  }

  const verifyEmail = async (tempUserId: string, verificationCode: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // For Supabase, this would typically be handled by their email verification flow
      // This function is maintained for backward compatibility
      
      // For custom verification, you would do:
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: verificationCode,
        type: 'email',
      });
      
      if (error) throw error;
      
      // Add proper null checking here
      if (!data.user) {
        throw new Error('Verification successful but user data not returned');
      }
      
      // Now safely access user properties
      const userData = {
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.user_metadata?.name || 'User',
        // Other user fields as needed
      };
      
      // Activity logging removed - only admin dashboard activities are logged
      
      // Redirect to dashboard after successful verification
      if (pathname.includes('/auth')) {
        router.push('/dashboards/user'); // Default to user dashboard since roles might not be loaded yet
      }
      
      return userData;
    } catch (err: any) {
      const message = err instanceof AuthError ? err.message : 'Failed to verify email';
      setError(message);
      
      // Activity logging removed - only admin dashboard activities are logged
      
      // Toast will be shown by verification component
      throw err;
    } finally {
      setLoading(false);
    }
  }

  const signOut = async (reason: 'manual' | 'idle' | 'session_expired' = 'manual') => {
    setIsSigningOut(true);
    setLoading(true);
    setError(null);
    setRolesLoading(true);
    
    // Track if process finished
    let finished = false;

    // Clear all local state immediately for instant feedback
    const clearLocalState = () => {
      setUser(null);
      setIsAuthenticated(false);
      setSession(null);
      setRoles([]);
      setRolesLoading(false);
      clearRuntimeCaches();
      // Clear Zustand auth store (removes persisted isAuthenticated from localStorage)
      try { useAuthStore.getState().logout(); } catch (e) {}
    };

    // Force cleanup if process hangs
    const forceCleanup = () => {
      if (finished) return;
      console.warn('[AuthContext] Logout hanging, forcing local cleanup');
      clearLocalState();
      
      // Still attempt local sign out just in case
      supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      
      // Redirect safely
      if (pathname && pathname.startsWith('/admin')) {
        router.push('/admin/login');
        router.refresh();
      } else if (pathname && pathname.startsWith('/dashboards')) {
        router.push('/');
        router.refresh();
      } else {
        router.refresh();
      }
      finished = true;
    };

    // Reduced timeout from 5s to 3s for faster fallback
    const cleanupTimeout = setTimeout(forceCleanup, 3000);

    // ✅ LOGGING: Log logout with proper reason (single source of truth)
    if (user) {
      const isAdminUser = roles.some((r: string) => ['admin', 'super_admin', 'support_agent'].includes(r));
      if (isAdminUser || (pathname && pathname.startsWith('/admin'))) {
        const userName = user.name || user.email || 'Unknown Admin';
        const primaryRole = roles.find((r: string) => ['super_admin', 'admin', 'support_agent'].includes(r)) || roles[0] || 'user';
        
        // Map reason to human-readable description
        const reasonDescriptions = {
          manual: 'User logged out manually',
          idle: 'Auto-logout due to inactivity',
          session_expired: 'Session expired'
        };
        
        logAuthEvent(user.id, user.email, userName, primaryRole, 'logout', 'success', reasonDescriptions[reason]);
      }
    }

    try {
      // 1. Clear query cache first to remove sensitive data
      try { queryClient.clear(); } catch (e) { console.warn('Query cache clear failed', e); }
      
      // 2. Call server-side signout endpoint to clear HttpOnly cookies
      // This is critical - client-side signOut cannot clear HttpOnly cookies
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        await fetch('/api/auth/signout', {
          method: 'POST',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
      } catch (fetchErr) {
        // Server route failed/timed out, fall back to client-side signout
        console.warn('[AuthContext] Server signout failed, using client fallback:', fetchErr);
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      }

      clearTimeout(cleanupTimeout);
      
      if (!finished) {
        // 3. Clear local state
        clearLocalState();
        
        // 4. Show success toast
        toast.showSuccess('Signed out successfully');
        
        // 5. Navigate/Refresh
        if (pathname && pathname.startsWith('/admin')) {
          router.push('/admin/login');
          router.refresh();
        } else if (pathname && pathname.startsWith('/dashboards')) {
          router.push('/');
          router.refresh();
        } else {
          router.refresh();
        }
        finished = true;
      }
    } catch (err: any) {
      console.error('Sign out error:', err);
      forceCleanup();
    } finally {
      clearTimeout(cleanupTimeout);
      setLoading(false);
      setIsSigningOut(false);
      setRolesLoading(false);
    }
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    return { error }
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    return { error }
  }

  const refreshSession = async (options?: { isLogin?: boolean }) => {
    if (isSigningOut) return;
    if (refreshSessionInFlightRef.current) {
      incrementRuntimeCounter('auth.refresh.coalesced');
      return refreshSessionInFlightRef.current;
    }

    const currentRunVersion = ++refreshSessionVersionRef.current;
    const isCurrentRun = () => currentRunVersion === refreshSessionVersionRef.current;

    const run = (async () => {
      const start = Date.now();
      refreshSessionConcurrentRef.current += 1;
      setRuntimeGauge('auth.refresh.concurrent.current', refreshSessionConcurrentRef.current);
      setRuntimeGaugeMax('auth.refresh.concurrent.max', refreshSessionConcurrentRef.current);
      incrementRuntimeCounter('auth.refresh.attempt');
      try {
      // ✅ SECURITY: Verify user is authenticated before refreshing session
      const getUserResult: any = await withTimeout(
        supabase.auth.getUser() as Promise<any>,
        8000,
        'auth.getUser'
      );
      const { data: { user }, error: userError } = getUserResult;
      
      if (userError) {
        // ✅ FIX: If user doesn't exist (deleted or invalid JWT), clear session
        if (userError.message.includes('does not exist') || userError.message.includes('JWT')) {
          console.warn('[AuthContext] Invalid user session detected, clearing:', userError.message);
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          if (!isCurrentRun()) return;
          setUser(null);
          setIsAuthenticated(false);
          setSession(null);
          setRoles([]);
          setRolesLoading(false);
          return;
        }
        
        // Attempt targeted refresh only if near expiry or token error
        if (userError.message.includes('refresh_token')) {
          const refreshResult: any = await withTimeout(
            supabase.auth.refreshSession() as Promise<any>,
            8000,
            'auth.refreshSession'
          );
          const { data: refreshed, error: rtErr } = refreshResult;
            if (!rtErr) {
              if (!isCurrentRun()) return;
              setSession(refreshed.session);
              return;
            }
        }
        console.warn('[AuthContext] getUser error:', userError.message);
        return; // do not clear user prematurely
      }
      
      // User is verified, now get session data
      const getSessionResult: any = await withTimeout(
        supabase.auth.getSession() as Promise<any>,
        8000,
        'auth.getSession'
      );
      const { data: { session } } = getSessionResult;
      
      // ✅ FIX: Fetch profile and roles to ensure user object is complete
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const { data: roleRows } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .is('revoked_at', null);

      const fetchedRoles = roleRows?.map((r: any) => r.role) || [];
      
      // Create enhanced user object
      const userData = {
        id: user.id,
        email: user.email,
        name: profile?.full_name || user.user_metadata?.name || 'User',
        roles: fetchedRoles,
        verified: true,
        accountStatus: profile?.status || 'active',
        avatar_url: profile?.avatar_url || null,
      };

      // Set all states together
      if (!isCurrentRun()) return;
      setSession(session);
      setUser(userData);
      setRoles(fetchedRoles);
      setIsAuthenticated(true);
      setRolesFetchedAt(Date.now());
      setRolesLoading(false);
      
      if (session) {
        // ✅ LOGGING: Log successful login if explicitly triggered
        if (options?.isLogin) {
          const isAdminUser = userData.roles.some((r: string) => ['admin', 'super_admin', 'support_agent'].includes(r));
          const primaryRole = userData.roles.find((r: string) => ['super_admin', 'admin', 'support_agent'].includes(r)) || userData.roles[0] || 'user';
          
          if (isAdminUser || (pathname && (pathname.startsWith('/admin') || pathname.includes('/login')))) {
            // Log as admin login
            await logAuthEvent(user.id, user.email || '', userData.name, primaryRole, 'login', 'success');
          }
        }
        setSession(session);
        const msLeft = (session.expires_at! * 1000) - Date.now();
        if (msLeft < 2 * 60 * 1000) {
          // near expiry: proactive refresh
          const proactiveRefreshResult: any = await withTimeout(
            supabase.auth.refreshSession() as Promise<any>,
            8000,
            'auth.refreshSession'
          );
          const { data: refreshed, error: rErr } = proactiveRefreshResult;
          if (!rErr && isCurrentRun()) setSession(refreshed.session);
        }
      } else {
        // Only clear if confirmed no session after explicit refresh attempt
        const recoveryRefreshResult: any = await withTimeout(
          supabase.auth.refreshSession() as Promise<any>,
          8000,
          'auth.refreshSession'
        );
        const { data: refreshed, error: rErr } = recoveryRefreshResult;
        if (rErr || !refreshed.session) {
          if (!isCurrentRun()) return;
          setUser(null);
          setIsAuthenticated(false);
          setRoles([]);
          setRolesFetchedAt(null);
          setRolesLoading(false);
          setSession(null);
        } else {
          if (!isCurrentRun()) return;
          setSession(refreshed.session);
        }
      }
    } catch (e) {
      incrementRuntimeCounter('auth.refresh.error');
      console.error('[AuthContext] refreshSession unexpected error:', e);
    } finally {
      recordRuntimeDuration('auth.refresh.duration_ms', Date.now() - start);
      refreshSessionConcurrentRef.current = Math.max(0, refreshSessionConcurrentRef.current - 1);
      setRuntimeGauge('auth.refresh.concurrent.current', refreshSessionConcurrentRef.current);
    }
    })();

    const inFlightPromise = run.finally(() => {
      if (refreshSessionInFlightRef.current === inFlightPromise) {
        refreshSessionInFlightRef.current = null;
      }
    });
    refreshSessionInFlightRef.current = inFlightPromise;

    return refreshSessionInFlightRef.current;
  }

  // Explicit roles refresh (for admin changes, approvals etc.)
  const roleRefreshInFlight = useRef(false);

  const refreshRoles = async (force: boolean = false) => {
    if (!user) {
      setRoles([]);
      return;
    }
    try {
      if (roleRefreshInFlight.current) {
        // Prevent overlapping calls; if forced, allow only if previous finished
        // Skip silently if a non-forced call arrives while one is in progress
        if (!force) return;
        // If force but still in flight, wait briefly then proceed (best effort)
      }
      roleRefreshInFlight.current = true;
      const now = Date.now();
      if (!force && rolesFetchedAt && (now - rolesFetchedAt) < ROLE_TTL_MS) {
        // Within TTL window; skip refetch
        roleRefreshInFlight.current = false;
        return;
      }
      setRolesLoading(true);
      const { data: roleRows } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .is('revoked_at', null);
      const list = roleRows?.map((r: any) => r.role) || [];
      setRoles(list);
      // Also mirror into user object to keep shape consistent
      setUser((prev: any) => prev ? { ...prev, roles: list } : prev);
      setRolesFetchedAt(Date.now());
    } catch (e) {
      console.error('Failed to refresh roles', e);
    } finally {
      setRolesLoading(false);
      roleRefreshInFlight.current = false;
    }
  };

  // Refresh user profile data (useful after profile updates like avatar changes)
  const refreshUserProfile = async () => {
    if (!user?.id) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        // Update user object with fresh profile data
        setUser((prevUser: any) => ({
          ...prevUser,
          name: profile.full_name || prevUser.name,
          avatar_url: profile.avatar_url || null,
          accountStatus: profile.status || 'active'
        }));
      }
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
    }
  };

  const hasRole = (role: string) => roles.includes(role);
  const hasAnyRole = (list: string[]) => list.some(r => roles.includes(r));
  const isAdmin = hasAnyRole(['admin','super_admin','support_agent']);
  const isOrganizer = hasRole('organizer');
  const isVenueOwner = hasRole('venue_owner');
  const isReady = initialized && !loading && !rolesLoading; // single flag

  // Add visibility change handler to refresh session when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden && isAuthenticated) {
        const current = session;
        if (current) {
          const msLeft = (current.expires_at! * 1000) - Date.now();
          if (msLeft < 2 * 60 * 1000) {
            await refreshSession();
          }
        } else {
          await refreshSession();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, session]);

  // Add loading timeout to prevent infinite loading
  useEffect(() => {
    if (!loading) return;

    const timeout = setTimeout(() => {
      if (loading) {
        console.error('[AuthContext] Auth initialization timeout');
        setLoading(false);
        setError('Authentication timeout. Please refresh the page.');
      }
    }, 30000); // 30 second timeout

    return () => clearTimeout(timeout);
  }, [loading]);

  // Background session keep-alive (every 5 minutes instead of 9) to avoid silent expiry during cache window
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(async () => {
      if (!session) {
        await refreshSession();
        return;
      }
      const msLeft = (session.expires_at! * 1000) - Date.now();
      // Only refresh proactively if less than 4 minutes remain
      if (msLeft < 4 * 60 * 1000) {
        await refreshSession();
      }
    }, 6 * 60 * 1000); // check every 6 minutes
    return () => clearInterval(interval);
  }, [isAuthenticated, session]);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isAuthenticated,
      loading,
      isSigningOut,
      isLoggingIn,
      setIsLoggingIn,
      error,
      roles,
      rolesLoading,
      hasRole,
      hasAnyRole,
      isReady,
      isAdmin,
      isOrganizer,
      isVenueOwner,
      signIn,
      verifyMFA,
      signUp,
      verifyEmail,
      signOut,
      resetPassword,
      updatePassword,
      refreshSession,
      refreshRoles,
      refreshUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
