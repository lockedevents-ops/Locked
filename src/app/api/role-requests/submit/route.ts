import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server/server';
import { emailService } from '@/services/emailService';
import { isVenuesEnabled } from '@/lib/network';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      request_type,
      company_name,
      business_email,
      business_phone,
      additional_contact,
      business_category,
      id_type,
      id_number,
      id_image_url,
      selfie_with_id_url,
      organization_description
    } = body;

    if (request_type === 'venue_owner' && !isVenuesEnabled()) {
      return NextResponse.json({ error: 'Venue owner requests are temporarily disabled' }, { status: 403 });
    }

    // Insert role request
    const { data: requestData, error: insertError } = await supabase
      .from('role_requests')
      .insert({
        user_id: user.id,
        request_type,
        company_name,
        business_email,
        business_phone,
        additional_contact,
        business_category,
        id_type,
        id_number,
        id_image_url,
        selfie_with_id_url,
        organization_description,
        status: 'pending',
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Role Request Submit] Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 📧 Background Task: Send confirmation email
    // We don't await this to ensure the user gets an immediate response
    const sendBackgroundEmail = async () => {
      try {
        const roleLabel = request_type === 'organizer' ? 'Event Organizer' : 'Venue Owner';
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single();

        if (profile?.email) {
          console.log(`[Role Request Submit] Background: Sending email to ${profile.email}...`);
          const result = await emailService.sendConfirmation({
            to: profile.email,
            subject: 'Role Request Received',
            type: 'auth',
            templateType: 'role_request_submitted',
            templateData: {
              customerName: profile.full_name || 'there',
              roleLabel: roleLabel
            }
          });
          if (result.success) {
            console.log(`✅ [Role Request Submit] Background: Email sent to ${profile.email}`);
          } else {
            console.warn(`❌ [Role Request Submit] Background: Email failed:`, result.error);
          }
        }
      } catch (emailErr) {
        console.warn('⚠️ [Role Request Submit] Background email task failed:', emailErr);
      }
    };

    // Kick off the background task
    sendBackgroundEmail();

    return NextResponse.json({ success: true, data: requestData });

  } catch (error) {
    console.error('[Role Request Submit] API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
