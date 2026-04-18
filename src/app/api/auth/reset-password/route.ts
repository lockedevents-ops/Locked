import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { emailService } from '@/services/emailService';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Generate the recovery link
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${request.nextUrl.origin}/auth/callback?next=/account/reset-password`
      }
    });

    if (error) {
      console.error('[API Reset Password] Error generating link:', error);
      // Don't reveal user existence, but if it's a real error (like rate limit), we might want to know.
      // For security, usually return success or a generic error.
      // But for debugging now, we log it.
      return NextResponse.json({ error: 'Unable to process request' }, { status: 500 });
    }

    if (!data.properties?.action_link) {
       console.error('[API Reset Password] No action link returned');
       return NextResponse.json({ error: 'Unable to generate link' }, { status: 500 });
    }

    // 2. Send the email using our custom service
    const emailResult = await emailService.sendConfirmation({
      to: email,
      subject: 'Reset Your Password - Locked Events',
      type: 'auth',
      templateType: 'reset_password',
      templateData: {
        actionUrl: data.properties.action_link,
        customerName: data.user?.email?.split('@')[0] || 'User' // Fallback name
      }
    });

    if (!emailResult.success) {
       return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Password reset link sent' });

  } catch (error: any) {
    console.error('[API Reset Password] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
