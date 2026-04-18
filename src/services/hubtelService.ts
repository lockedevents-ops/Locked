
import { HubtelPaymentRequest, HubtelPaymentResponse } from "@/types/transaction";
import { fetchWithTimeout, isHubtelNetworkEnabled } from "@/lib/network";
import { incrementRuntimeCounter } from "@/lib/runtimeTelemetry";

const HUBTEL_INITIATE_URL = "https://payproxyapi.hubtel.com/items/initiate";
const HUBTEL_TIMEOUT_MS = 12000;

function assertHubtelEnabled() {
  if (!isHubtelNetworkEnabled()) {
    incrementRuntimeCounter('hubtel.blocked.disabled');
    throw new Error('Hubtel outbound network calls are disabled (HUBTEL_NETWORK_ENABLED=false).');
  }
}

export const hubtelService = {
  async initiatePayment(paymentDetails: Partial<HubtelPaymentRequest>): Promise<HubtelPaymentResponse> {
    assertHubtelEnabled();
    const clientId = process.env.HUBTEL_CLIENT_ID;
    const clientSecret = process.env.HUBTEL_CLIENT_SECRET;
    const merchantAccountNumber = process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (!clientId || !clientSecret || !merchantAccountNumber) {
        throw new Error("Missing Hubtel configuration");
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const payload: HubtelPaymentRequest = {
        totalAmount: paymentDetails.totalAmount!,
        description: paymentDetails.description!,
        callbackUrl: paymentDetails.callbackUrl || `${appUrl}/api/webhooks/hubtel`,
        returnUrl: paymentDetails.returnUrl || `${appUrl}/payment/callback`, // We might need a generic callback page or specific ones
        cancellationUrl: paymentDetails.cancellationUrl || `${appUrl}/payment/cancelled`,
        merchantAccountNumber: merchantAccountNumber,
        clientReference: paymentDetails.clientReference!,
        ...paymentDetails,
    };

    const response = await fetchWithTimeout(HUBTEL_INITIATE_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${auth}`,
            "Cache-Control": "no-cache",
        },
        body: JSON.stringify(payload),
    }, HUBTEL_TIMEOUT_MS, 'Hubtel initiate payment');

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Hubtel API Error: ${response.status} - ${errorText}`);
    }

    const data: HubtelPaymentResponse = await response.json();
    return data;
  },

  /**
   * Send money to mobile money wallet (Direct Send Money API)
   * Docs: hubtel/api_docs/payment/direct_send_money.md
   */
  async sendMoney(params: {
    recipientName: string;
    recipientMsisdn: string; // e.g., '233200010000'
    channel: 'mtn-gh' | 'vodafone-gh' | 'tigo-gh';
    amount: number;
    clientReference: string;
    description: string;
    customerEmail?: string;
  }): Promise<any> {
    assertHubtelEnabled();
    const prepaidDepositId = process.env.HUBTEL_PREPAID_DEPOSIT_ID;
    const clientId = process.env.HUBTEL_CLIENT_ID;
    const clientSecret = process.env.HUBTEL_CLIENT_SECRET;
    const callbackUrl = process.env.HUBTEL_PAYOUT_CALLBACK_URL || `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/hubtel/payout`;

    if (!prepaidDepositId || !clientId || !clientSecret) {
      throw new Error('Missing Hubtel payout configuration');
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const apiUrl = `https://smp.hubtel.com/api/merchants/${prepaidDepositId}/send/mobilemoney`;

    const payload = {
      RecipientName: params.recipientName,
      RecipientMsisdn: params.recipientMsisdn,
      CustomerEmail: params.customerEmail || '',
      Channel: params.channel,
      Amount: params.amount,
      PrimaryCallbackURL: callbackUrl,
      Description: params.description,
      ClientReference: params.clientReference
    };

    const response = await fetchWithTimeout(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(payload)
    }, HUBTEL_TIMEOUT_MS, 'Hubtel send money');

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hubtel Send Money Error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  },

  /**
   * Send money to bank account (Direct Send-To-Bank API)
   * Docs: hubtel/api_docs/payment/direct_send_to_bank.md
   */
  async sendToBank(params: {
    bankCode: string; // e.g., '300312' for Ecobank
    accountNumber: string;
    accountName?: string;
    amount: number;
    clientReference: string;
    description: string;
    recipientPhoneNumber?: string;
  }): Promise<any> {
    assertHubtelEnabled();
    const prepaidDepositId = process.env.HUBTEL_PREPAID_DEPOSIT_ID;
    const clientId = process.env.HUBTEL_CLIENT_ID;
    const clientSecret = process.env.HUBTEL_CLIENT_SECRET;
    const callbackUrl = process.env.HUBTEL_PAYOUT_CALLBACK_URL || `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/hubtel/payout`;

    if (!prepaidDepositId || !clientId || !clientSecret) {
      throw new Error('Missing Hubtel payout configuration');
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const apiUrl = `https://smp.hubtel.com/api/merchants/${prepaidDepositId}/send/bank/gh/${params.bankCode}`;

    const payload = {
      Amount: params.amount,
      BankName: '',
      BankBranch: '',
      BankBranchCode: '',
      BankAccountNumber: params.accountNumber,
      BankAccountName: params.accountName || '',
      ClientReference: params.clientReference,
      PrimaryCallbackUrl: callbackUrl,
      Description: params.description,
      RecipientPhoneNumber: params.recipientPhoneNumber || ''
    };

    const response = await fetchWithTimeout(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(payload)
    }, HUBTEL_TIMEOUT_MS, 'Hubtel send to bank');

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hubtel Send-To-Bank Error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  },

  /**
   * Check payout transaction status
   * MANDATORY: Use when no callback received after 5 minutes
   * Docs: hubtel/api_docs/payment/direct_send_money.md (Status Check section)
   */
  async checkPayoutStatus(clientReference: string): Promise<any> {
    assertHubtelEnabled();
    const prepaidDepositId = process.env.HUBTEL_PREPAID_DEPOSIT_ID;
    const clientId = process.env.HUBTEL_CLIENT_ID;
    const clientSecret = process.env.HUBTEL_CLIENT_SECRET;

    if (!prepaidDepositId || !clientId || !clientSecret) {
      throw new Error('Missing Hubtel payout configuration');
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const apiUrl = `https://smrsc.hubtel.com/api/merchants/${prepaidDepositId}/transactions/status?clientReference=${clientReference}`;

    const response = await fetchWithTimeout(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Cache-Control': 'no-cache'
      }
    }, HUBTEL_TIMEOUT_MS, 'Hubtel payout status');

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hubtel Status Check Error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }
};

