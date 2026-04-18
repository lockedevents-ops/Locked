/**
 * Hubtel Payout Webhook Handler
 * Receives callbacks from Hubtel for payout (send money) transactions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { Data, ResponseCode } = body;
    
    if (!Data || !Data.ClientReference) {
      return NextResponse.json({ error: 'Invalid Payload' }, { status: 400 });
    }

    const { ClientReference, TransactionId, Description } = Data;
    
    // Map Hubtel ResponseCode to database status
    // 0000 = success, others = failed
    let dbStatus: 'processing' | 'completed' | 'failed' = 'processing';
    if (ResponseCode === '0000') {
      dbStatus = 'completed';
    } else {
      dbStatus = 'failed';
    }

    const supabase = await createClient();
    
    // Find payout request by client reference in metadata
    const { data: payoutRequests, error: fetchError } = await supabase
      .from('payout_requests')
      .select('*')
      .contains('metadata', { client_reference: ClientReference });

    if (fetchError) {
      console.error('Error fetching payout request:', fetchError);
      return NextResponse.json({ error: 'Database fetch failed' }, { status: 500 });
    }

    if (!payoutRequests || payoutRequests.length === 0) {
      console.warn(`No payout request found for clientReference: ${ClientReference}`);
      return NextResponse.json({ error: 'Payout request not found' }, { status: 404 });
    }

    const payoutRequest = payoutRequests[0];

    // Update payout request status
    const updateData: any = {
      status: dbStatus,
      processed_at: (dbStatus === 'completed' || dbStatus === 'failed') ? new Date().toISOString() : null,
      metadata: {
        ...(payoutRequest.metadata || {}),
        hubtel_callback: body,
        updated_at: new Date().toISOString()
      }
    };


    if (dbStatus === 'failed') {
      updateData.failure_reason = Description || 'Transaction failed';
    }

    if (TransactionId) {
      updateData.hubtel_reference = TransactionId;
    }

    const { error: updateError } = await supabase
      .from('payout_requests')
      .update(updateData)
      .eq('id', payoutRequest.id);

    if (updateError) {
      console.error('Error updating payout request:', updateError);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    console.log(`Payout ${ClientReference} updated to ${dbStatus}`);
    return NextResponse.json({ success: true });

  } catch (e: any) {
    console.error('Payout webhook processing error:', e);
    return NextResponse.json({ error: 'Webhook error', details: e.message }, { status: 500 });
  }
}

// Handle GET requests (for webhook verification)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const challenge = searchParams.get('challenge');

  if (challenge) {
    return NextResponse.json({ challenge });
  }

  return NextResponse.json({
    status: 'active',
    message: 'Hubtel payout webhook endpoint'
  });
}
