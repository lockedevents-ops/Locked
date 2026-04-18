# Direct Send Money API Documentation

**Last updated:** December 23rd, 2025

## Overview

The Hubtel Sales API allows you to sell goods and services online, instore, and on mobile. With a single integration, you can:

- Accept mobile money payments on your application
- Sell services in-store, online, and on mobile
- Process all your sales on your Hubtel account
- Send money to your customers

This API can be used for e-commerce payments, mobile banking, bulk payments, and more. You can also accept payments for goods and services into your account.

The following provides an overview of the Send Money API endpoints for interacting programmatically within your application.

---

## Available Channels

| Mobile Money Provider | Channel Name   |
|----------------------|---------------|
| MTN Ghana            | mtn-gh        |
| Telecel Ghana        | vodafone-gh   |
| AirtelTigo Ghana     | tigo-gh       |

---

## Getting Started

### Business IP Whitelisting
You must share your public IP address with your Retail System Engineer for whitelisting.

> **Note:** All API Endpoints are live and only requests from whitelisted IP(s) can reach these endpoints. Requests from non-whitelisted IPs will return a 403 Forbidden error or timeout. Maximum 4 IP addresses per service.

---

## Understanding the Service Flow

This document focuses on:
- **Direct Send Money API:** REST API to send money to any mobile money wallet for all networks.
- **Transaction Status Check API:** REST API to check for the status of a send money transaction initiated previously after five (5) or more minutes of the transaction’s completion. It is mandatory to implement the Transaction Status Check API only for transactions that you do not receive a callback from Hubtel.

The entire process is asynchronous. The steps involved in Sending Money using the API:

| Step | Description                                                                 |
|------|-----------------------------------------------------------------------------|
| 1    | Client App makes a Send Money request to Hubtel.                            |
| 2    | Hubtel performs authentication and sends a response to Client App.           |
| 3    | A final callback is sent to Client App via the PrimaryCallbackURL provided.  |
| 4    | If no final status after 5 minutes, perform a status check using the API.    |

![Send Money Flow](../../api_flow_images/send_money.png)

```mermaid
sequenceDiagram
    participant ClientApp as Client App
    participant Hubtel
    participant RecipientWallet as Recipient Wallet
    
    ClientApp->>Hubtel: Send Money Request
    Hubtel-->>ClientApp: Response (Status: Pending)
    Hubtel->>RecipientWallet: Credit Wallet
    RecipientWallet-->>Hubtel: Confirmation
    Hubtel->>ClientApp: Final Callback (Status: Success/Failed)
    
    opt No Callback received after 5 mins
        ClientApp->>Hubtel: Status Check Request
        Hubtel-->>ClientApp: Return Final Status
    end
```

---

## API Reference

Direct Send Money allows you to send money to a Mobile Money wallet. You need enough balance in your Hubtel Prepaid Deposit account to use this functionality.

**API Endpoint:** `https://smp.hubtel.com/api/merchants/{Prepaid_Deposit_ID}/send/mobilemoney`

**Request Type:** POST

**Content Type:** JSON

### Request Parameters

| Parameter           | Type    | Requirement | Description                                                                 |
|---------------------|---------|------------|-----------------------------------------------------------------------------|
| RecipientName       | String  | Mandatory  | Name on the recipient’s mobile money wallet. Recipient msisdn can be used if name is unknown. |
| RecipientMsisdn     | String  | Mandatory  | Recipient’s mobile money number (international format, e.g. 233249111411).  |
| CustomerEmail       | String  | Optional   | Email of mobile money recipient.                                            |
| Channel             | String  | Mandatory  | Mobile money channel provider: mtn-gh, vodafone-gh, tigo-gh.                |
| Amount              | Float   | Mandatory  | Amount to be sent (2 decimal places, e.g. 0.50).                            |
| PrimaryCallbackURL  | String  | Mandatory  | URL to receive callback payload of Send Money transactions from Hubtel.      |
| Description         | String  | Mandatory  | Brief description of the transaction.                                       |
| ClientReference     | String  | Mandatory  | Unique reference for every transaction (max 36 alphanumeric chars).         |

> **Note:** A clientReference must never be duplicated for any transaction.

### Sample Request

```http
POST /api/merchants/11691/send/mobilemoney HTTP/1.1
Host: smp.hubtel.com
Accept: application/json
Content-Type: application/json
Authorization: Basic endjeOBiZHhza250fT3=
Cache-Control: no-cache

{
    "RecipientName": "Joe Doe",
    "RecipientMsisdn": "233200010000",
    "CustomerEmail": "username@example.com",
    "Channel": "vodafone-gh",
    "Amount": 0.8,
    "PrimaryCallbackURL": "https://webhook.site/b503d1a9-e726-f315254a6ede",
    "Description": "Union Dues",
    "ClientReference": "3jL2KlUy3vt21"
}
```

### Response Parameters

| Parameter             | Type   | Description                                                        |
|-----------------------|--------|--------------------------------------------------------------------|
| ResponseCode          | String | Unique response code on the status of the transaction.              |
| Data                  | Object | Object containing the required data response from the API.          |
| AmountDebited         | Float  | Actual amount charged from your Prepaid Deposit Account.            |
| Charges               | Float  | Charge/fee for the transaction.                                     |
| Amount                | Float  | Amount to be sent during the transaction.                           |
| Description           | String | Description of the ResponseCode received from the request.          |
| ClientReference       | String | Reference ID provided by the client/API user.                       |
| TransactionId         | String | Unique ID to identify a Hubtel transaction.                         |
| ExternalTransactionId | String | Transaction reference from the mobile money provider.               |
| Meta                  | Object | Metadata about transaction. Could be null.                          |
| RecipientName         | String | Name of the recipient before the transaction is complete. Could be null. |

### Sample Response

```json
{
  "ResponseCode": "0001",
  "Data": {
      "AmountDebited": 0.0,
      "TransactionId": "09f84e20a283942e807128e8c21d0303",
      "Description": "Your request has been accepted. We will notify you when the transaction is completed.",
      "ClientReference": "pay101",
      "ExternalTransactionId": "",
      "Amount": 0.8,
      "Charges": 0.0,
      "Meta": null,
      "RecipientName": null
  }
}
```

---

## Send Money Callback

The Hubtel Send Money API sends a payload to the callbackURL provided in each request. The callback payload determines the final status of a pending transaction (i.e., transaction with 0001 ResponseCode). The callback URL should listen for an HTTP POST payload from Hubtel.

Sending money to a mobile money wallet is asynchronous. The final status of a transaction cannot be determined immediately after a request. It may take some time (usually less than 30 seconds). It is required to implement an HTTP callback on your server to receive the final status of each transaction.

### Sample Callback (Successful)

```json
{
  "ResponseCode": "0000",
  "Data": {
      "AmountDebited": 0.8,
      "TransactionId": "09f84e20a283942e807128e8c21d0303",
      "ExternalTransactionId": "142116938399",
      "Description": "Vodafone cash payment has been made successfully",
      "ClientReference": "pay101",
      "Amount": 0.8,
      "Charges": 0.010,
      "Meta": null,
      "RecipientName": "Joe Doe"
  }
}
```

### Sample Callback (Failed)

```json
{
  "ResponseCode": "4075",
  "Data": {
      "AmountDebited": 0.8,
      "TransactionId": "08f84e20a283942e807128e8c21d0302",
      "ExternalTransactionId": null,
      "Description": "Insufficient prepaid balance.",
      "ClientReference": "pay101fail",
      "Amount": 0.8,
      "Charges": 0.010,
      "Meta": null,
      "RecipientName": null
  }
}
```

---

## Send Money Status Check

It is mandatory to implement the Send Money Transaction Status Check API as it allows merchants to check for the status of a send money transaction in rare instances where a merchant does not receive the final status of the transaction after five (5) minutes from Hubtel.

**API Endpoint:** `https://smrsc.hubtel.com/api/merchants/{Prepaid_Deposit_ID}/transactions/status`

**Request Type:** GET

**Content Type:** JSON

### Request Parameters

| Parameter            | Type    | Requirement         | Description                                                                 |
|----------------------|---------|--------------------|-----------------------------------------------------------------------------|
| clientReference      | String  | Mandatory (preferred) | The clientReference of the transaction specified in the request payload.    |
| hubtelTransactionId  | String  | Optional           | TransactionId from Hubtel after successful send money request.              |
| networkTransactionId | String  | Optional           | Transaction reference from the mobile money provider.                       |

> **Note:** Although either one of the unique transaction identifiers above could be passed as parameters, clientReference is recommended to be used often.

### Sample Request

```http
GET /api/merchants/11691/status?clientReference=fhwrthrthejhjmt HTTP/1.1
Host: smrsc.hubtel.com
Authorization: Basic QmdfaWghe2Jhc2U2NF9lbmNvZGUoU6bXVhaHdpYW8pfQ==
```

### Sample Response

```json
{
  "ResponseCode": "success",
  "Data": {
      "TransactionId": "09f84e20a283942e807128e8c21d0303",
      "networkTransactionId": "142116938399",
      "Amount": 0.8,
      "Fees": 0.010,
      "ClientReference": "pay101",
      "Channel": "vodafone-gh",
      "CustomerNumber": "233200010000",
      "transactionStatus": "success",
      "CreatedAt": "2021-08-23 11:31:06"
  }
}
```

---

## Response Codes

The Hubtel Sales API uses standard HTTP error reporting. Successful requests return HTTP status codes in the 2xx range. Failed requests return status codes in 4xx and 5xx. Response codes are included in the JSON response body, which contain information about the response.

| Response Code | Description                                                                                                    | Required Action                                                                                       |
|---------------|----------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|
| 0000          | The transaction has been processed successfully.                                                               | None                                                                                                  |
| 0001          | Request has been accepted. A callback will be sent on final state                                              | None                                                                                                  |
| 2001          | Transaction failed due to an error with the Payment Processor. See notes for more details.                      | Review your request or retry in a few minutes.                                                        |
| 3050          | Mobile Number is not registered for Mobile Payment.                                                            | Ensure to pass the appropriate payment channel.                                                       |
| 4000          | Validation errors. Something is not quite right with this request.                                             | Validation errors. Check your request.                                                                |
| 4075          | Insufficient prepaid balance.                                                                                  | Top-up your prepaid balance by transferring funds from your available balance or bank deposit.        |
| 5000          | Something went wrong while processing this request.                                                            | Try again or contact your Retail Systems Engineer for support.                                        |

---

## Notes
- Update this document whenever the configuration or API changes.
- For more details, refer to the project README or contact the development team.
