# Balance Query & Transfers API Documentation

**Last updated:** December 23rd, 2025

---

## Overview

The Hubtel Balance Query API allows you to:
- Check balances of POS Sales and Prepaid Deposit accounts
- Transfer funds from your POS Sales account to your Prepaid Deposit account

You can find your POS SALES and PREPAID DEPOSIT IDs in your Hubtel Merchant Account.

---

## Getting Started

**Business IP Whitelisting:**
- Share your public IP address with your Retail System Engineer for whitelisting.
- Only requests from whitelisted IP(s) can reach these endpoints.

---

## API Reference

### POS Sales Balance Query
- **Endpoint:** `https://trnf.hubtel.com/api/inter-transfers/{POS_SALES_ID}`
- **Request Type:** GET
- **Content Type:** JSON

**Request Parameters:**
- POS_SALES_ID (Number, Mandatory): Your merchant Hubtel POS Sales ID

**Sample Request:**
```http
GET api/inter-transfers/11684 HTTP/1.1
Host: trnf.hubtel.com
Accept: application/json
Content-Type: application/json
Authorization: Basic endjeOBiZa250fT3=
Cache-Control: no-cache
```

**Sample Response:**
```json
{
  "responseCode": "0000",
  "message": "Success",
  "data": {
      "amount": 123.50
  }
}
```

---

### Prepaid Deposit Balance Query
- **Endpoint:** `https://trnf.hubtel.com/api/inter-transfers/prepaid/{PREPAID_DEPOSIT_ID}`
- **Request Type:** GET
- **Content Type:** JSON

**Request Parameters:**
- PREPAID_DEPOSIT_ID (Number, Mandatory): Your merchant Hubtel Prepaid Deposit ID

**Sample Request:**
```http
GET api/inter-transfers/prepaid/11691 HTTP/1.1
Host: trnf.hubtel.com
Accept: application/json
Content-Type: application/json
Authorization: Basic endjeOBiZa250fT3=
Cache-Control: no-cache
```

**Sample Response:**
```json
{
  "responseCode": "0000",
  "message": "Success",
  "data": {
      "amount": 11.50
  }
}
```

---

### Balance Transfer
- **Endpoint:** `https://trnf.hubtel.com/api/inter-transfers/{POS_SALES_ID}`
- **Request Type:** POST
- **Content Type:** JSON

**Request Parameters:**
- POS_SALES_ID (Float, Mandatory)
- Description (String, Mandatory)
- Amount (Float, Mandatory)
- ClientReference (String, Mandatory, max 36 chars)
- DestinationAccountNumber (String, Mandatory): Prepaid Deposit ID
- PrimaryCallbackUrl (String, Mandatory)

**Sample Request:**
```http
POST api/inter-transfers/11684 HTTP/1.1
Host: trnf.hubtel.com
Accept: application/json
Content-Type: application/json
Authorization: Basic endjeOBiZa250fT3=
Cache-Control: no-cache

{
  "Description": "Hubtel Transfer Test", 
  "Amount": 0.8,
  "ClientReference": "bd0io3202ef49", 
  "DestinationAccountNumber": "11691",
  "PrimaryCallbackUrl": "https://webhook.site/b513d1a9-e7826-a6ede"
}
```

**Sample Response:**
```json
{ 
  "responseCode": "0001", 
  "message": "Pending", 
  "data": {
    "clientReference": "bd0i03202ef49",
    "description": "Your request has been accepted. We'll notify you when the transaction is completed.",
    "amount": 0.8, 
    "charges": 0, 
    "meta": null,
    "recipientName": "gershon" 
  }
}
```

---

### Transfer Callback
The callback URL specified in your request will receive the final status of the transaction.

**Sample Callback:**
```json
{
  "ResponseCode": "0000", 
  "Message": "Success", 
  "Data": { 
      "ClientReference": "b03202ef49", 
      "Description": "Hubtel Transfer Test", 
      "Amount": 0.8,
      "Charges": null, 
      "Meta": null,
      "RecipientName": "gershon" 
  }
}
```

---

### Transfer Status Check
- **Endpoint:** `https://trnf.hubtel.com/api/inter-transfers/status/{POS_Sales_ID}?clientReference=xxxxxxxxx`
- **Request Type:** GET
- **Content Type:** JSON

**Request Parameters:**
- clientReference (String, Mandatory): The reference ID provided in the original request

**Sample Request:**
```http
GET /api/inter-transfers/status/11684?clientReference=76576343905406557 HTTP/1.1
Host: trnf.hubtel.com
Authorization: Basic QmdfaWjkjJhc2U29lbmNvmkGUoa2hzcW9seXU6bXVhaHdpYW8pfQ==
```

**Sample Response (Success):**
```json
{
  "message": "success",
  "code": "200",
  "data": {
      "id": "bfe03a54f40e4f91ae8d1977f2250d39",
      "createdAt": "2024-07-03T16:48:49.1073714+00:00",
      "updatedAt": null,
      "transferDescription": "InterFineractTransfer",
      "transferAmount": 1.0,
      "clientReference": "76576343905406557",
      "callbackUrl": "https://webhook.site/3ae16425-b322-4e8e-ab52-c97bcd3c9ec1",
      "fromAccountType": "receivemoney",
      "fromAccountId": "11684",
      "toAccountType": "sendmoney",
      "toAccountId": "11691",
      "fromBusinessId": "gershon",
      "toBusinessId": "gershon",
      "status": "success",
      "failureReason": null
  }
}
```

**Sample Response (Failed):**
```json
{
  "message": "success",
  "code": "200",
  "data": {
      "id": "6f1a85eaf32149438d14e7d49ad8d69c",
      "createdAt": "2024-07-03T16:52:58.196586+00:00",
      "updatedAt": null,
      "transferDescription": "InterFineractTransfer",
      "transferAmount": 1000.0,
      "clientReference": "926943563465346376",
      "callbackUrl": "https://webhook.site/3ae16425-b322-4e8e-ab52-c97bcd3c9ec1",
      "fromAccountType": "receivemoney",
      "fromAccountId": "11684",
      "toAccountType": "sendmoney",
      "toAccountId": "11691",
      "fromBusinessId": "gershon",
      "toBusinessId": "gershon",
      "status": "failed",
      "failureReason": "Low balance"
  }
}
```

---

## Response Codes

| HTTP Status | ResponseCode | Description | Required Action |
|-------------|--------------|-------------|-----------------|
| 200         | 0000/0001    | Request processed successfully | None |
| 401         |              | None | Pass correct account number, ensure API keys are valid |
| 400         | 4000         | Invalid Prepaid Deposit ID or duplicate ClientReference | Ensure correct Prepaid Deposit ID, ClientReference is unique |

---

## Notes
- Update this document whenever the configuration or API changes.
- For more details, refer to the project README or contact the development team.
