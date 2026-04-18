import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Safe server Supabase client factory.
 * Adds a guard so static prerender (e.g. _not-found) does not crash if env vars are missing.
 * If env vars are absent, returns a lightweight stub instead of throwing.
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // Fallback stub: enough shape for code paths that only check auth/user or perform no-op selects.
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
      },
      from: () => ({
        select: async () => ({ data: null, error: null }),
        update: async () => ({ data: null, error: null }),
        insert: async () => ({ data: null, error: null }),
        delete: async () => ({ data: null, error: null }),
        eq: function () { return this },
        single: async () => ({ data: null, error: null })
      }),
      storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' }}), upload: async () => ({ error: null }) }) },
      rpc: async () => ({ data: null, error: null })
    } as any
  }

  const cookieStore = await cookies()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      }
    }
  })
}