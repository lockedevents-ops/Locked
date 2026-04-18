# Invoicing API Documentation

**Last updated:** December 23rd, 2025

---

## Overview

The Hubtel Invoicing API enables merchants to generate invoices and receive payments from customers through one-time payments, installment plans, and auto debits (MTN and Telecel only) using:
- Mobile Money
- Bank Card
- Wallet (G-Money)
- Cash / Cheque

With a single integration, you can accept one-time, installment, and automated debit payments on your application. Provide the customer's debit details and Hubtel will manage the scheduling and processing of payments.

---

## Getting Started

### Service Flow

The API includes three main endpoints for creating invoices:
- **Pay At Once:** Create an invoice for a full one-time payment.
- **Pay In Installments:** Create an invoice for payment in full or partial payments.
- **Auto Debit:** Create an invoice for automated payments until the due date.

![Invoice Page](../../api_flow_images/invoice_page.png)

Customers receive notifications via SMS and email:

![Invoice SMS](../../api_flow_images/invoicing_sms.jpg) ![Invoice Email](../../api_flow_images/invoicing_email.jpg)

---

## API Reference

### Pay At Once
- **Endpoint:** `https://invoicing.hubtel.com/api/invoice/{POS_SALES_ID}/pay-at-once`
- **Request Type:** POST
- **Content Type:** JSON

**Request Parameters:**
- invoiceNumber (String, Mandatory): Invoice number (max 20 chars)
- customerName (String, Mandatory)
- callbackUrl (String, Mandatory)
- customerPhoneNumber (String, Mandatory)
- customerEmail (String, Optional)
- hasTax (Boolean, Optional)
- issuedBy (String, Mandatory)
- createdBy (String, Mandatory)
- dueDate (DateTime, Mandatory)
- note (String, Optional)
- reminders (ArrayOfObjects, Mandatory):
  - isBefore (Boolean, Mandatory)
  - days (Integer, Mandatory)
- items (ArrayOfObjects, Mandatory):
  - description (String, Mandatory)
  - quantity (String, Mandatory)
  - unitPrice (Float, Mandatory)

**Sample Request:**
```http
POST /api/invoice/11684/pay-at-once HTTP/1.1
Host: invoicing.hubtel.com
Accept: application/json
Content-Type: application/json
Authorization: Basic endjeOBiZHhza24=
Cache-Control: no-cache

{
  "invoiceNumber": "test23",
  "customerName": "John",
  "customerPhoneNumber": "024000000",
  "customerEmail": "rse@gmail.com",
  "hasTax": true,
  "issuedBy": "John",
  "createdBy": "John",
  "dueDate": "2025-03-18T11:20:23.147Z",
  "isDefault": true,
  "callbackUrl": "https://webhook.site/40b08e13-05f2-4892-8709-fe379878e6be",
  "note": "Pay at Once",
  "reminders": [
      {
          "days": 5,
          "isBefore": true
      }
  ],
  "items": [
      {
          "description": "Test Invoice",
          "quantity": 1,
          "unitPrice": 0.01
      }
  ]
}
```

**Sample Response:**
```json
{
  "message": "Invoice Created Successfully",
  "code": 200,
  "data": {
      "invoiceId": "hA344ftcBZ",
      "paymentUrl": "https://invdebit.com/hA344ftcBZ"
  }
}
```

**Callback Example (Successful):**
```json
{
  "Status": "Successful",
  "ResponseCode": "0000",
  "Data": {
      "AmountPaid": 150.75,
      "InvoiceId": "INV-123456",
      "ReceiptNumber": "RCPT-987654",
      "Description": "Payment for services rendered",
      "PaymentMethod": "Credit Card",
      "PaymentChannel": "Online",
      "PayeePhoneNumber": "+233555123456"
  }
}
```

**Callback Example (Failed):**
```json
{
  "Status": "Failed",
  "ResponseCode": "0001",
  "Data": {
      "AmountPaid": 0.00,
      "InvoiceId": "INV-789012",
      "ReceiptNumber": "",
      "Description": "Payment attempt failed",
      "PaymentMethod": "Mobile Money",
      "PaymentChannel": "USSD",
      "PayeePhoneNumber": "+233555654321"
  }
}
```

---

### Pay In Installments
- **Endpoint:** `https://invoicing.hubtel.com/api/invoice/{POS_SALES_ID}/pay-in-installments`
- **Request Type:** POST
- **Content Type:** JSON

**Request Parameters:**
(Similar to Pay At Once, with isDefault and reminders optional)

**Sample Request:**
```http
POST /api/invoice/11684/pay-in-installments HTTP/1.1
Host: invoicing.hubtel.com
Accept: application/json
Content-Type: application/json
Authorization: Basic endjeOBiZHhza24=
Cache-Control: no-cache

{
  "invoiceNumber": "test443",
  "customerName": "John",
  "customerPhoneNumber": "0240000000",
  "customerEmail": "rse@gmail.com",
  "hasTax": false,
  "issuedBy": "Jon",
  "createdBy": "Jon",
  "dueDate": "2025-03-18T08:00:23.147Z",
  "isDefault": true,
  "callbackUrl": "https://webhook.site/40b08e13-05f2-4892-8709-fe379878e6be",
  "note": "Pay in Installments",
  "reminders": [
      {
          "days": 5,
          "isBefore": true
      }
  ],
  "items": [
      {
          "description": "Test Invoice",
          "quantity": 1,
          "unitPrice": 0.10
      }
  ]
}
```

**Sample Response:**
```json
{
  "message": "Invoice Created Successfully",
  "code": 200,
  "data": {
      "invoiceId": "hA344ftcBZ",
      "paymentUrl": "https://invdebit.com/hA344ftcBZ"
  }
}
```

**Callback Example (Successful):**
```json
{
  "Status": "Successful",
  "ResponseCode": "0000",
  "Data": {
      "AmountPaid": 0.1,
      "InvoiceId": "8A6KpNEZqN",
      "ReceiptNumber": "257942f42ec140a1b614c7a54ece3eb7",
      "Description": "The MTN Mobile Money payment has been approved and processed successfully.",
      "PaymentMethod": "mobilemoney",
      "PaymentChannel": "mtn-gh",
      "PayeePhoneNumber": "233242825109"
  }
}
```

**Callback Example (Failed):**
```json
{
  "Status": "Failed",
  "ResponseCode": "0001",
  "Data": {
      "AmountPaid": 0.1,
      "InvoiceId": "9yDAA9e9K8",
      "ReceiptNumber": "1ac98c3de854420795fb6bdee10f3030",
      "Description": "The Vodafone Cash failed",
      "PaymentMethod": "mobilemoney",
      "PaymentChannel": "vodafone-gh-ussd",
      "PayeePhoneNumber": "233205598630"
  }
}
```

---

### Auto Debit
- **Endpoint:** `https://invoicing.hubtel.com/api/invoice/{POS_SALES_ID}/auto-debit`
- **Request Type:** POST
- **Content Type:** JSON

**Request Parameters:**
- invoiceNumber (String, Mandatory)
- customerName (String, Mandatory)
- callbackUrl (String, Mandatory)
- customerPhoneNumber (String, Mandatory)
- customerEmail (String, Optional)
- hasTax (String, Mandatory)
- issuedBy (String, Mandatory)
- createdBy (String, Mandatory)
- dueDate (DateTime, Mandatory)
- isDefault (Boolean, Optional)
- note (String, Optional)
- reminders (Object, Optional):
  - days (Integer, Mandatory)
  - isBefore (Boolean, Mandatory)
- firstPaymentAmount (Decimal, Mandatory)
- firstPaymentDueDate (DateTime, Mandatory)
- frequency (String, Mandatory): Daily, Weekly, Monthly, Yearly
- items (ArrayOfObjects, Mandatory):
  - description (String, Mandatory)
  - quantity (String, Mandatory)
  - unitPrice (Float, Mandatory)

**Sample Request:**
```http
POST /api/invoice/11684/auto-debit HTTP/1.1
Host: invoicing.hubtel.com
Accept: application/json
Content-Type: application/json
Authorization: Basic endjeOBiZHhza24=
Cache-Control: no-cache

{
  "invoiceNumber": "test2567",
  "customerName": "John",
  "customerPhoneNumber": "024000000",
  "customerEmail": "rse@gmail.com",
  "hasTax": true,
  "issuedBy": "John",
  "createdBy": "John",
  "dueDate": "2025-03-20T08:00:23.147Z",
  "isDefault": false,
  "callbackUrl": "https://webhook.site/40b08e13-05f2-4892-8709-fe379878e6be",
  "note": "Auto Debit test",
  "firstPaymentDueDate": "2025-03-18T11:50:23.147Z",
  "firstPaymentAmount": 0.50,
  "frequency": "Daily",
  "reminders": [
      {
          "days": 2,
          "isBefore": true
      }
  ],
  "items": [
      {
          "description": "Auto Debit test",
          "quantity": 1,
          "unitPrice": 1
      }
  ]
}
```

**Sample Response:**
```json
{
  "message": "Invoice Created Successfully",
  "code": 200,
  "data": {
      "invoiceId": "j2ZqgYN5ft",
      "paymentUrl": "https://invdebit.com/j2ZqgYN5ft"
  }
}
```

**Callback Example (Successful):**
```json
{
  "Status": "Successful",
  "ResponseCode": "0000",
  "Data": {
      "AmountPaid": 0.01,
      "InvoiceId": "K7hyTQcnT4",
      "ReceiptNumber": "424f62e92e9245589d38e1583329d46b",
      "Description": "The Vodafone Cash payment has been approved and processed successfully.",
      "PaymentMethod": "mobilemoney",
      "PaymentChannel": "vodafone-gh",
      "PayeePhoneNumber": "233200585542",
      "PaymentDetailId": "f4031fd2-d9ac-47dd-a399-5135cdc65e72"
  }
}
```

**Callback Example (Failed):**
```json
{
  "Status": "Failed",
  "ResponseCode": "0001",
  "Data": {
      "AmountPaid": 0.1,
      "InvoiceId": "9yDAA9e9K8",
      "ReceiptNumber": "1ac98c3de854420795fb6bdee10f3030",
      "Description": "The Vodafone Cash failed",
      "PaymentMethod": "mobilemoney",
      "PaymentChannel": "vodafone-gh-ussd",
      "PayeePhoneNumber": "233205598630"
  }
}
```

---

### Retry API
- **Endpoint:** `https://invoicing.hubtel.com/api/invoice/{POS_SALES_ID}/payments/{PaymentDetailId}/retry`
- **Request Type:** POST
- **Content Type:** JSON

**Request Parameters:**
- POS_SALES_ID (String, Mandatory)
- PaymentDetailId (String, Mandatory)

**Sample Request:**
```http
POST /api/invoice/11684/payments/98a9fd4a-47f3-4709-8c4f-fb89465fcf51/retry HTTP/1.1
Host: invoicing.hubtel.com
Accept: application/json
Content-Type: application/json
Authorization: Basic endjeOBiZHhza24=
Cache-Control: no-cache
```

**Sample Response:**
```json
{
  "message": "Payment retry has been initiated. Check invoice status for confirmation.",
  "code": 200,
  "data": null
}
```

**Callback Example (Successful):**
```json
{
  "Status": "Successful",
  "ResponseCode": "0000",
  "Data": {
    "AmountPaid": 0.02,
    "InvoiceId": "K7hyTQcnT4",
    "ReceiptNumber": "K7hyTQcnT4-1",
    "Description": "The Vodafone Cash payment has been approved and processed successfully.",
    "PaymentMethod": "mobilemoney",
    "PaymentChannel": "vodafone-gh",
    "PayeePhoneNumber": "233200585542",
    "PaymentDetailId": "98a9fd4a-47f3-4709-8c4f-fb89465fcf51"
  }
}
```

**Callback Example (Failed):**
```json
{
    "Status": "Failed",
    "ResponseCode": "0001",
    "Data": {
        "AmountPaid": 0.02,
        "InvoiceId": "K7hyTQcnT4",
        "ReceiptNumber": "K7hyTQcnT4-1",
        "Description": "Balance insufficient.",
        "PaymentMethod": "mobilemoney",
        "PaymentChannel": "vodafone-gh",
        "PayeePhoneNumber": "233200585542",
        "PaymentDetailId": "98a9fd4a-47f3-4709-8c4f-fb89465fcf51"
    }
}
```

---

### Transaction Status Check
- **Endpoint:** `https://invoicing.hubtel.com/api/invoice/{POS_SALES_ID}/{invoiceId}/status-check`
- **Request Type:** GET
- **Content Type:** JSON

**Sample Request:**
```http
GET api/invoice/11684/7w6wZymWZ2/status-check HTTP/1.1
Host: invoicing.hubtel.com
Authorization: Basic QmdfaWghe2JheXU6bXVhaHdpYW8pfQ==
```

**Sample Response (Paid):**
```json
{
  "message": "Success",
  "code": 200,
  "data": {
      "paymentStatus": "Paid In Full",
      "paymentDetails": [
          {
              "id": "a7b82f4e-3dd4-41e2-bb16-1f50b8ec391c",
              "amountDue": 0.01,
              "amountPaid": 0.01,
              "dueDate": "2025-03-20T12:11:23.147",
              "paymentDate": "2025-03-20T12:11:40.197885",
              "orderId": "a336f52370eb4a2c992865a4196236de",
              "status": "Paid",
              "isWithinRetryWindow": false,
              "retriedCount": 0,
              "receiptNumber": "79aeb15751f04b9d86061c1145ee4f52"
          }
      ]
  }
}
```

**Sample Response (Unpaid):**
```json
{
  "message": "Success",
  "code": 200,
  "data": {
      "paymentStatus": "Pending",
      "paymentDetails": [
          {
              "id": "c56be293-4ccb-4a3b-8052-66668af55932",
              "amountDue": 0.1,
              "amountPaid": 0.10,
              "dueDate": "2025-03-20T09:46:23.147",
              "paymentDate": "2025-03-20T09:53:17.294052",
              "orderId": "26868b440f5d498abf76d7c0d2bbf3d8",
              "status": "Failed",
              "isWithinRetryWindow": false,
              "retriedCount": 0,
              "receiptNumber": "1ac98c3de854420795fb6bdee10f3030"
          },
          {
              "id": "bc5c9e36-2161-4770-8aec-3956dc930a36",
              "amountDue": 0.1,
              "amountPaid": 0,
              "dueDate": "2025-03-20T09:46:23.147",
              "paymentDate": "0001-01-01T00:00:00",
              "orderId": null,
              "status": "Pending",
              "isWithinRetryWindow": false,
              "retriedCount": 0,
              "receiptNumber": null
          }
      ]
  }
}
```

---

## Response Codes

| Response Code | Description | Required Action |
|---------------|-------------|-----------------|
| 0000 | Transaction processed successfully. | None |
| 0001 | Transaction failed. | None |
| 0005 | HTTP failure/exception. | Contact Retail Systems Engineer. |
| 2001 | Payment processor error. | Review request or retry. |
| 2100 | Customer's phone is off. | None |
| 2101 | Invalid PIN entered (Airtel Money). | None |
| 2102 | Insufficient funds (Airtel Money). | None |
| 2103 | Not registered on Airtel Money. | None |
| 2050 | Insufficient funds (MTN Mobile Money). | Top up wallet. |
| 2051 | Not registered on MTN Mobile Money. | Ensure registration. |
| 2152 | Not registered on Tigo Cash. | None |
| 2153 | Amount exceeds Tigo Cash max. | None |
| 2154 | Amount exceeds Tigo Cash daily limit. | None |
| 2200 | Not registered on Vodafone Cash. | None |
| 2201 | Not registered on Vodafone Cash. | None |
| 3008 | Not registered on Vodafone Cash. | Upload business registration documents. |
| 3009 | Merchant account not available. | Check account number. |
| 3012 | Insufficient merchant account funds. | Amount less than funds. |
| 3013 | Amount less than fees. | Amount less than fee. |
| 3022 | Channel not activated. | None |
| 3024 | Invalid channel provider. | None |
| 4000 | Validation errors. | Check request. |
| 4075 | Insufficient prepaid balance. | Top up prepaid balance. |
| 4080 | Insufficient available balance. | None |
| 4101 | Authorization denied. | Check Auth key and POS Sales number. |
| 4103 | Permission denied. | Check API keys. |
| 4105 | Organization not owner of account. | Ensure keys and account match. |
| 4505 | Transaction already refunded. | None |

---

## Notes
- Update this document whenever the configuration or API changes.
- For more details, refer to the project README or contact the development team.
