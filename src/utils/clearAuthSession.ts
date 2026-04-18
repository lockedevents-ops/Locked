/**
 * Utility to clear stale authentication sessions
 * Use this when encountering JWT errors or "User does not exist" errors
 */

import { createClient } from '@/lib/supabase/client/client';

export async function clearAuthSession() {
  try {
    // Try server-side signout first to clear HttpOnly cookies
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 3000);
      
      await fetch('/api/auth/signout', {
        method: 'POST',
        signal: controller.signal,
      });
    } catch {
      // Fallback to local signout
      const supabase = createClient();
      await supabase.auth.signOut({ scope: 'local' });
    }
    
    console.log('[ClearAuthSession] Successfully cleared stale session');
    
    // Optionally reload the page to reset all state
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/signin';
    }
  } catch (error) {
    console.error('[ClearAuthSession] Error clearing session:', error);
  }
}

