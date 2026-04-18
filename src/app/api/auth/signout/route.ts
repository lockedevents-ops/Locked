import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server/server';

/**
 * Server-side signout endpoint
 * 
 * This route properly clears HttpOnly session cookies that cannot be
 * cleared from the client side. The client-side supabase.auth.signOut()
 * can only clear non-HttpOnly cookies, leaving the session intact.
 * 
 * Flow:
 * 1. Call Supabase signOut() on the server (has cookie access)
 * 2. Explicitly delete all Supabase auth cookies
 * 3. Return success so client can clear local state
 */
export async function POST() {
  try {
    const supabase = await createClient();
    
    // Sign out via Supabase - this clears the server session
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('[signout] Supabase signOut error:', error.message);
      // Continue anyway - we still want to clear cookies
    }
    
    // Explicitly clear all Supabase auth cookies
    // Supabase uses several cookies for auth state
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    // Delete any cookie that looks like a Supabase auth cookie
    const supabaseCookiePrefixes = [
      'sb-',
      'supabase-auth-token',
      '__session',
    ];
    
    for (const cookie of allCookies) {
      const isSupabaseCookie = supabaseCookiePrefixes.some(prefix => 
        cookie.name.startsWith(prefix) || cookie.name.includes('-auth-token')
      );
      
      if (isSupabaseCookie) {
        // Delete with all common path/domain combinations
        cookieStore.delete({
          name: cookie.name,
          path: '/',
        });
      }
    }
    
    return NextResponse.json(
      { success: true, message: 'Signed out successfully' },
      { status: 200 }
    );
  } catch (err) {
    console.error('[signout] Unexpected error:', err);
    
    // Even on error, try to clear cookies
    try {
      const cookieStore = await cookies();
      const allCookies = cookieStore.getAll();
      
      for (const cookie of allCookies) {
        if (cookie.name.startsWith('sb-') || cookie.name.includes('-auth-token')) {
          cookieStore.delete({ name: cookie.name, path: '/' });
        }
      }
    } catch (cookieErr) {
      console.error('[signout] Cookie cleanup error:', cookieErr);
    }
    
    return NextResponse.json(
      { success: false, error: 'Signout failed but cookies cleared' },
      { status: 200 } // Still return 200 so client proceeds with cleanup
    );
  }
}
