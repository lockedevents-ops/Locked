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

    // 1. Generate the magic link
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${request.nextUrl.origin}/auth/callback?next=/dashboard`
      }
    });

    if (error) {
      console.error('[API Magic Link] Error:', error);
      return NextResponse.json({ error: 'Unable to process request' }, { status: 500 });
    }

    if (!data.properties?.action_link) {
       return NextResponse.json({ error: 'Unable to generate link' }, { status: 500 });
    }

    // 2. Send the email custom
    const emailResult = await emailService.sendConfirmation({
      to: email,
      subject: 'Sign in to Locked Events',
      type: 'auth',
      templateType: 'magic_link',
      templateData: {
        actionUrl: data.properties.action_link,
        customerName: data.user?.email?.split('@')[0] || 'User'
      }
    });

    if (!emailResult.success) {
       return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Magic link sent' });

  } catch (error: any) {
    console.error('[API Magic Link] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
