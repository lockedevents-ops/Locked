import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/services/emailService';

/**
 * API Route: POST /api/email/confirm-registration
 * Used by the client-side registration service to trigger confirmation emails on the server.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, customerName, eventDetails, ticketDetails } = await request.json();

    if (!email || !eventDetails) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    const result = await emailService.sendConfirmation({
      to: email,
      subject: `Confirmation: You're going to ${eventDetails.title}!`,
      type: 'transactional',
      templateData: {
        customerName: customerName,
        eventTitle: eventDetails.title,
        eventDate: eventDetails.date,
        eventTime: eventDetails.time,
        eventVenue: eventDetails.venue,
        eventImage: eventDetails.imageUrl,
        ticketDetails: ticketDetails,
        viewTicketsUrl: `${request.nextUrl.origin}/dashboard/user/tickets`
      }
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API Confirm Registration] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
