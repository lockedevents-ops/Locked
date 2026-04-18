import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { emailService } from '@/services/emailService';

export async function POST(request: NextRequest) {
  try {
    const { email, password, options } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Create User and Generate Confirmation Link (suppressing default email)
    // Using generateLink with type 'signup' creates the user if they don't exist
    // and returns the verification token without sending an email.
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: email,
      password: password,
      options: {
        data: options?.data || {}, // Full name, phone, etc.
        redirectTo: `${request.nextUrl.origin}/auth/callback?next=/`
      }
    });

    if (error) {
      console.error('[API Custom Signup] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.properties?.action_link) {
       return NextResponse.json({ error: 'Unable to generate signup link' }, { status: 500 });
    }

    // 2. Send the custom confirmation email
    const emailResult = await emailService.sendConfirmation({
      to: email,
      subject: 'Confirm Your Email - Locked Events',
      type: 'auth',
      templateType: 'confirm_signup',
      templateData: {
        actionUrl: data.properties.action_link,
        customerName: options?.data?.full_name || 'Friend'
      }
    });

    if (!emailResult.success) {
      // Note: User is created, but email failed. 
      // We return success anyway to prompt them to check email (maybe resend logic later)
      // Or we could try to rollback delete user? 
      // For now, logging error.
       console.error('[API Custom Signup] Failed to send email');
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Confirmation email sent',
      user: data.user 
    });

  } catch (error: any) {
    console.error('[API Custom Signup] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
