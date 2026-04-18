import { createClient } from '@/lib/supabase/proxy'
import { NextResponse, type NextRequest } from 'next/server'
import { getRuntimeTelemetrySnapshot, incrementRuntimeCounter, recordRuntimeDuration } from '@/lib/runtimeTelemetry'

export async function proxy(request: NextRequest) {
  // 1. Create client and initialize response
  // This handles the cookie passing automatically via the createClient helper
  const { supabase, response } = createClient(request)
  
  // 2. Refresh Session (fail-fast)
  // Keep this bounded so middleware never blocks request completion indefinitely.
  const timeoutMs = 4500
  const start = Date.now()
  try {
    incrementRuntimeCounter('proxy.auth.refresh.attempt')
    await Promise.race([
      supabase.auth.getUser(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`proxy auth timeout after ${timeoutMs}ms`)), timeoutMs)
      ),
    ])
    incrementRuntimeCounter('proxy.auth.refresh.success')
  } catch (error) {
    // Degrade gracefully: keep request flowing even if auth refresh failed.
    incrementRuntimeCounter('proxy.auth.refresh.timeout_or_error')
    const timeoutCount = getRuntimeTelemetrySnapshot().counters['proxy.auth.refresh.timeout_or_error'] || 0
    console.warn(`[proxy] auth refresh skipped (count=${timeoutCount}):`, error)
  } finally {
    recordRuntimeDuration('proxy.auth.refresh.duration_ms', Date.now() - start)
  }

  // 3. Return the response with the potentially updated cookies
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (usually images)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
