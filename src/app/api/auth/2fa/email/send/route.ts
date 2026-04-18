import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server/server';
import { emailOTPService } from '@/services/emailOTPService';

/**
 * POST /api/auth/2fa/email/send
 * Send email OTP code to user
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: Check if user has requested too many codes recently
    const activeCodeCount = await emailOTPService.getActiveCodeCount(user.id);
    if (activeCodeCount >= 3) {
      return NextResponse.json({ 
        error: 'Too many requests. Please wait 5 minutes before requesting another code.' 
      }, { status: 429 });
    }

    // Send OTP to user's email
    const result = await emailOTPService.sendOTP(user.id, user.email!);

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Failed to send verification code' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Verification code sent to your email'
    });

  } catch (error) {
    console.error('[Email OTP Send] Error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error' 
    }, { status: 500 });
  }
}
