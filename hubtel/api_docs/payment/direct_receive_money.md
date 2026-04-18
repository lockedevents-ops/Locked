# Direct Receive Money API Documentation

**Last updated:** December 23rd, 2025

---

## Overview

The Hubtel Sales API allows you to sell goods and services online, instore and on mobile. With a single integration, you can:

- Accept mobile money payments on your application
- Sell services in-store, online and on mobile
- Process all your sales on your Hubtel account
- Send money to your customers

This API can be used to provide a range of services including processing e-commerce payments, mobile banking, bulk payments and more. You can also accept payments for goods and services into your account.

The following provides an overview of the Receive Money API endpoints for interacting programmatically within your application.

> [!IMPORTANT]
> Businesses are required to implement a security feature for this API in order to prevent individuals from receiving unsolicited prompts.
>
> This security feature may be:
> - Only registered users can make payments and before payment initiation, they cannot edit their numbers.
> - OR Send OTP to unregistered users to confirm the numbers before proceeding to initiate payment.

---

## Available Channels

The following are the available channels through which a merchant can receive mobile money into a Hubtel Merchant Account.

| Mobile Money Provider | Channel Name |
|----------------------|--------------|
| MTN Ghana | mtn-gh |
| Telecel Ghana | vodafone-gh |
| AirtelTigo Ghana | tigo-gh |

---

## Getting Started

### Business IP Whitelisting

You must share your public IP address with your Retail System Engineer for whitelisting.

> [!NOTE]
> All API Endpoints are live and only requests from whitelisted IP(s) can reach these endpoints shared in this reference.
>
> Requests from IP addresses that have not been whitelisted will return a 403 Forbidden error response or a timeout.
>
> We permit a maximum of 4 IP addresses per service.

---

## Understanding the Service Flow

The Hubtel Sales API allows you to integrate multiple functionalities into your applications. This document focuses on:

- **Direct Receive Money API:** REST API to receive money directly into your Hubtel Merchant Account from a Mobile Money Wallet for all available networks.
- **Transaction Status Check API:** REST API to check for the status of any debit transaction initiated after five (5) or more minutes of the debit transaction's completion. It is mandatory to implement the Transaction Status Check API only for transactions that you do not receive a callback from Hubtel.

The entire process is asynchronous. The figure below demonstrates the service flow using these two endpoints:

![Receive Money Flow](../../api_flow_images/receive_money.png)

```mermaid
sequenceDiagram
    participant ClientApp as Client App
    participant Hubtel
    participant Customer
    
    ClientApp->>Hubtel: Receive Money Request
    Hubtel-->>ClientApp: Response (Status: Pending)
    Hubtel->>Customer: Prompt for Approval
    Customer->>Hubtel: Approves Transaction
    Hubtel->>ClientApp: Final Callback (Status: Success/Failed)
    
    opt No Callback received after 5 mins
        ClientApp->>Hubtel: Status Check Request
        Hubtel-->>ClientApp: Return Final Status
    end
```

| Step | Description |
|------|-------------|
| 1 | Client App makes a Receive Money request to Hubtel. |
| 2 | Hubtel performs authentication on the request and sends a response to Client App accordingly. |
| 3 | A final callback is sent to Client App via the PrimaryCallbackURL provided in the request. |
| 4 | In instances where a merchant does not receive the final status of the transaction after five (5) minutes from Hubtel, it is mandatory to perform a status check using the Status Check API to determine the final status of the transaction. |

---

## API Reference

Direct Receive Money allows you to accept direct mobile money payments into your Hubtel Merchant Account. Note that the flow for charging mobile subscribers differs across the various Telco networks.

To initiate a Receive Money transaction, send an HTTP POST request to the below URL with the required parameters. It is also mandatory to pass your POS Sales ID for Receive Money requests in the endpoint.

| Property | Value |
|----------|-------|
| API Endpoint | `https://rmp.hubtel.com/merchantaccount/merchants/{POS_Sales_ID}/receive/mobilemoney` |
| Request Type | POST |
| Content Type | JSON |

### Request Parameters

| Parameter | Type | Requirement | Description |
|-----------|------|-------------|-------------|
| CustomerName | String | Optional | The name on the customer's mobile money wallet. |
| CustomerMsisdn | String | Mandatory | The customer's mobile money number. This should be in the international format. E.g.: "233249111411" |
| CustomerEmail | String | Optional | Email of customer. |
| Channel | String | Mandatory | The mobile money channel provider. Available channels are: mtn-gh, vodafone-gh, tigo-gh. |
| Amount | Float | Mandatory | Amount of money to be debited during this transaction. NB: Only 2 decimal places is allowed E.g.: 0.50. |
| PrimaryCallbackURL | String | Mandatory | URL used to receive callback payload of Receive Money transactions from Hubtel. |
| Description | String | Mandatory | A brief description of the transaction. |
| ClientReference | String | Mandatory | The reference provided by the API user and must be unique for every transaction and preferably be alphanumeric characters. Maximum length is 36 characters. |

> [!CAUTION]
> ClientReference must never be duplicated for any transaction.

### Sample Request

```http
POST /merchantaccount/merchants/11684/receive/mobilemoney HTTP/1.1
Host: rmp.hubtel.com
Accept: application/json
Content-Type: application/json
Authorization: Basic endjeOBiZHhza250fT3=
Cache-Control: no-cache

{
    "CustomerName": "Joe Doe",
    "CustomerMsisdn": "233200010000",
    "CustomerEmail": "username@example.com",
    "Channel": "vodafone-gh",
    "Amount": 0.8,
    "PrimaryCallbackUrl": "https://webhook.site/b503d1a9-e726-f315254a6ede",
    "Description": "Union Dues",
    "ClientReference": "3jL2KlUy3vt21"
}
```

### Response Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| Message | String | The description of response received from the Receive Money API that is related to the ResponseCode. |
| ResponseCode | String | The unique response code on the status of the transaction. |
| Data | Object | An object containing the required data response from the API. |
| Amount | Float | The transaction amount. |
| Charges | Float | The charge/fee for the transaction. |
| AmountAfterCharges | Float | The transaction amount after charges/fees deduction. |
| AmountCharged | Float | The actual amount that is charged from the customer's mobile money wallet. |
| Description | String | The description initially provided by API user in the request payload. |
| ClientReference | String | The reference ID that is initially provided by the client/API user in the request payload (from merchant). |
| TransactionId | String | The unique ID used to identify a Hubtel transaction (from Hubtel). |
| ExternalTransactionId | String | The transaction reference from the mobile money provider (from Telco). |
| OrderID | String | The unique ID used to identify a transaction order. |
| DeliveryFee | Float | The delivery fee of the transaction is normally zero (0.0). |

### Sample Response

```json
{
  "Message": "Transaction pending. Expect callback request for final state",
  "ResponseCode": "0001",
  "Data": {
      "TransactionId": "09f84e20a283942e807128e8c21d08d6",
      "Description": "Union Dues",
      "ClientReference": "3jL2KlUy3vt21",
      "Amount": 0.8,
      "Charges": 0.05,
      "AmountAfterCharges": 0.8,
      "AmountCharged": 0.85,
      "DeliveryFee": 0.0
  }
}
```

---

## Receive Money Callback

The Hubtel Receive Money API mandatorily sends a payload to the callbackURL provided in each request. The callback payload determines final status of a pending transaction response i.e.; transaction with 0001 ResponseCode. The callback URL you specified in the Receive Money request should be implemented to listen for an HTTP POST payload from Hubtel.

To process a Receive Money request, customer approval is required to transfer money from their mobile money account to your Hubtel Merchant Account. Consequently, the transaction flow is asynchronous. This means the final status of a transaction is not immediately available and may take up to 30 seconds to be confirmed. Therefore, it is crucial to implement an HTTP callback on your server to receive the final transaction status.

### Sample Callback (Successful)

```json
{
  "ResponseCode": "0000",
  "Message": "success",
  "Data": {
      "Amount": 0.8,
      "Charges": 0.05,
      "AmountAfterCharges": 0.8,
      "Description": "The Vodafone Cash payment has been approved and processed successfully",
      "ClientReference": "3jL2KlUy3vt21",
      "TransactionId": "09f84e20a283942e807128e8c21d08d6",
      "ExternalTransactionId": "2116938399",
      "AmountCharged": 0.85,
      "OrderId": "09f84e20a283942e807128e8c21d08d6",
      "PaymentDate": "2024-05-14T00:44:57.5142719Z"
  }
}
```

### Sample Callback (Failed)

```json
{
  "ResponseCode": "2001",
  "Message": "failed",
  "Data": {
      "Amount": 0.8,
      "Charges": 0.05,
      "AmountAfterCharges": 0.8,
      "Description": "FAILED",
      "ClientReference": "3jL2KlUy3vt21",
      "TransactionId": "09f84e20a283942e807128e8c21d08d6",
      "ExternalTransactionId": "2116938399",
      "AmountCharged": 0.85,
      "OrderId": "09f84e20a283942e807128e8c21d08d6",
      "PaymentDate": "2024-05-14T00:44:57.5142719Z"
  }
}
```

---

## Transaction Status Check

It is mandatory to implement the Transaction Status Check API as it allows merchants to check for the status of a transaction in rare instances where a merchant does not receive the final status of the transaction from Hubtel after five (5) minutes.

To check the status of a transaction, send an HTTP GET request to the below URL, with either one or more unique transaction identifiers as parameters.

It is also mandatory to pass your POS Sales ID for Status Check requests in the endpoint.

> [!NOTE]
> Only requests from whitelisted IP(s) can reach the endpoint. Requests from IP addresses that have not been whitelisted will return a 403 Forbidden error response or a timeout. Submit your public IP(s) to your Retail Systems Engineer to be whitelisted.

| Property | Value |
|----------|-------|
| API Endpoint | `https://api-txnstatus.hubtel.com/transactions/{POS_Sales_ID}/status` |
| Request Type | GET |
| Content Type | JSON |

### Request Parameters

| Parameter | Type | Requirement | Description |
|-----------|------|-------------|-------------|
| clientReference | String | Mandatory (preferred) | The client reference of the transaction specified in the request payload. |
| hubtelTransactionId | String | Optional | Transaction ID from Hubtel after successful payment. |
| networkTransactionId | String | Optional | The transaction reference from the mobile money provider. |

> [!TIP]
> Although either one of the unique transaction identifiers above could be passed as parameters, clientReference is recommended to be used most often.

### Sample Request

```http
GET /transactions/11684/status?clientReference=fhwrthrthejhjmt HTTP/1.1
Host: api-txnstatus.hubtel.com
Authorization: Basic QmdfaWghe2Jhc2U2NF9lbmNvZGUoa2hzcW9seXU6bXVhaHdpYW8pfQ==
```

### Response Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| message | String | The description of response received from the API that is related to the ResponseCode. |
| responseCode | String | The response code of the API after the request. |
| data | Object | An object containing the required data response from the API. |
| date | String | Date of the transaction. |
| status | String | Status of the transaction i.e.: Paid, Unpaid or Refunded. |
| transactionId | String | The unique ID used to identify a Hubtel transaction (from Hubtel). |
| externalTransactionId | String | The transaction reference from the mobile money provider (from Telco). |
| paymentMethod | String | The mode of payment. |
| clientReference | String | The reference ID that is initially provided by the client/API user in the request payload (from merchant). |
| currencyCode | String | Currency of the transaction; could be null. |
| amount | Float | The transaction amount. |
| charges | Float | The charge/fee for the transaction. |
| amountAfterCharges | Float | The transaction amount after charges/fees deduction. |
| isFulfilled | Boolean | Whether service was fulfilled; could be null. |

### Sample Response (Paid)

```json
{
  "message": "Successful",
  "responseCode": "0000",
  "data": {
      "date": "2024-04-25T21:45:48.4740964Z",
      "status": "Paid",
      "transactionId": "7fd01221faeb41469daec7b3561bddc5",
      "externalTransactionId": "0000006824852622",
      "paymentMethod": "mobilemoney",
      "clientReference": "1sc2rc8nwmchngs9ds2f1dmn",
      "currencyCode": null,
      "amount": 0.1,
      "charges": 0.02,
      "amountAfterCharges": 0.08,
      "isFulfilled": null
  }
}
```

### Sample Response (Unpaid)

```json
{
  "message": "Successful",
  "responseCode": "0000",
  "data": {
      "date": "2024-04-25T21:45:48.4740964Z",
      "status": "Unpaid",
      "transactionId": "7fd01221faeb41469daec7b3561bddc5",
      "externalTransactionId": "0000006824852622",
      "paymentMethod": "mobilemoney",
      "clientReference": "1sc2rc8nwmchngs9ds2f1dmn",
      "currencyCode": null,
      "amount": 0.1,
      "charges": 0.02,
      "amountAfterCharges": 0.08,
      "isFulfilled": null
  }
}
```

---

## Response Codes

The Hubtel Sales API uses standard HTTP error reporting. Successful requests return HTTP status codes in the 2xx. Failed requests return status codes in 4xx and 5xx. Response codes are included in the JSON response body, which contain information about the response.

| Response Code | Description | Required Action |
|---------------|-------------|-----------------|
| 0000 | The transaction has been processed successfully. | None |
| 0001 | Request has been accepted. A callback will be sent on final state. | None |
| 2001 | Transaction failed due to various reasons: MTN Mobile Money user has reached counter or balance limits, has insufficient funds or is missing permissions; The Vodafone Cash failed; You entered the wrong PIN; MTN Exception: Account Holder with FRI Not Found; Transaction id is invalid. | Customer either entered no or invalid PIN; Mobile network not able to parse your request; USSD session timeout; Having strange characters in your description; Ensure that the number provided matches the channel. |
| 4000 | Validation errors. Something is not quite right with this request. | Please check again. |
| 4070 | We're unable to complete this payment at the moment. Fees not set for given conditions. | Ensure you are passing the required minimum amount or contact your Hubtel relationship manager to setup fees for your account if error persists. |
| 4101 | The business you're trying to pay isn't fully set up to receive payments at the moment. Client request keys do not match API keys on business. | Contact your Retail Systems Engineer to enable Receive Money Scopes. Ensure that you're providing the correct Basic Auth key for the Authorization header and ensure you're passing your POS Sales number in the endpoint. |
| 4103 | Permission denied. Sorry, your account is not allowed to transact on this channel. | Contact your Retail Systems Engineer. |

---

## Notes
- Update this document whenever the configuration or API changes.
- For more details, refer to the project README or contact the development team.
