import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/services/emailService';

export async function POST(req: NextRequest) {
  try {
    // Security check: Verify the webhook secret
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    
    // Supabase webhook payload structure: { record: { ... }, old_record: { ... }, type: 'INSERT', ... }
    const { record, type } = payload;

    if (type !== 'INSERT' || !record) {
      return NextResponse.json({ message: 'Skipping: Not a new record' });
    }

    const { email, full_name } = record;

    if (!email) {
      return NextResponse.json({ error: 'No email found in record' }, { status: 400 });
    }

    // Send Welcome Email
    const result = await emailService.sendConfirmation({
      to: email,
      subject: 'Welcome to Locked Events!',
      type: 'auth',
      templateType: 'welcome',
      templateData: {
        customerName: full_name || 'there',
      }
    });

    if (result.success) {
      return NextResponse.json({ success: true, message: 'Welcome email sent' });
    } else {
      throw new Error(result.error);
    }

  } catch (error: any) {
    console.error('[Welcome Webhook Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
