import { createBrowserClient } from '@supabase/ssr'

// Use a singleton instance in the browser to prevent redundant instances and connection leaks
let browserClient: any = null;

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Return a dummy client for build time / static generation
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: 'Missing env vars' } }),
        signOut: async () => ({ error: null }),
        mfa: {
          listFactors: async () => ({ data: [], error: null }),
          challengeAndVerify: async () => ({ data: null, error: { message: 'Missing env vars' } })
        },
        verifyOtp: async () => ({ data: { user: null }, error: { message: 'Missing env vars' } }),
        signUp: async () => ({ data: { user: null }, error: { message: 'Missing env vars' } }),
        resetPasswordForEmail: async () => ({ error: { message: 'Missing env vars' } }),
        updateUser: async () => ({ error: { message: 'Missing env vars' } })
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
            maybeSingle: async () => ({ data: null, error: null }),
            is: async () => ({ data: null, error: null })
          }),
          is: () => ({
             eq: async () => ({ data: null, error: null })
          }), 
          map: () => []
        }),
        insert: async () => ({ error: null }),
        update: async () => ({ error: null }),
        delete: async () => ({ error: null })
      }),
      storage: {
        from: () => ({
          upload: async () => ({ error: null }),
          getPublicUrl: () => ({ data: { publicUrl: '' } })
        })
      }
    } as any;
  }

  // ✅ BROWSER SINGLETON: Ensure we only create one client in the browser
  if (typeof window !== 'undefined') {
    if (browserClient) return browserClient;

    browserClient = createBrowserClient(
      url, 
      key,
      {
        cookies: {
          getAll() {
            return document.cookie
              .split('; ')
              .filter(Boolean)
              .map(cookie => {
                const [name, ...rest] = cookie.split('=');
                return { name, value: rest.join('=') };
              });
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              let cookieString = `${name}=${value}`;
              if (options?.maxAge !== undefined) cookieString += `; max-age=${options.maxAge}`;
              if (options?.expires) cookieString += `; expires=${options.expires.toUTCString()}`;
              cookieString += `; path=${options?.path || '/'}`;
              if (options?.domain) cookieString += `; domain=${options.domain}`;
              if (options?.sameSite) cookieString += `; samesite=${options.sameSite}`;
              if (options?.secure) cookieString += '; secure';
              document.cookie = cookieString;
            });
          }
        },
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          flowType: 'pkce'
        },
        global: {
          fetch: async (url, options = {}) => {
            const maxRetries = 1; // Reduced from 2 to prevent long waits
            let lastError;
            for (let i = 0; i <= maxRetries; i++) {
              try {
                // Reduced timeout from 15s to 5s for faster failure detection
                const response = await fetch(url, {
                  ...options,
                  signal: AbortSignal.timeout(5000)
                });
                return response;
              } catch (error) {
                lastError = error;
                if (i < maxRetries) {
                  // Single retry with 500ms delay
                  await new Promise(r => setTimeout(r, 500));
                }
              }
            }
            throw lastError;
          }
        }
      }
    );
    return browserClient;
  }

  // Server-side: always create a new instance as expected by Next.js SSR
  return createBrowserClient(url, key, { cookies: { getAll: () => [], setAll: () => {} } });
}

// Kept for backward compatibility, but effectively a no-op now
export function resetSupabaseClient() {
  // No-op
}
