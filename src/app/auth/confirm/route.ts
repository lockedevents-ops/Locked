import { createClient } from '@/lib/supabase/server/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { emailService } from '@/services/emailService'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  // 1. Resolve base URL for redirects
  const xForwardedHost = request.headers.get('x-forwarded-host')
  const hostHeader = request.headers.get('host')
  const host = xForwardedHost || hostHeader
  const protocol = request.headers.get('x-forwarded-proto') || (origin.startsWith('https') ? 'https' : 'http')
  const envAppUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL)?.trim().replace(/\/$/, '')
  
  let baseUrl: string

  // Priority logic for dynamic domain resolution
  if (host && !host.includes('localhost')) {
    baseUrl = `${protocol}://${host}`
  } else if (envAppUrl && !envAppUrl.includes('localhost')) {
    baseUrl = envAppUrl
  } else {
    baseUrl = origin
  }

  // 2. Security: Ensure https for all production domains
  if (!baseUrl.includes('localhost') && baseUrl.startsWith('http:')) {
    baseUrl = baseUrl.replace('http:', 'https:')
  }

  // 3. Process the auth code
  if (code) {
    const supabase = await createClient()

    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        // Check if this is a genuinely new user (created in the last few minutes)
        const createdAt = new Date(user.created_at);
        const now = new Date();
        const diffInMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60;

        if (diffInMinutes < 5) {
            // Send welcome email - await with timeout to ensure it completes
            const emailPromise = emailService.sendConfirmation({
              to: user.email,
              subject: 'Welcome to Locked Events!',
              type: 'auth',
              templateType: 'welcome',
              templateData: {
                  customerName: user.user_metadata?.full_name || user.user_metadata?.name || 'there',
              }
            });
            
            // Wait up to 5 seconds for the email to send, then redirect anyway
            await Promise.race([
              emailPromise,
              new Promise(resolve => setTimeout(resolve, 5000))
            ]).catch(err => console.error('Failed to send welcome email:', err));
        }
      }

      // Email confirmed successfully, redirect to sign-in with verified flag
      return NextResponse.redirect(new URL('/auth/signin?verified=true', baseUrl))
    }

    // ✅ ROBUST ERROR HANDLING:
    // Email scanners (Outlook/Gmail) often pre-click links, consuming the one-time token.
    // If the error message suggests it's already been used or expired, 
    // we redirect to sign-in anyway as the scanner likely already verified them.
    const errorMessage = error.message?.toLowerCase() || ''
    if (errorMessage.includes('already been used') || errorMessage.includes('expired') || errorMessage.includes('invalid')) {
      return NextResponse.redirect(new URL('/auth/signin?verified=true&fallback=true', baseUrl))
    }

    // Log unexpected errors for debugging
    console.error('Email confirmation error:', error)
  }

  // 4. Fallback: Redirect to error page
  return NextResponse.redirect(new URL('/auth/confirm/error', baseUrl))
}
