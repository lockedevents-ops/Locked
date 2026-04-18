# Recurring Invoice API Documentation

**Last updated:** December 23rd, 2025

## Overview

The Hubtel Recurring Invoice API allows you to setup and receive recurring payments from your customers for services provided using mobile money.

With a single integration, you can accept recurring mobile money payments on your application. All you need is to provide the customer debit details and Hubtel will handle the scheduling and the various debit deductions.

The following provides an overview of the REST API endpoints for interacting programmatically with the Hubtel Recurring Invoice API within your application.

---

## Available Channels

| Mobile Money Provider | Channel Name   |
|----------------------|---------------|
| MTN Ghana            | mtn_gh_rec    |
| Telecel Ghana        | vodafone_gh_rec |

---

## Getting Started

### Business IP Whitelisting
You must share your public IP address with your Retail System Engineer for whitelisting.

> **Note:** All API Endpoints are live and only requests from whitelisted IP(s) can reach these endpoints. Requests from non-whitelisted IPs will return a 403 Forbidden error or timeout. Maximum 4 IP addresses per service.

---

## Understanding the Service Flow

The Hubtel Recurring Invoice service includes two main API endpoints which are used together to setup a recurring payment invoice:

- **Create Invoice Endpoint:** Create a recurring payment invoice on a customer wallet. The invoice stays in a temporary state until verification is done.
- **Verify Invoice Endpoint:** Verify the invoice with customer involvement through an OTP code. This completes the invoice creation process.

The process is asynchronous. The steps for creating and verifying a Recurring Payment Invoice:

| Step | Description                                                                 |
|------|-----------------------------------------------------------------------------|
| 1    | Your App sends an Invoice Creation request to Hubtel.                       |
| 2    | Hubtel authenticates and responds with a unique identifier (RecurringInvoiceId). |
| 3    | Hubtel sends verification OTP code to customer number.                      |
| 4    | Your App sends an Invoice Verification request to Hubtel with OTP and ID.   |
| 5    | Hubtel prompts customer to approve and responds to Your App.                |
| 6    | Hubtel performs initial debit on the customer's wallet.                     |
| 7    | After first payment, a callback is sent to your App.                        |
| 8    | Whenever invoice is due, a direct debit is made and a callback is sent.     |

> **Note:** For MTN numbers, all pending requests are accessible in the preapprovals list on *170#. Customers can use this feature if they do not get a prompt after a preapproval request.

![Recurring Invoice Flow](../../api_flow_images/recurring_invoice.png)

```mermaid
sequenceDiagram
    participant ClientApp as Client App
    participant Hubtel
    participant Customer
    
    rect rgb(240, 248, 255)
    note right of ClientApp: Setup & Verification
    ClientApp->>Hubtel: Create Invoice Request
    Hubtel-->>ClientApp: Response (RecurringInvoiceId)
    Hubtel->>Customer: Send Verification OTP
    Customer-->>ClientApp: Share OTP
    ClientApp->>Hubtel: Verify Invoice (with OTP)
    Hubtel->>Customer: Prompt for Approval
    Customer->>Hubtel: Approves Setup
    Hubtel->>ClientApp: Callback (Setup Complete & First Payment)
    end
    
    rect rgb(255, 250, 240)
    note right of ClientApp: Recurring Payments
    loop Every Interval
        Hubtel->>Customer: Auto-Debit Wallet
        Hubtel->>ClientApp: Callback (Payment Success/Fail)
    end
    end
```

---

## API Reference

### Create Invoice API

**API Endpoint:** `https://rip.hubtel.com/api/proxy/{POS_Sales_ID}/create-invoice`

**Request Type:** POST

**Content Type:** JSON

#### Request Parameters

| Parameter            | Type    | Requirement | Description                                                                 |
|----------------------|---------|------------|-----------------------------------------------------------------------------|
| orderDate            | String  | Mandatory  | Date the invoice is created (ISO 8601 format).                              |
| invoiceEndDate       | String  | Mandatory  | Date the invoice ends (ISO 8601 format).                                    |
| description          | String  | Mandatory  | Brief description of the transaction.                                       |
| startTime            | String  | Mandatory  | Time of day for debit (hh:mm).                                              |
| paymentInterval      | String  | Mandatory  | Interval between payments: DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY.       |
| customerMobileNumber | String  | Mandatory  | Customer’s mobile money number (international format).                      |
| paymentOption        | String  | Mandatory  | Payment option: MobileMoney.                                                |
| channel              | String  | Mandatory  | Mobile money channel: mtn_gh_rec, vodafone_gh_rec, hubtel_gh.               |
| customerName         | String  | Optional   | Name of the customer.                                                       |
| recurringAmount      | Float   | Mandatory  | Amount debited whenever invoice is due.                                     |
| totalAmount          | Float   | Mandatory  | Total amount to be debited. Pass same value as recurringAmount.              |
| initialAmount        | Float   | Mandatory  | Amount for the first payment.                                                |
| currency             | String  | Mandatory  | Currency of the transaction.                                                |
| callbackUrl          | String  | Mandatory  | URL to receive callback for successful invoice creation and debit.           |

#### Sample Create Invoice Request (MTN)

```http
POST /api/proxy/11684/create-invoice HTTP/1.1
Host: rip.hubtel.com
Accept: application/json
Content-Type: application/json
Authorization: Basic endjeOBiZHhza250fT3=
Cache-Control: no-cache

{
  "orderDate": "2022-01-28T08:57:00",
  "invoiceEndDate": "2022-01-31T08:57:00",
  "description": "Extreme Gaming Service",
  "startTime": "14:00",
  "paymentInterval": "DAILY",
  "customerMobileNumber": "233246012176",
  "paymentOption": "MobileMoney",
  "channel": "mtn_gh_rec",
  "customerName": "Daniel Barnes",
  "recurringAmount": 0.10,
  "totalAmount": 0.10,
  "initialAmount": 0.10,
  "currency": "GHS",
  "callbackUrl": "https://webhook.site/b503d1a9-e726-f315254a6ede"
}
```

#### Sample Create Invoice Request (Telecel)

```http
POST /api/proxy/11684/create-invoice HTTP/1.1
Host: rip.hubtel.com
Accept: application/json
Content-Type: application/json
Authorization: Basic endjeOBiZHhza250fT3=
Cache-Control: no-cache

{
  "orderDate": "2022-01-28T08:57:00",
  "invoiceEndDate": "2022-01-31T08:57:00",
  "description": "Extreme Gaming Service",
  "startTime": "14:00",
  "paymentInterval": "DAILY",
  "customerMobileNumber": "233200012176",
  "paymentOption": "MobileMoney",
  "channel": "vodafone_gh_rec",
  "customerName": "Daniel Barnes",
  "recurringAmount": 0.10,
  "totalAmount": 0.10,
  "initialAmount": 0.10,
  "currency": "GHS",
  "callbackUrl": "https://webhook.site/b503d1a9-e726-f315254a6ede"
}
```

#### Sample Response

```json
{
  "responseCode": "0001",
  "message": "Your request has been processed successfully.",
  "data": {
    "recurringInvoiceId": "0f84e20a2839482e807128e8c21d08d6",
    "requestId": "a6487bc44eae44849fd80326a0dd802a",
    "otpPrefix": "OQDM"
  }
}
```

---

### Verify Invoice API

**API Endpoint:** `https://rip.hubtel.com/api/proxy/verify-invoice`

**Request Type:** POST

**Content Type:** JSON

#### Request Parameters

| Parameter            | Type    | Requirement | Description                                                                 |
|----------------------|---------|------------|-----------------------------------------------------------------------------|
| recurringInvoiceId   | String  | Mandatory  | Unique ID for the recurring invoice (from create invoice response).         |
| requestId            | String  | Mandatory  | Verification request ID (from create invoice response).                     |
| otpCode              | String  | Mandatory  | OTP code for verification (prefix + code, e.g. OQDM-9514).                  |

#### Sample Verify Invoice Request

```http
POST /api/proxy/verify-invoice HTTP/1.1
Host: rip.hubtel.com
Accept: application/json
Content-Type: application/json
Authorization: Basic endjeOBiZHhza250fT3=
Cache-Control: no-cache
{
  "recurringInvoiceId": "0f84e20a2839482e807128e8c21d08d6",
  "requestId": "a6487bc44eae44849fd80326a0dd802a",
  "otpCode": "OQDM-9514"
}
```

#### Sample Response

```json
{
  "responseCode": "0001",
  "message": "Your request has been processed successfully. You will receive a callback on the final status shortly.",
  "data": {
    "recurringInvoiceId": "0f84e20a2839482e807128e8c21d08d6"
  }
}
```

---

## Callback

When you provide a callback URL in your invoice creation request, you will be sent a callback on the final state of the invoice as well as the final state of all payments made on that invoice. The callback URL should listen for an HTTP POST payload from Hubtel.

Invoice creation requires a one-time approval from the customer for money to move from the mobile money wallet into your Hubtel Account. Invoice creation is asynchronous; the final status may take up to 10 minutes. Implement an HTTP callback on your server to receive the final status.

#### Sample Callback (Successful)

```json
{
  "ResponseCode": "0000",
  "Message": "Success",
  "Data": {
    "OrderId": "1d0e06bc689c4de2bb87a54829a89640",
    "Description": "My recurring service",
    "RecurringInvoiceId": "8ae267e31af748d4934b0420be6f47f0",
    "TransactionId": "5814152092296267804084",
    "ClientReference": "8ae267e31af748d4934b0420be6f47f0",
    "ExternalTransactionId": "5814152092296267804084",
    "OrderDate": "2020-02-10 09:58:00",
    "InvoiceEndDate": "2021-10-14 12:00:00",
    "CustomerMobileNumber": "233246912184",
    "Charges": 0.01,
    "AmountAfterCharges": 0.19,
    "AmountCharged": 0.20,
    "Amount": 0.20,
    "InitialAmount": 0.20,
    "RecurringAmount": 0.10
  }
}
```

#### Sample Callback (Failed)

```json
{
  "ResponseCode": "2001",
  "Message": "Failed",
  "Data": {
    "OrderId": "1d0e06bc689c4de2bb87a54829a89640",
    "Description": "My recurring service",
    "RecurringInvoiceId": "8ae267e31af748d4934b0420be6f47f0",
    "TransactionId": "5814152092296267804084",
    "ClientReference": "8ae267e31af748d4934b0420be6f47f0",
    "ExternalTransactionId": null,
    "OrderDate": "2020-02-10 09:58:00",
    "InvoiceEndDate": "2021-10-14 12:00:00",
    "CustomerMobileNumber": "233246912184",
    "Charges": 0.01,
    "AmountAfterCharges": 0.19,
    "AmountCharged": 0.20,
    "Amount": 0.20,
    "InitialAmount": 0.20,
    "RecurringAmount": 0.10
  }
}
```

---

## Cancel Invoice API

**API Endpoint:** `https://rip.hubtel.com/api/proxy/{POS_Sales_ID}/cancel-invoice/{recurringInvoiceId}`

**Request Type:** DELETE

**Content Type:** JSON

#### Request Parameters

| Parameter            | Type    | Requirement | Description                                                                 |
|----------------------|---------|------------|-----------------------------------------------------------------------------|
| recurringInvoiceId   | String  | Mandatory  | Unique ID for the recurring invoice (from create invoice response).         |

#### Sample Cancel Invoice Request

```http
DELETE /api/proxy/11684/cancel-invoice/0f84e20a2839482e807128e8c21d08d6 HTTP/1.1
Host: rip.hubtel.com
Accept: application/json
Content-Type: application/json
Authorization: Basic endjeOBiZHhza250f3=
Cache-Control: no-cache
```

#### Sample Cancel Invoice Response

```json
{
  "responseCode": "0000",
  "message": "Your request has been processed successfully"
}
```

#### Sample Callback for Cancel Invoice

```json
{
  "ResponseCode": "0005",
  "Message": "The Repeat Payment Invoice has been Deactivated Successfully",
  "Data": {
    "OrderId": null,
    "Description": "My recurring service",
    "RecurringInvoiceId": "8ae267e31af748d4934b0420be6f47f0",
    "TransactionId": "",
    "ClientReference": "",
    "ExternalTransactionId": "",
    "OrderDate": "2020-02-10 09:58:00",
    "InvoiceEndDate": "2021-10-14 12:00:00",
    "CustomerMobileNumber": "233246912184",
    "Charges": 0.01,
    "AmountAfterCharges": 0.19,
    "AmountCharged": 0.20,
    "Amount": 0.20,
    "InitialAmount": 0.20,
    "RecurringAmount": 0.10
  }
}
```

---

## Response Codes

The Hubtel Sales API uses standard HTTP error reporting. Successful requests return HTTP status codes in the 2xx range. Failed requests return status codes in 4xx and 5xx. Response codes are included in the JSON response body, which contain information about the response.

| Response Code | Description                                                                                                    |
|---------------|----------------------------------------------------------------------------------------------------------------|
| 0000          | The transaction was successful. (final status)                                                                 |
| 0001          | Pending State. The transaction has been processed successfully. A callback will be sent on the final state.    |
| 0005          | HTTP failure/exception or Successful Invoice Cancellation.                                                     |
| 2001          | The transaction failed. Approval failed or initial payment failed.                                             |
| 4000          | Validation Errors. Something is not quite right with this request.                                             |
| 4101          | Authorization for request is denied.                                                                          |
| 4103          | Permission denied                                                                                              |

---

## Notes
- Update this document whenever the configuration or API changes.
- For more details, refer to the project README or contact the development team.
