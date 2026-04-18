import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { emailService } from '@/services/emailService';

// This endpoint should be secured with a CRON_SECRET or similar if deployed publicly
export async function GET(req: NextRequest) {
  try {
    // Security check: Only allow Vercel Crons or requests with the CRON_SECRET
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const now = new Date();

    // ============================================================================
    // 1. EVENT REMINDERS (12h and 3h Alerts)
    // ============================================================================
    
    // Logic: Find events starting in the specified windows
    // Window 1: 12h from now (+/- 30 mins)
    // Window 2: 3h from now (+/- 30 mins)
    
    const { data: upcomingEvents, error: eventsError } = await supabase
      .from('events')
      .select('id, title, start_date, start_time, venue, location_address')
      .eq('status', 'published');

    if (eventsError) throw eventsError;

    for (const event of upcomingEvents || []) {
      if (!event.start_date || !event.start_time) continue;

      const eventStart = new Date(`${event.start_date.substring(0, 10)}T${event.start_time}`);
      const diffMs = eventStart.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      let reminderType: 'event_12h' | 'event_3h' | null = null;
      if (diffHours > 11.5 && diffHours <= 12.5) reminderType = 'event_12h';
      else if (diffHours > 2.5 && diffHours <= 3.5) reminderType = 'event_3h';

      if (reminderType) {
        // Fetch attendees for this event
        const { data: attendees } = await supabase
          .from('event_registrations')
          .select('attendee_email, attendee_name')
          .eq('event_id', event.id)
          .in('status', ['registered', 'confirmed']);

        for (const attendee of attendees || []) {
          // Check if already sent
          const { data: existing } = await supabase
            .from('email_reminders')
            .select('id')
            .eq('recipient_email', attendee.attendee_email)
            .eq('reminder_type', reminderType)
            .eq('event_id', event.id)
            .maybeSingle();

          if (!existing) {
            // Send Email
            await emailService.sendConfirmation({
              to: attendee.attendee_email,
              subject: `${reminderType === 'event_12h' ? '12 Hours to Go!' : 'Starting Soon!'} - ${event.title}`,
              type: 'auth',
              templateType: 'event_reminder',
              templateData: {
                customerName: attendee.attendee_name,
                eventTitle: event.title,
                eventTime: event.start_time,
                eventVenue: event.venue || event.location_address || 'TBD',
                actionUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/events/${event.id}`
              }
            });

            // Mark as sent
            await supabase.from('email_reminders').insert({
              recipient_email: attendee.attendee_email,
              reminder_type: reminderType,
              event_id: event.id
            });
          }
        }
      }
    }

    // ============================================================================
    // 2. CART REMINDERS (24h Abandoned Carts)
    // ============================================================================
    
    // Find cart items created between 23h and 25h ago
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const windowStart = new Date(oneDayAgo.getTime() - 60 * 60 * 1000); // 25h ago
    const windowEnd = new Date(oneDayAgo.getTime() + 60 * 60 * 1000);   // 23h ago

    const { data: abandonedCarts, error: cartError } = await supabase
      .from('cart_items')
      .select('user_id, event_id, events(title)')
      .gt('created_at', windowStart.toISOString())
      .lt('created_at', windowEnd.toISOString());

    if (cartError) throw cartError;

    // Unique pairs of user/event
    const uniqueCarts = Array.from(new Set(abandonedCarts?.map(c => `${c.user_id}:${c.event_id}`)));

    for (const cartKey of uniqueCarts) {
      const [userId, eventId] = cartKey.split(':');
      const cartInfo = abandonedCarts?.find(c => c.user_id === userId && c.event_id === eventId);
      
      // Get User Email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single();

      if (profile?.email) {
        // Check if reminder sent
        const { data: existing } = await supabase
          .from('email_reminders')
          .select('id')
          .eq('recipient_email', profile.email)
          .eq('reminder_type', 'cart_24h')
          .eq('event_id', eventId)
          .maybeSingle();

        if (!existing) {
          // Send Reminder
          await emailService.sendConfirmation({
            to: profile.email,
            subject: 'Did you forget something? - Locked Events',
            type: 'auth',
            templateType: 'cart_reminder',
            templateData: {
              customerName: profile.full_name || 'there',
              eventTitle: (cartInfo?.events as any)?.title || 'your event',
              actionUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboards/user/cart`
            }
          });

          // Record
          await supabase.from('email_reminders').insert({
            recipient_email: profile.email,
            reminder_type: 'cart_24h',
            event_id: eventId
          });
        }
      }
    }

    return NextResponse.json({ success: true, processedAt: now.toISOString() });
  } catch (error) {
    console.error('[CRON Error]:', error);
    return NextResponse.json({ error: 'Cron execution failed' }, { status: 500 });
  }
}
