
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server/server";
import { hubtelService } from "@/services/hubtelService";
import { isHubtelNetworkEnabled } from "@/lib/network";
import { incrementRuntimeCounter } from "@/lib/runtimeTelemetry";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    if (!isHubtelNetworkEnabled()) {
      incrementRuntimeCounter('hubtel.blocked.payouts.status');
      return NextResponse.json({ error: "Payout provider temporarily unavailable" }, { status: 503 });
    }

    const supabase = await createClient();

    // Admin authorization check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const payoutRequestId = searchParams.get('payoutRequestId');
    const clientReference = searchParams.get('clientReference');

    if (!payoutRequestId && !clientReference) {
      return NextResponse.json({ error: "Missing payoutRequestId or clientReference" }, { status: 400 });
    }

    // Fetch payout request
    let query = supabase.from('payout_requests').select('*');
    
    if (payoutRequestId) {
      query = query.eq('id', payoutRequestId);
    } else if (clientReference) {
      query = query.contains('metadata', { client_reference: clientReference });
    }

    const { data: payoutRequests, error: fetchError } = await query;

    if (fetchError || !payoutRequests || payoutRequests.length === 0) {
      return NextResponse.json({ error: "Payout request not found" }, { status: 404 });
    }

    const payoutRequest = payoutRequests[0];
    const actualClientRef = clientReference || (payoutRequest.metadata as any)?.client_reference;

    if (!actualClientRef) {
      return NextResponse.json({ error: "Client reference not found in payout metadata" }, { status: 400 });
    }

    // Call Hubtel Status Check API
    try {
      const statusResponse = await hubtelService.checkPayoutStatus(actualClientRef);

      // Update payout request based on status
      if (statusResponse.ResponseCode === 'success' && statusResponse.Data) {
        const transactionStatus = statusResponse.Data.transactionStatus;
        let dbStatus: 'processing' | 'completed' | 'failed' = 'processing';

        if (transactionStatus === 'success') {
          dbStatus = 'completed';
        } else if (transactionStatus === 'failed') {
          dbStatus = 'failed';
        }

        await supabase
          .from('payout_requests')
          .update({
            status: dbStatus,
            processed_at: dbStatus !== 'processing' ? new Date().toISOString() : null,
            hubtel_reference: statusResponse.Data.TransactionId,
            metadata: {
              ...(payoutRequest.metadata || {}),
              hubtel_status_check: statusResponse,
              checked_at: new Date().toISOString()
            }
          })
          .eq('id', payoutRequest.id);
      }

      return NextResponse.json({
        success: true,
        status: statusResponse.Data?.transactionStatus,
        data: statusResponse.Data
      });

    } catch (hubtelError: any) {
      console.error('Hubtel status check error:', hubtelError);
      return NextResponse.json({
        error: 'Failed to check payout status',
        details: hubtelError.message
      }, { status: 502 });
    }

  } catch (error: any) {
    console.error('Unexpected error in payout status check:', error);
    return NextResponse.json({
      error: 'Internal Server Error',
      details: error.message
    }, { status: 500 });
  }
}
