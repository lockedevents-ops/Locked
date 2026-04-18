export type TransactionStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type TransactionType = 'TICKET' | 'MERCH' | 'VOTE';

export interface Transaction {
  id: string;
  user_id?: string;
  event_id?: string;
  organizer_id?: string;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  hubtel_checkout_id?: string;
  client_reference: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface HubtelPaymentRequest {
    totalAmount: number;
    description: string;
    callbackUrl: string;
    returnUrl: string;
    cancellationUrl: string;
    merchantAccountNumber: string;
    clientReference: string;
}

export interface HubtelPaymentResponse {
    responseCode: string;
    status: string;
    data: {
        checkoutUrl: string;
        checkoutId: string;
        clientReference: string;
        message?: string;
        checkoutDirectUrl?: string;
    };
}
