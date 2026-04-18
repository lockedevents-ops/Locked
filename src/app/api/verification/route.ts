import { NextRequest, NextResponse } from 'next/server';
import { fetchWithTimeout, isHubtelNetworkEnabled } from '@/lib/network';
import { incrementRuntimeCounter } from '@/lib/runtimeTelemetry';

const HUBTEL_POS_SALES_ID = process.env.NEXT_PUBLIC_HUBTEL_POS_SALES_ID || '11684';
const HUBTEL_CLIENT_ID = process.env.HUBTEL_CLIENT_ID;
const HUBTEL_CLIENT_SECRET = process.env.HUBTEL_CLIENT_SECRET;

export async function POST(req: NextRequest) {
  try {
    if (!isHubtelNetworkEnabled()) {
      incrementRuntimeCounter('hubtel.blocked.verification');
      return NextResponse.json(
        { error: 'Verification provider temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    const { type, ...params } = await req.json();
    
    if (!HUBTEL_CLIENT_ID || !HUBTEL_CLIENT_SECRET) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const authHeader = `Basic ${Buffer.from(`${HUBTEL_CLIENT_ID}:${HUBTEL_CLIENT_SECRET}`).toString('base64')}`;
    let url = '';
    let method = 'GET';
    let body = null;

    if (type === 'bank') {
      const { bankCode, accountNumber } = params;
      url = `https://rnv.hubtel.com/v2/merchantaccount/merchants/${HUBTEL_POS_SALES_ID}/bank/verify/${bankCode}/${accountNumber}`;
    } else if (type === 'momo') {
      const { provider, phoneNumber } = params;
      // Map provider for momo
      let channel = '';
      if (provider.toLowerCase().includes('mtn')) channel = 'mtn-gh';
      else if (provider.toLowerCase().includes('telecel') || provider.toLowerCase().includes('vodafone')) channel = 'vodafone-gh';
      else if (provider.toLowerCase().includes('airtel') || provider.toLowerCase().includes('tigo')) channel = 'tigo-gh';
      
      if (!channel) return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
      
      url = `https://rnv.hubtel.com/v2/merchantaccount/merchants/${HUBTEL_POS_SALES_ID}/mobilemoney/verify?channel=${channel}&customerMsisdn=${phoneNumber}`;
    } else if (type === 'ghana_card') {
      method = 'POST';
      url = `https://rnv.hubtel.com/v2/merchantaccount/merchants/${HUBTEL_POS_SALES_ID}/ghanacard/verify`;
      body = JSON.stringify(params);
    } else {
      return NextResponse.json({ error: 'Invalid verification type' }, { status: 400 });
    }

    const response = await fetchWithTimeout(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: body
    }, 12000, 'Hubtel verification request');

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Verification proxy error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
