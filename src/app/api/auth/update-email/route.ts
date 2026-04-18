import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { emailService } from '@/services/emailService';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { newEmail } = await req.json();

    if (!newEmail) {
      return NextResponse.json({ error: 'New email is required' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // 1. Generate link for the NEW email
    const { data: newEmailLinkData, error: newEmailError } = await adminSupabase.auth.admin.generateLink({
      type: 'email_change_new',
      email: user.email!, // Current email is needed as identifier
      newEmail: newEmail,  // New email for the change
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/auth/callback?next=/dashboards/settings&verified=true`
      }
    });

    if (newEmailError) throw newEmailError;

    // 2. Generate link for the CURRENT email
    const { data: currentEmailLinkData, error: currentEmailError } = await adminSupabase.auth.admin.generateLink({
      type: 'email_change_current',
      email: user.email!, // Current email
      newEmail: newEmail,  // New email
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/auth/callback?next=/dashboards/settings`
      }
    });

    if (currentEmailError) throw currentEmailError;

    // 3. Send custom email to NEW address
    await emailService.sendConfirmation({
      to: newEmail,
      subject: 'Verify Your New Email - Locked Events',
      type: 'auth',
      templateType: 'email_change',
      templateData: {
        customerName: user.user_metadata?.full_name || 'there',
        actionUrl: newEmailLinkData.properties.action_link,
      }
    });

    // 4. Send notification or verification to CURRENT address
    await emailService.sendConfirmation({
      to: user.email!,
      subject: 'Email Change Requested - Locked Events',
      type: 'auth',
      templateType: 'reauthenticate', 
      templateData: {
        customerName: user.user_metadata?.full_name || 'there',
        actionUrl: currentEmailLinkData.properties.action_link,
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Verification emails sent to both your current and new email addresses.' 
    });
  } catch (error: any) {
    console.error('Email update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate email update' },
      { status: 500 }
    );
  }
}
