import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export function createClient(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // Return stub client (same shape as server.ts fallback) to avoid throwing in edge/middleware when env missing.
    const supabase = {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null })
      },
      from: () => ({
        select: async () => ({ data: null, error: null }),
        update: async () => ({ data: null, error: null }),
        insert: async () => ({ data: null, error: null }),
        delete: async () => ({ data: null, error: null }),
        eq: function () { return this },
        single: async () => ({ data: null, error: null })
      }),
      storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }), upload: async () => ({ error: null }) }) },
      rpc: async () => ({ data: null, error: null })
    } as any
    return { supabase, response }
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request: { headers: request.headers } })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      }
    }
  })

  return { supabase, response }
}