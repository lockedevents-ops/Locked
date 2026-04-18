import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server/server'
import { emailService } from '@/services/emailService'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  // 1. Resolve base URL for redirects
  const xForwardedHost = request.headers.get('x-forwarded-host')
  const hostHeader = request.headers.get('host')
  const protocol = request.headers.get('x-forwarded-proto') || (origin.startsWith('https') ? 'https' : 'http')
  const envAppUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL)?.trim().replace(/\/$/, '')
  
  let baseUrl: string

  const host = xForwardedHost || hostHeader

  // Priority logic:
  // A. Use the host header if it's available and not internal "localhost" from a non-local request
  if (host && !host.includes('localhost')) {
    baseUrl = `${protocol}://${host}`
  } 
  // B. Fallback to configured environment variable if valid
  else if (envAppUrl && !envAppUrl.includes('localhost')) {
    baseUrl = envAppUrl
  } 
  // C. Final fallback to the request origin (correct for local development)
  else {
    baseUrl = origin
  }

  // 2. Security: Ensure https for all production domains
  if (!baseUrl.includes('localhost') && baseUrl.startsWith('http:')) {
    baseUrl = baseUrl.replace('http:', 'https:')
  }

  // 3. Process the auth code
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Check if it's a new user (optional refinement: or just send welcome email on every first login)
      // Since we can't easily distinguish first login here without DB lookup, 
      // we can rely on the fact that existing users might get a "Welcome" email again 
      // OR ideally we check if profile exists/is new.
      // For now, let's keep it simple: we trigger it. 
      // NOTE: Ideally, the DB webhook handles "New User Only" logic.
      // But if user requested NO webhooks, we do it here.
      
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
          const customerName = user.user_metadata?.full_name || user.user_metadata?.name || 'there';
          const createdAt = new Date(user.created_at);
          const now = new Date();
          const diffInMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60;
          
          // Determine OAuth provider from user metadata
          const provider = user.app_metadata?.provider || 'OAuth';
          const providerLabel = provider.charAt(0).toUpperCase() + provider.slice(1);

          // Send welcome email for new users (created in last 5 minutes)
          if (diffInMinutes < 5) {
             const emailPromise = emailService.sendConfirmation({
                to: user.email,
                subject: 'Welcome to Locked Events!',
                type: 'auth',
                templateType: 'welcome',
                templateData: { customerName }
             });
             
             await Promise.race([
               emailPromise,
               new Promise(resolve => setTimeout(resolve, 5000))
             ]).catch(err => console.error('Failed to send welcome email:', err));
          }
          
          // Send security alert for ALL OAuth sign-ins (new and existing users)
          const securityAlertPromise = emailService.sendConfirmation({
            to: user.email,
            subject: 'New Sign-in Detected',
            type: 'auth',
            templateType: 'security_alert',
            templateData: {
              customerName,
              browser: `${providerLabel} Sign-In`,
              time: new Date().toLocaleString(),
            }
          });
          
          await Promise.race([
            securityAlertPromise,
            new Promise(resolve => setTimeout(resolve, 3000))
          ]).catch(err => console.error('Failed to send security alert:', err));
      }

      return NextResponse.redirect(`${baseUrl.replace(/\/$/, '')}${next}`)
    }
  }

  // 4. Fallback: return to error page
  return NextResponse.redirect(`${baseUrl.replace(/\/$/, '')}/auth/auth-code-error`)
}
