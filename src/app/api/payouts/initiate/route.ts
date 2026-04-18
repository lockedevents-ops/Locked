
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server/server";
import { hubtelService } from "@/services/hubtelService";
import { isHubtelNetworkEnabled } from "@/lib/network";
import { incrementRuntimeCounter } from "@/lib/runtimeTelemetry";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    if (!isHubtelNetworkEnabled()) {
      incrementRuntimeCounter('hubtel.blocked.payouts.initiate');
      return NextResponse.json({ error: "Payout provider temporarily unavailable" }, { status: 503 });
    }

    const supabase = await createClient();

    // Admin authorization check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 });
    }

    const body = await request.json();
    const { payoutRequestId } = body;

    if (!payoutRequestId) {
      return NextResponse.json({ error: "Missing payoutRequestId" }, { status: 400 });
    }

    // Fetch payout request details
    const { data: payoutRequest, error: fetchError } = await supabase
      .from('payout_requests')
      .select(`
        *,
        payment_method:payment_methods(*)
      `)
      .eq('id', payoutRequestId)
      .single();

    if (fetchError || !payoutRequest) {
      return NextResponse.json({ error: "Payout request not found" }, { status: 404 });
    }

    // Validate not already completed
    if (payoutRequest.status === 'completed') {
      return NextResponse.json({ error: "Payout already completed" }, { status: 400 });
    }

    const paymentMethod = (payoutRequest as any).payment_method;
    if (!paymentMethod) {
      return NextResponse.json({ error: "Payment method not found" }, { status: 400 });
    }

    // Update status to processing
    await supabase
      .from('payout_requests')
      .update({ status: 'processing' })
      .eq('id', payoutRequestId);

    // Generate unique client reference
    const clientReference = `PAYOUT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    let hubtelResponse;
    
    try {
      // Call appropriate Hubtel API based on payment method type
      if (paymentMethod.method_type === 'mobile_money') {
        // Map provider to Hubtel channel
        const channelMap: { [key: string]: 'mtn-gh' | 'vodafone-gh' | 'tigo-gh' } = {
          'mtn': 'mtn-gh',
          'MTN': 'mtn-gh',
          'Telecel': 'vodafone-gh',
          'telecel': 'vodafone-gh',
          'vodafone': 'vodafone-gh',
          'airteltigo': 'tigo-gh',
          'AirtelTigo': 'tigo-gh'
        };

        const channel = channelMap[paymentMethod.provider || 'mtn'] || 'mtn-gh';

        hubtelResponse = await hubtelService.sendMoney({
          recipientName: paymentMethod.account_name,
          recipientMsisdn: paymentMethod.account_number,
          channel: channel,
          amount: payoutRequest.amount,
          clientReference: clientReference,
          description: `Payout to organizer - ${paymentMethod.account_name}`
        });
      } else if (paymentMethod.method_type === 'bank_account') {
        // Bank codes mapping - expand based on hubtel/api_docs/payment/direct_send_to_bank.md
        const bankCodeMap: { [key: string]: string } = {
          'GCB': '300304',
          'Ecobank': '300312',
          'Stanbic': '300318',
          'Fidelity': '300323',
          'Access': '300329',
          'CalBank': '300313',
          'Zenith': '300311',
          'GTBank': '300322',
          'Standard Chartered': '300302',
          'Absa': '300303'
        };

        const bankCode = bankCodeMap[paymentMethod.bank_name || ''] || paymentMethod.bank_name || '300312';

        hubtelResponse = await hubtelService.sendToBank({
          bankCode: bankCode,
          accountNumber: paymentMethod.account_number,
          accountName: paymentMethod.account_name,
          amount: payoutRequest.amount,
          clientReference: clientReference,
          description: `Payout to organizer - ${paymentMethod.account_name}`
        });
      } else {
        throw new Error('Invalid payment method type');
      }

      // Update payout request with Hubtel transaction ID
      const transactionId = hubtelResponse.Data?.TransactionId;
      await supabase
        .from('payout_requests')
        .update({
          hubtel_reference: transactionId,
          metadata: { hubtel_response: hubtelResponse, client_reference: clientReference }
        })
        .eq('id', payoutRequestId);

      return NextResponse.json({
        success: true,
        message: 'Payout initiated successfully',
        transactionId: transactionId,
        responseCode: hubtelResponse.ResponseCode
      });

    } catch (hubtelError: any) {
      console.error('Hubtel payout error:', hubtelError);

      // Update payout request status to failed
      await supabase
        .from('payout_requests')
        .update({
          status: 'failed',
          failure_reason: hubtelError.message,
          processed_at: new Date().toISOString()
        })
        .eq('id', payoutRequestId);

      return NextResponse.json({
        error: 'Failed to process payout with Hubtel',
        details: hubtelError.message
      }, { status: 502 });
    }

  } catch (error: any) {
    console.error('Unexpected error in payout initiation:', error);
    return NextResponse.json({
      error: 'Internal Server Error',
      details: error.message
    }, { status: 500 });
  }
}
