import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch all registrations for this event using Admin client to bypass RLS
    const { data: registrations, error } = await supabase
      .from('event_registrations')
      .select('ticket_type, quantity_registered, status')
      .eq('event_id', eventId)
      .in('status', ['registered', 'checked_in', 'confirmed']); // Only count active/valid registrations

    if (error) {
      console.error('[Stats API] Error fetching registrations:', error);
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    const regs = registrations || [];
    
    // Aggregate by ticket type
    const byTicketType = regs.reduce((acc: { [key: string]: number }, reg: any) => {
      const type = reg.ticket_type;
      acc[type] = (acc[type] || 0) + (reg.quantity_registered || 0);
      return acc;
    }, {});

    return NextResponse.json({
      total_registrations: regs.reduce((sum, r) => sum + (r.quantity_registered || 0), 0),
      registrations_by_ticket_type: byTicketType
    });

  } catch (error) {
    console.error('[Stats API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
