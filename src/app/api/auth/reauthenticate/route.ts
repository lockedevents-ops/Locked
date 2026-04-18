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

    const adminSupabase = createAdminClient();

    // Use 'recovery' link for reauthentication/verification
    const { data, error } = await adminSupabase.auth.admin.generateLink({
      type: 'recovery',
      email: user.email!,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/auth/callback?next=/dashboards/settings&verified=true`
      }
    });

    if (error) throw error;

    // Send custom reauthentication email
    await emailService.sendConfirmation({
      to: user.email!,
      subject: 'Verify Your Identity - Locked Events',
      type: 'auth',
      templateType: 'reauthenticate',
      templateData: {
        customerName: user.user_metadata?.full_name || 'there',
        actionUrl: data.properties.action_link,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Reauthentication error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send reauthentication email' },
      { status: 500 }
    );
  }
}
