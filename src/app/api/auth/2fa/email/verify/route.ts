import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server/server';
import { emailOTPService } from '@/services/emailOTPService';

/**
 * POST /api/auth/2fa/email/verify
 * Verify email OTP code
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { code } = await request.json();

    if (!code || code.length !== 6) {
      return NextResponse.json({ 
        error: 'Invalid code format' 
      }, { status: 400 });
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the code
    const result = await emailOTPService.verifyOTP(user.id, code);

    if (!result.valid) {
      return NextResponse.json({ 
        error: result.error || 'Invalid verification code' 
      }, { status: 400 });
    }

    // Clean up old codes
    await emailOTPService.cleanupExpiredCodes(user.id);

    return NextResponse.json({ 
      success: true,
      message: 'Code verified successfully'
    });

  } catch (error) {
    console.error('[Email OTP Verify] Error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error' 
    }, { status: 500 });
  }
}
