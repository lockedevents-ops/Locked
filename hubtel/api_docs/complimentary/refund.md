# Refund API Documentation

**Last updated:** December 23rd, 2025

---

## Overview

The Hubtel Refund API allows you to refund monies to customers based on a previous order made. Supported transaction types:
- Card transactions
- Mobile money transactions

> **Note:** You can only refund transactions within the last 45 days using this API. For older transactions, contact business@hubtel.com.

---

## Getting Started

**Business IP Whitelisting:**
- Share your public IP address with your Retail System Engineer for whitelisting.
- Only requests from whitelisted IP(s) can reach the endpoints.

---

## API Reference

### Refund Transaction
- **Endpoint:** `https://refund-api.hubtel.com/refund/{Hubtel_POS_Sales_ID}/order/{orderId}`
- **Request Type:** POST
- **Content Type:** JSON

**Request Parameters:**
- Hubtel_POS_Sales_ID (Number, Mandatory): Your merchant Hubtel POS Sales ID
- orderId (String, Mandatory): The Hubtel OrderID for the payment to refund
- callbackUrl (String, Mandatory): URL to receive final notification on refund status

**Sample Request:**
```http
POST /refund/11684/order/79213a0568c44c13a8a04ba056d681 HTTP/1.1
Host: refund-api.hubtel.com
Accept: application/json
Content-Type: application/json
Authorization: Basic endjeOBiZa250fT3=
Cache-Control: no-cache
{
    "callbackUrl":"https://webhook.site/b503d1a9-e726-f315254a6ede"
}
```

**Sample Response (Pending):**
```json
{
  "message": "Transaction pending. Expect callback request for final state.",
  "responseCode": "0001",
  "data": {
      "orderId": "b230733cd56b4a0fad820e39f66bc27c"
  }
}
```

**Sample Response (Not Found):**
```json
{
  "message": "Could not find order with ID 847ad350142a4970ac365d2294d3f3a5",
  "responseCode": "3000",
  "data": null
}
```

**Sample Callback (Successful):**
```json
{
  "responseCode": "0000",
  "message": "Successful",
  "data": {
      "amount": 0.5,
      "charges": 0.01,
      "orderId": "a4e406711db74687bbd307ead23bd015",
      "externalTransactionId": "0000002673867446"
    }
}
```

---

## Response Codes

| ResponseCode | HTTP Status | Description | Required Action |
|--------------|------------|-------------|-----------------|
| 0001         | 202        | Transaction pending. Expect callback for final state. | Data contains order ID |
| 3000         | 404        | Could not find order with ID. | Data is null |
| 4000         | 404        | Cannot honour refund: amount on order is less than 1 cedi. | Data is null |
| 4509         | 404        | Order is not eligible for a refund. | Data is null |
| 4515         | 423        | Order is currently being processed. Wait for callback. | Initial refund request already made |

---

## Notes
- Update this document whenever the configuration or API changes.
- For more details, refer to the project README or contact the development team.
