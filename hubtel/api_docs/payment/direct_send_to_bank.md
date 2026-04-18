# Direct Send-To-Bank API Documentation

**Last updated:** December 23rd, 2025

## Overview

The Hubtel Sales API allows you to sell goods and services online, instore, and on mobile. With a single integration, you can:

- Accept mobile money payments on your application
- Sell services in-store, online, and on mobile
- Process all your sales on your Hubtel account
- Send money to your customers

This API can be used for e-commerce payments, mobile banking, bulk payments, and more. You can also accept payments for goods and services into your account.

The following provides an overview of the Send-To-Bank API endpoints for interacting programmatically within your application.

---

## Available Bank Channels

| Bank Name                        | BankCode |
|----------------------------------|----------|
| STANDARD CHARTERED BANK          | 300302   |
| ABSA BANK GHANA LIMITED          | 300303   |
| GCB BANK LIMITED                 | 300304   |
| NATIONAL INVESTMENT BANK         | 300305   |
| ARB APEX BANK LIMITED            | 300306   |
| AGRICULTURAL DEVELOPMENT BANK    | 300307   |
| UNIVERSAL MERCHANT BANK          | 300309   |
| REPUBLIC BANK LIMITED            | 300310   |
| ZENITH BANK GHANA LTD            | 300311   |
| ECOBANK GHANA LTD                | 300312   |
| CAL BANK LIMITED                 | 300313   |
| FIRST ATLANTIC BANK              | 300316   |
| PRUDENTIAL BANK LTD              | 300317   |
| STANBIC BANK                     | 300318   |
| FIRST BANK OF NIGERIA            | 300319   |
| BANK OF AFRICA                   | 300320   |
| GUARANTY TRUST BANK              | 300322   |
| FIDELITY BANK LIMITED            | 300323   |
| SAHEL - SAHARA BANK (BSIC)       | 300324   |
| UNITED BANK OF AFRICA            | 300325   |
| ACCESS BANK LTD                  | 300329   |
| CONSOLIDATED BANK GHANA          | 300331   |
| FIRST NATIONAL BANK              | 300334   |
| GHL BANK                         | 300362   |

---

## Getting Started

### Business IP Whitelisting
You must share your public IP address with your Retail System Engineer for whitelisting.

> **Note:** All API Endpoints are live and only requests from whitelisted IP(s) can reach these endpoints. Requests from non-whitelisted IPs will return a 403 Forbidden error or timeout. Maximum 4 IP addresses per service.

---

## Understanding the Service Flow

This document focuses on:
- **Direct Send-To-Bank API:** REST API to send money to a bank account number of any available bank channels.
- **Transaction Status Check API:** REST API to check for the status of a Send-To-Bank transaction initiated previously after five (5) or more minutes of the transaction’s completion. It is mandatory to implement the Transaction Status Check API only for transactions that you do not receive a callback from Hubtel.

The entire process is asynchronous. The steps involved in Sending Money using the API:

| Step | Description                                                                 |
|------|-----------------------------------------------------------------------------|
| 1    | Client App makes a Send-To-Bank request to Hubtel.                          |
| 2    | Hubtel performs authentication and sends a response to Client App.           |
| 3    | A final callback is sent to Client App via the PrimaryCallbackURL provided.  |
| 4    | If no final status after 5 minutes, perform a status check using the API.    |

![Send-To-Bank Flow](../../api_flow_images/send_to_bank.png)

```mermaid
sequenceDiagram
    participant ClientApp as Client App
    participant Hubtel
    participant BankSystem as Bank/GhIPSS
    
    ClientApp->>Hubtel: Send-To-Bank Request
    Hubtel-->>ClientApp: Response (Status: Pending)
    Hubtel->>BankSystem: Credit Bank Account
    BankSystem-->>Hubtel: Confirmation
    Hubtel->>ClientApp: Final Callback (Status: Success/Failed)
    
    opt No Callback received after 5 mins
        ClientApp->>Hubtel: Status Check Request
        Hubtel-->>ClientApp: Return Final Status
    end
```

---

## API Reference

Direct Send-To-Bank allows you to send money to all available banks on the GhIPSS network.

**API Endpoint:** `https://smp.hubtel.com/api/merchants/{Hubtel_Prepaid_Deposit_ID}/send/bank/gh/{BankCode}`

**Request Type:** POST

**Content Type:** JSON

> **Note:**
> - Replace `{BankCode}` in the endpoint with the recipient’s bank code (see table above).
> - Replace `{Hubtel_Prepaid_Deposit_ID}` with your Hubtel Prepaid Deposit ID.

### Request Parameters

| Parameter             | Type    | Requirement | Description                                                                 |
|-----------------------|---------|------------|-----------------------------------------------------------------------------|
| Amount                | Float   | Mandatory  | Amount to be sent (2 decimal places, e.g. 0.50).                            |
| PrimaryCallbackURL    | String  | Mandatory  | URL to receive callback payload of Send-to-Bank transactions from Hubtel.    |
| Description           | String  | Mandatory  | Brief description of the transaction.                                       |
| BankAccountNumber     | String  | Mandatory  | Recipient’s bank account number.                                            |
| BankAccountName       | String  | Optional   | Name linked to the provided bank account.                                   |
| RecipientPhoneNumber  | String  | Optional   | Recipient’s mobile money number (e.g. 233249111411).                        |
| BankName              | String  | Optional   | Name of recipient’s bank.                                                   |
| BankBranch            | String  | Optional   | Recipient’s bank branch.                                                    |
| BankBranchCode        | String  | Optional   | Branch Code of recipient’s bank. String can be empty.                       |
| ClientReference       | String  | Mandatory  | Unique reference for every transaction (max 36 alphanumeric chars).         |

> **Note:** ClientReference must never be duplicated for any transaction. Optional parameters can be empty.

### Sample Request

```http
POST /api/merchants/11691/send/bank/gh/300311 HTTP/1.1
Host: smp.hubtel.com
Accept: application/json
Content-Type: application/json
Authorization: Basic endjeOBiZHhza250fT3=
Cache-Control: no-cache

{
    "Amount": 0.8,
    "BankName": "",
    "BankBranch": "",
    "BankBranchCode": "",
    "BankAccountNumber": "4XXXXXXXXX",
    "BankAccountName": "",
    "ClientReference": "sendToBank101",
    "PrimaryCallbackUrl": "https://webhook.site/b503d1a9-e726-f315254a6ede",
    "Description": "Test Deposit",
    "RecipientPhoneNumber": ""
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
| ExternalTransactionId | String | Transaction reference from the upstream provider.                   |
| Meta                  | Object | Metadata about transaction. Could be null.                          |
| RecipientName         | String | Name of the recipient before the transaction is complete. Could be null. |

### Sample Response

```json
{
  "ResponseCode": "0001",
  "Data": {
      "AmountDebited": 0.0,
      "TransactionId": "367121386447",
      "Description": "Your request has been accepted. We will notify you when the transaction is completed.",
      "ClientReference": "3jL2KlUy3vt210303",
      "ExternalTransactionId": "",
      "Amount": 0.8,
      "Charges": 0.0,
      "Meta": null,
      "RecipientName": null
  }
}
```

---

## Send-To-Bank Callback

The Hubtel Send-To-Bank API sends a payload to the callbackURL provided in each request. The callback payload determines the final status of a pending transaction (i.e., transaction with 0001 ResponseCode). The callback URL should listen for an HTTP POST payload from Hubtel.

Sending money to a bank account number is asynchronous. The final status of a transaction cannot be determined immediately after a request. It is required to implement an HTTP callback on your server to receive the final status of each transaction.

### Sample Callback (Successful)

```json
{
  "ResponseCode": "0000",
  "Data": {
      "AmountDebited": 0.8,
      "TransactionId": "367121386447",
      "ExternalTransactionId": "367121386447",
      "Description": " The Instant Bank Request has been processed successfully",
      "ClientReference": "sendToBank101",
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
    "AmountDebited": 10.1,
    "TransactionId": "9933e637066a406dba1a8b255b928b44",
    "ClientReference": "sendtoBankTestcollins1",
    "Description": "Insufficient prepaid balance.",
    "ExternalTransactionId": null,
    "Amount": 10,
    "Charges": 0.1,
    "Meta": null,
    "RecipientName": null
  }
}
```

---

## Send-To-Bank Transaction Status Check API

It is mandatory to implement the Send-To-Bank Transaction Status Check API as it allows merchants to check for the status of a send money transaction in rare instances where a merchant does not receive the final status of the transaction after five (5) minutes from Hubtel.

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
GET /api/merchants/11691/status?clientReference=sendToBank101 HTTP/1.1
Host: smrsc.hubtel.com
Authorization: Basic QmdfaWghe2Jhc2U2NF9lbmNvZGUoa2hzcW9seXU6bXVhaHdpYW8pfQ==
```

### Sample Response (Successful)

```json
{
  "ResponseCode": "success",
  "Data": {
    "TransactionId": "367121386447",
    "networkTransactionId": "367121386447",
    "Amount": 1,
    "Fees": 1.01,
    "ClientReference": "sendToBank101",
    "Channel": "gip-gh",
    "CustomerNumber": "233546335113",
    "Description": "TestSendToBankDeposit",
    "transactionStatus": "success",
    "CreatedAt": "2022-08-23 11:31:06"
  }
}
```

### Sample Response (Failed)

```json
{
  "ResponseCode": "success",
  "Data": {
    "TransactionId": "9933e637066a406dba1a8b255b928b44",
    "networkTransactionId": null,
    "Amount": 10.0,
    "fees": 0.1,
    "ClientReference": "sendtoBankTestcollins1",
    "Channel": "gip-gh",
    "customerNumber": "233200585542",
    "Description": "TestSendToBankDeposit",
    "transactionStatus": "failed",
    "CreatedAt": "2024-08-01 08:30:53"
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
