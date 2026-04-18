'use server'

import { createClient } from '@/lib/supabase/server/server'
import { createAdminClient } from '@/lib/supabase/server/admin'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

// Max attempts before lockout
const MAX_ATTEMPTS = 3;
// Lockout duration in minutes (5 hours = 300 minutes)
const LOCKOUT_MINUTES = 300;

interface AdminLoginResult {
  success: boolean;
  error?: string;
  fieldError?: { email?: string; password?: string };
  lockout?: { remainingMinutes: number; lockedUntil: string };
  session?: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at?: number;
    token_type: string;
  };
}

/**
 * Secure Admin Login Action
 * Enforces rate limiting by IP and handles logging
 */
export async function loginAdminAction(formData: FormData): Promise<AdminLoginResult> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  
  if (!email || !password) {
    return { success: false, error: 'Email and password are required' };
  }

  // Standard client for AUTH (user session)
  const supabase = await createClient();
  // Admin client for DB (rate limiting table with RLS)
  const adminDb = await createAdminClient();
  
  // 1. Get IP Address
  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : '127.0.0.1';
  
  console.log(`[AdminAuth] Attempt from IP: ${ip} (Forwarded: ${forwarded})`);

  // 2. Check Rate Limit / Lockout
  const { data: attemptRecord, error: checkError } = await adminDb
    .from('admin_login_attempts')
    .select('*')
    .eq('ip_address', ip)
    .single();

  if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = JSON object requested, multiple (or no) results returned (no rows is fine here if assuming maybeSingle, but .single() gives error on no rows)
      // Actually .single() returns 406 if no rows. Let's use maybeSingle to be cleaner?
      // Or just ignore specific errors.
      console.warn('Rate limit check failed:', checkError);
  }

  if (attemptRecord) {
    // Check if currently locked
    if (attemptRecord.locked_until) {
      const lockedUntil = new Date(attemptRecord.locked_until);
      if (lockedUntil > new Date()) {
        const remainingMs = lockedUntil.getTime() - Date.now();
        const remainingMinutes = Math.ceil(remainingMs / 60000);
        
        return { 
          success: false, 
          error: `Too many failed attempts. Access locked for this IP.`,
          lockout: { remainingMinutes, lockedUntil: attemptRecord.locked_until }
        };
      } else {
        // Lock expired, reset
        await adminDb
          .from('admin_login_attempts')
          .update({ locked_until: null, attempt_count: 0 })
          .eq('ip_address', ip);
      }
    }
  }

  // 3. Attempt Authentication (Use Standard Client to verify user creds)
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  // 4. Handle Failure
  if (authError || !authData.user) {
    // TREAT AS FAILURE: Record attempt and check for lockout
    const lockoutResult = await recordFailedAttempt(ip, adminDb);
    if (lockoutResult) return lockoutResult;

    // GENERIC ERROR MESSAGE (Sanitized)

    // GENERIC ERROR MESSAGE (Sanitized)
    return { success: false, error: 'Invalid email or password.' };
  }

  // 5. Handle Success
  
  // Verify Admin Role
  const { data: rolesData } = await adminDb
      .from('user_roles')
      .select('role')
      .eq('user_id', authData.user.id)
      .is('revoked_at', null);

  const roles = rolesData?.map((r: any) => r.role) || [];
  const isAdmin = roles.some((r: string) => ['admin', 'super_admin', 'support_agent'].includes(r));

  if (!isAdmin) {
    // Sign out immediately using server client (can clear HttpOnly cookies)
    await supabase.auth.signOut();
    
    // Log intent but hide specific role info from user
    console.warn(`[Admin Login Config] Non-admin user ${email} tried to access admin panel.`);

    // TREAT AS FAILURE: Record attempt and check for lockout
    const lockoutResult = await recordFailedAttempt(ip, adminDb, email);
    if (lockoutResult) return lockoutResult;
    
    return { success: false, error: 'Insufficient permissions.' };
  }

  // Clear attempts on success using ADMIN CLIENT
  await adminDb
    .from('admin_login_attempts')
    .delete()
    .eq('ip_address', ip);

  // Log successful admin login to audit logs
  // NOTE: Login logging is now handled by AuthContext.signIn() via logAuthEvent
  // which includes device info. This prevents duplicate logging.
  // Keeping the role detection for potential future use
  const selectedRole = roles.includes('super_admin') ? 'super_admin' : 
                       roles.includes('admin') ? 'admin' : 'support_agent';
  
  console.log(`[AdminAuth] Admin ${email} authenticated successfully with role: ${selectedRole}`);

  // Success! Return session so client can set it
  // This is needed because the server-side signInWithPassword sets HttpOnly cookies,
  // but the browser client won't see them until a page refresh. By returning the
  // session tokens, the client can call setSession() to immediately sync state.
  return { 
    success: true,
    session: authData.session ? {
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      expires_in: authData.session.expires_in,
      expires_at: authData.session.expires_at,
      token_type: authData.session.token_type,
    } : undefined
  };
}

// Helper to record failed attempts
async function recordFailedAttempt(ip: string, adminDb: any, email: string | null = null): Promise<AdminLoginResult | null> {
    // Get current count
    const { data: current } = await adminDb
        .from('admin_login_attempts')
        .select('attempt_count')
        .eq('ip_address', ip)
        .single();
    
    const newCount = (current?.attempt_count || 0) + 1;
    let lockedUntil: string | null = null;
    
    if (newCount >= MAX_ATTEMPTS) {
      const lockTime = new Date();
      lockTime.setMinutes(lockTime.getMinutes() + LOCKOUT_MINUTES);
      lockedUntil = lockTime.toISOString();
    }

    console.log(`[AdminAuth] Recording failure ${newCount}/${MAX_ATTEMPTS} for IP ${ip} (Target: ${email || 'unknown'})`);

    // Upsert failure record using ADMIN CLIENT
    const { error: upsertError } = await adminDb.from('admin_login_attempts').upsert({
      ip_address: ip,
      attempt_count: newCount,
      last_attempt_at: new Date().toISOString(),
      locked_until: lockedUntil
    });

    if (upsertError) {
        console.error('[AdminAuth] DB Upsert Failed:', upsertError);
    } else {
        console.log(`[AdminAuth] Successfully logged failed attempt for ${ip}`);
    }

    if (lockedUntil) {
        // Log LOCKOUT event to audit logs
        // Log LOCKOUT event to audit logs
        const { error: auditError } = await adminDb.from('admin_audit_logs').insert({
            action_type: 'ip_lockout',
            target_type: 'system',
            admin_user_name: 'System Security',
            title: 'IP Lockdown Triggered',
            description: `Locked for ${LOCKOUT_MINUTES} minutes after ${newCount} failed attempts`,
            ip_address: ip,
            status: 'warning',
            severity: 'high',
            details: {
                attempted_email: email,
                lockout_duration: LOCKOUT_MINUTES,
                failed_attempts: newCount,
                original_action: 'security_lockout'
            },
            created_at: new Date().toISOString()
        });
        
        if (auditError) {
             console.error('[AdminAuth] Failed to log lockout to audit DB:', auditError);
        } else {
             console.log(`[AdminAuth] Audited LOCKOUT for IP ${ip}`);
        }

       return { 
          success: false, 
          error: `Too many failed attempts. Access locked for this IP.`,
          lockout: { remainingMinutes: LOCKOUT_MINUTES, lockedUntil: lockedUntil }
        };
    }
    
    return null; 
}
