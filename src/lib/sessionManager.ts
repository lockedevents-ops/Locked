/**
 * Session Management Utility
 * 
 * Handles Supabase session refresh and validation to prevent auth failures
 * during long-running operations like event creation forms.
 * 
 * CRITICAL FIX: Prevents session expiration issues that cause silent failures
 * when users spend time filling out forms.
 */

import { createClient } from '@/lib/supabase/client/client';
import { incrementRuntimeCounter, recordRuntimeDuration } from '@/lib/runtimeTelemetry';

/**
 * Refreshes the current Supabase session if needed
 * @returns Object with user and error information
 */
export async function refreshSession() {
  const supabase = createClient();
  const start = Date.now();
  try {
    incrementRuntimeCounter('sessionManager.refresh.attempt');
    // 1. Check if we have a session (token might be expired, that's okay)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // If no session at all, we can't refresh
    if (sessionError || !session) {
      return { user: null, error: sessionError || new Error('No active session found'), isExpired: false };
    }

    // 2. Check time remaining
    const msLeft = (session.expires_at! * 1000) - Date.now();
    const isCloseToExpiry = msLeft < 2 * 60 * 1000; // Less than 2 minutes
    
    // 3. If we have plenty of time, just verify the user is still valid
    if (!isCloseToExpiry) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (!userError && user) {
        incrementRuntimeCounter('sessionManager.refresh.success');
        return { user, error: null, isExpired: false };
      }
      // If getUser failed but we have a session, it might be invalid/revoked server-side
      // Fall through to refresh attempt as a last resort
    }

    // 4. Perform refresh
    console.log('🔄 Session near expiry or user check failed, refreshing...');
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.error('❌ Session refresh failed:', refreshError);
      return { user: null, error: refreshError, isExpired: true };
    }

    const newSession = refreshData.session;
    if (!newSession) {
      return { user: null, error: new Error('No active session after refresh'), isExpired: true };
    }

    // 5. Get final verified user
    const { data: { user: refreshedUser }, error: finalUserError } = await supabase.auth.getUser();
    
    if (finalUserError || !refreshedUser) {
      return { user: null, error: finalUserError || new Error('User not found after refresh'), isExpired: true };
    }

    incrementRuntimeCounter('sessionManager.refresh.success');
    return { user: refreshedUser, error: null, isExpired: false };

  } catch (error) {
    incrementRuntimeCounter('sessionManager.refresh.error');
    console.error('❌ Unexpected error during session refresh:', error);
    return { user: null, error: error as Error, isExpired: true };
  } finally {
    recordRuntimeDuration('sessionManager.refresh.duration_ms', Date.now() - start);
  }
}

/**
 * Validates current session without refresh
 * @returns Boolean indicating if session is valid
 */
export async function validateSession() {
  const supabase = createClient();
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    return !error && !!user;
  } catch {
    return false;
  }
}

/**
 * Gets the current user with automatic session refresh if needed
 * 
 * This is the PREFERRED method for critical operations like:
 * - Event creation
 * - Payment processing
 * - Profile updates
 * - Any long-form submissions
 * 
 * @returns Object with user and error information
 */
export async function getCurrentUserWithRefresh() {
  const supabase = createClient();
  
  // Timeout safety for network hangs
  const AUTH_TIMEOUT_MS = 10000; // 10 seconds
  
  const authPromise = (async () => {
    // First, try to get the user without refresh
    const { data: { user }, error } = await supabase.auth.getUser();
    
    // If successful, return immediately
    if (!error && user) {
      return {
        user,
        error: null,
        wasRefreshed: false
      };
    }
    
    // If failed, try refreshing the session
    console.log('🔄 User fetch failed, attempting session refresh...');
    const refreshResult = await refreshSession();
    
    return {
      user: refreshResult.user,
      error: refreshResult.error,
      wasRefreshed: true,
      isExpired: refreshResult.isExpired
    };
  })();

  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Authentication check timed out')), AUTH_TIMEOUT_MS)
  );

  return Promise.race([authPromise, timeoutPromise]) as Promise<{
    user: any;
    error: any;
    wasRefreshed: boolean;
    isExpired?: boolean;
  }>;
}

/**
 * Session keep-alive mechanism for long forms
 * 
 * Call this on form interaction (typing, clicking, etc.) to keep session fresh
 * Implements throttling to avoid excessive API calls
 * 
 * @param intervalMs - Minimum time between refresh attempts (default: 5 minutes)
 */
let lastRefreshTime = 0;
const DEFAULT_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export async function keepSessionAlive(intervalMs: number = DEFAULT_REFRESH_INTERVAL) {
  const now = Date.now();
  
  // Only refresh if enough time has passed
  if (now - lastRefreshTime < intervalMs) {
    incrementRuntimeCounter('sessionManager.keepAlive.skipped');
    return {
      skipped: true,
      reason: 'Too soon since last refresh'
    };
  }
  
  lastRefreshTime = now;
  const result = await refreshSession();
  incrementRuntimeCounter('sessionManager.keepAlive.executed');
  
  return {
    skipped: false,
    success: !result.error,
    error: result.error
  };
}

/**
 * Creates a session monitor for forms
 * Returns cleanup function
 * 
 * Usage:
 * ```typescript
 * useEffect(() => {
 *   const cleanup = createSessionMonitor();
 *   return cleanup;
 * }, []);
 * ```
 */
export function createSessionMonitor(intervalMs: number = 10 * 60 * 1000) {
  // Background refresh ownership has moved to AuthContext.
  // Keep this as a no-op cleanup to avoid duplicate session monitors.
  incrementRuntimeCounter('sessionManager.monitor.noop_created');
  const intervalId = setInterval(() => {
    incrementRuntimeCounter('sessionManager.monitor.noop_tick');
  }, intervalMs);
  return () => {
    clearInterval(intervalId);
  };
}
