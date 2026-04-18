import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { emailService } from '@/services/emailService';

export async function POST(request: NextRequest) {
  try {
    const { email, role = 'user' } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Generate the invite link
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        // Redirect to a page where the user sets their password/profile
        redirectTo: `${request.nextUrl.origin}/auth/callback?next=/auth/setup-account`
      }
    });

    if (error) {
      console.error('[API Invite User] Error:', error);
      return NextResponse.json({ error: 'Unable to invite user' }, { status: 500 });
    }

    if (!data.properties?.action_link) {
       return NextResponse.json({ error: 'Unable to generate link' }, { status: 500 });
    }

    // 2. Send the email custom
    const emailResult = await emailService.sendConfirmation({
      to: email,
      subject: 'You\'re invited to Locked Events',
      type: 'auth',
      templateType: 'invite',
      templateData: {
        actionUrl: data.properties.action_link,
        customerName: 'Friend' 
      }
    });

    if (!emailResult.success) {
       return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Invitation sent' });

  } catch (error: any) {
    console.error('[API Invite User] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
