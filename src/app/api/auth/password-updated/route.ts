import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server/server';
import { emailService } from '@/services/emailService';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { browser, os, time } = await req.json();

    // Send password updated notification
    await emailService.sendConfirmation({
      to: user.email!,
      subject: 'Password Updated - Locked Events',
      type: 'auth',
      templateType: 'password_updated',
      templateData: {
        customerName: user.user_metadata?.full_name || 'there',
        browser,
        os,
        time,
        actionUrl: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/auth/forgot-password`
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password update notification error:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
