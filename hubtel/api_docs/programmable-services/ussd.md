# Programmable Services (USSD) API Documentation

**Last updated:** December 23rd, 2025

---

## Overview

The Hubtel Programmable Services API enables businesses to offer services for purchase via:
- USSD
- Hubtel App (Android/iOS)
- Webstore

A single integration makes your services available across all channels, expanding customer reach.

---

## Integration Steps

1. **Develop a USSD application** using the Programmable Services API reference.
2. **Add your service to your Hubtel account** (provide Service Interaction and Service Fulfilment URLs).
3. **Link to USSD code** via the Merchant Dashboard and attach your service.

---

## Core Features

- **Service Interaction URL:** Dynamic user interaction with your app (custom flows)
- **Service Fulfilment URL:** Endpoint for service fulfillment after payment

![USSD Flow 1](../../raw-json/api_flow_images/programmable_USSD_1.png)

```mermaid
sequenceDiagram
    participant Customer
    participant Operator as Telco Operator
    participant Hubtel
    participant ClientApp as Client App
    
    Customer->>Operator: Dials USSD Code (*713#)
    Operator->>Hubtel: Routes Request
    Hubtel->>ClientApp: Push Request (Type: Initiation)
    ClientApp-->>Hubtel: Response (Menu/Prompt)
    Hubtel-->>Operator: Forwards Response
    Operator->>Customer: Displays Menu
    Customer->>Operator: Selects Option
    Operator->>Hubtel: Routes Selection
    Hubtel->>ClientApp: Push Request (Type: Response)
    ClientApp-->>Hubtel: Response (Next Menu/Action)
```

![USSD Flow 2](../../api_flow_images/programmable_USSD_2.png)

```mermaid
sequenceDiagram
    participant Customer
    participant Hubtel
    participant ClientApp as Client App
    
    note right of ClientApp: Payment Triggered
    ClientApp-->>Hubtel: Response (Type: AddToCart/Payment)
    Hubtel->>Customer: Payment Prompt
    Customer->>Hubtel: Approves Payment
    Hubtel->>ClientApp: Service Fulfillment Request (Status: Paid)
    ClientApp->>Hubtel: Callback (Service Rendered Status)
```

---

## Business IP Whitelisting

- Share your public IP address with your Retail System Engineer for whitelisting.
- Service fulfillment callback endpoint requires IP whitelisting.
- For extra security, whitelist Hubtel’s service fulfillment IPs: 52.50.116.54, 18.202.122.131, 52.31.15.68.

---

## API Reference

### Push Service Request
Hubtel sends requests to your Service Interaction URL when a user interacts with your service.

**Push Request Parameters:**
- Type (String): "Initiation", "Response", "Timeout"
- Message (String): Text entered by user
- ServiceCode (String): USSD shortcode dialed
- Operator (String): "tigo", "airtel", "mtn", "vodafone"
- ClientState (String): Data from previous request
- Mobile (String): User's phone number
- SessionId (String): Unique session identifier
- Sequence (Int): Message position in session
- Platform (String): "USSD", "Webstore", "Hubtel-App"

**Sample Push Request:**
```json
{
  "Type": "Initiation",
  "Mobile": "233200585542",
  "SessionId": "3c796dac28174f739de4262d08409c51",
  "ServiceCode": "713",
  "Message": "*713#",
  "Operator": "vodafone",
  "Sequence": 1,
  "ClientState": "",
  "Platform": "USSD"
}
```

---

### Expected Response
Your app must respond to push requests in the following format:

**Response Parameters:**
- SessionId (String, Mandatory)
- Type (String, Mandatory): "response", "release", "AddToCart"
- Message (String, Mandatory): Text to show user (use "\n" for new lines)
- Mask (String, Optional)
- Item (Object, Optional): For "AddToCart" type
- ServiceCode (String, Optional)
- Label (String, Mandatory): Title for Web/Mobile channels
- DataType (String, Mandatory): "display", "input"
- FieldType (Object, Mandatory): "text", "phone", "email", "number", "decimal", "textarea"
- Sequence (Int, Optional)
- ClientState (String, Optional)

**Sample Response:**
```json
{
  "SessionId": "3c796dac28174f739de4262d08409c51",
  "Type": "response",
  "Message": "Welcome to RSE Inc.\n1. Buy Airtime & Data\n3. Send Money\n6. My Balance\n",
  "Label": "Welcome page",
  "ClientState": "100",
  "DataType": "input",
  "FieldType": "text"
}
```

---

### Service Fulfillment
After payment, Hubtel sends a fulfillment payload to your Service Fulfilment URL.

**Sample Service Fulfillment Request:**
```json
{
  "SessionId": "3c796dac28174f739de4262d08409c51",
  "OrderId": "ac3307bcca7445618071e6b0e41b50b5",
  "ExtraData": {},
  "OrderInfo": {
    "CustomerMobileNumber": "233200585542",
    "CustomerEmail": null,
    "CustomerName": "John Doe",
    "Status": "Paid",
    "OrderDate": "2023-11-06T15:16:50.3581338+00:00",
    "Currency": "GHS",
    "BranchName": "Haatso",
    "IsRecurring": false,
    "RecurringInvoiceId": null,
    "Subtotal": 151.50,
    "Items": [
      {
        "ItemId": "5b8945940e1247489e34e756d8fc2dbb",
        "Name": "Send Money",
        "Quantity": 1,
        "UnitPrice": 150.5
      }
    ],
    "Payment": {
      "PaymentType": "mobilemoney",
      "AmountPaid": 151.50,
      "AmountAfterCharges": 150.5,
      "PaymentDate": "2023-11-06T15:16:50.3581338+00:00",
      "PaymentDescription": "The MTN Mobile Money payment has been approved and processed successfully.",
      "IsSuccessful": true
    }
  }
}
```

---

### Service Fulfillment Callback
Your app must send a callback to Hubtel after service is rendered (within one hour).

- **Endpoint:** `https://gs-callback.hubtel.com:9055/callback`
- **Request Type:** POST
- **Content Type:** JSON

**Sample Callback (Success):**
```json
{
  "SessionId":"3c796dac28174f739de4262d08409c51",
  "OrderId": "ac3307bcca7445618071e6b0e41b50b5",
  "ServiceStatus":"success",
  "MetaData":null
}
```

**Sample Callback (Failed):**
```json
{
  "SessionId":"3c796dac28174f739de4262d08409c51",
  "OrderId": "ac3307bcca7445618071e6b0e41b50b5",
  "ServiceStatus":"failed",
  "MetaData":null
}
```

---

### Transaction Status Check
Check transaction status if no final status is received after five minutes.

- **Endpoint:** `https://api-txnstatus.hubtel.com/transactions/{POS_Sales_ID}/status`
- **Request Type:** GET
- **Content Type:** JSON

**Request Parameters:**
- clientReference (String, Mandatory): SessionId or client reference
- hubtelTransactionId (String, Optional)
- networkTransactionId (String, Optional)

**Sample Request:**
```http
GET /transactions/11684/status?clientReference=0c987dbb0cc64501b19812d99b859885 HTTP/1.1
Host: api-txnstatus.hubtel.com
Authorization: Basic QmdfaWghe2Jhc2U2NF9lbmNvZGUoa2hzcW9seXU6bXVhaHdpYW8pfQ==
```

**Sample Response (Paid):**
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
      "clientReference": "0c987dbb0cc64501b19812d99b859885",
      "currencyCode": null,
      "amount": 0.1,
      "charges": 0.02,
      "amountAfterCharges": 0.08,
      "isFulfilled": null
  }
}
```

**Sample Response (Unpaid):**
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
      "clientReference": "0c987dbb0cc64501b19812d99b859885",
      "currencyCode": null,
      "amount": 0.1,
      "charges": 0.02,
      "amountAfterCharges": 0.08,
      "isFulfilled": null
  }
}
```

---

## Notes
- Update this document whenever the configuration or API changes.
- For more details, refer to the project README or contact the development team.
