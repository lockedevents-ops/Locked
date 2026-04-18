# SMS API Documentation

**Last updated:** December 23rd, 2025

---

## Overview

The Hubtel SMS API allows businesses to integrate SMS functionality into their applications, including:
- Sending simple or batch messages
- Sending personalized messages
- High-throughput SMPP route for large-scale delivery

---

## SMPP

For enterprise-grade, reliable SMS delivery, Hubtel provides an SMPP route supporting:
- Bind Transmitter (TX): Send SMS
- Bind Receiver (RX): Receive delivery receipts
- Bind Transceiver (TRX): Send/receive messages and receipts
- Submit_SM: Submit single SMS
- Deliver_SM: Receive delivery receipts
- Unbind: Close SMPP session

**Connection Details:**
- Host: smpp.hubtel.com
- Port: 2775
- ClientID, ClientSecret: Contact Retail Systems Engineer

Refer to the detailed SMPP documentation for more information.

---

## SMS API Endpoints

### Simple SEND SMS (GET)
- **Endpoint:** `https://sms.hubtel.com/v1/messages/send?clientsecret=xxxxxxxx&clientid=xxxxxxxx&from=Hubtel&to=0244xxxxxx&content=Helloworld`
- **Request Type:** GET

**Request Parameters:**
- clientid (String, Mandatory)
- clientsecret (String, Mandatory)
- from (String, Mandatory, max 11 chars)
- to (String, Mandatory)
- content (String, Mandatory)

**Sample Request:**
```http
GET /v1/messages/send?clientsecret=sgrorne&clientid=qoohqvcp&from=Abrantie&to=233546335113&content="GoTesting" HTTP/1.1
Host: sms.hubtel.com
```

**Sample Response:**
```json
{
    "rate": 0.0309,
    "messageId": "9c5f3edc-529e-4182-959b-aeb17b9ddad4", 
    "status": 0,
    "networkId": "62001", 
    "clientReference": null,
    "statusDescription": "request submitted successfully"
}
```

---

### Simple SEND SMS (POST)
- **Endpoint:** `https://sms.hubtel.com/v1/messages/send`
- **Request Type:** POST
- **Content Type:** JSON

**Request Parameters:**
- From (String, Mandatory, max 11 chars)
- To (String, Mandatory)
- Content (String, Mandatory)

**Sample Request:**
```http
POST /v1/messages/send HTTP/1.1
Host: sms.hubtel.com
Content-Type: application/json
Authorization: Basic cW92Y7c2dyb3Juam=
{
  "From": "AbrantieLai",
  "To": "233546335113",
  "Content": "This is a test. Kindly ignore."
}
```

**Sample Response:**
```json
{
  "rate": 0.0246,
  "messageId": "fab43849-6c5b-4334-a88b-d06520b1ace8",
  "status": 0,
  "networkId": "62002",
  "clientReference": null,
  "statusDescription": "request submitted successfully"
}
```

---

### Batch Simple Messaging
- **Endpoint:** `https://sms.hubtel.com/v1/messages/batch/simple/send`
- **Request Type:** POST
- **Content Type:** JSON

**Request Parameters:**
- From (String, Mandatory, max 11 chars)
- Recipients (Array, Mandatory): List of MSISDNs
- Content (String, Mandatory)

**Sample Request:**
```http
POST /v1/messages/batch/simple/send HTTP/1.1
Host: sms.hubtel.com
Content-Type: application/json
Authorization: Basic cW92Y6c2dyb3Juam=
{
    "From": "AbrantieLai",
    "Recipients": [
        "233546335113",
        "233501431586"
    ],
    "Content": "Welcome to the first ever bulk SMS via API in Ghana"
}
```

**Sample Response:**
```json
{
  "batchId": "165949ee-431b-4bf8-9eca-108058a8bc32", 
  "status": 0,
  "data": [
    {
      "recipient": "233546335113",
      "content": "Welcome to the first ever bulk SMS via API in Ghana", 
      "messageId": "e80133f9-e822-457c-98fb-d217bc4a1f83"
    }, 
    {
      "recipient": "233501431586",
      "content": "Welcome to the first ever bulk SMS via API in Ghana", 
      "messageId": "ebc7948a-7c81-4396-9104-9c99fc921069"
    } 
  ]
}
```

---

### Batch Personalized Messaging
- **Endpoint:** `https://sms.hubtel.com/v1/messages/batch/personalized/send`
- **Request Type:** POST
- **Content Type:** JSON

**Request Parameters:**
- From (String, Mandatory, max 11 chars)
- personalizedRecipients (ArrayOfObjects, Mandatory): Each object contains To (MSISDN) and Content (String)

**Sample Request:**
```http
POST /v1/messages/batch/personalized/send HTTP/1.1
Host: sms.hubtel.com
Content-Type: application/json
Authorization: Basic cW92Y6c2dyb3Juam=
{
    "From" : "AbrantieCo",
    "personalizedRecipients": [
      {
          "To": "233501431586",
          "Content":"Hi Pheezy, thank you for all you do for this business"
      },
      {
          "To": "233501431586",
          "Content":"Hi Joe, thank you for all you do for this business"
      }
    ]
}
```

**Sample Response:**
```json
{
    "batchId": "18ee6a2a-29ac-41c6-b70f-de809b040584", 
    "status": 0,
    "data": [ 
      {
          "recipient": "233501431586",
          "content": "Hi Pheezy, thank you for all you do for this business", 
          "messageId": "350fd34d-dce1-4694-a4c9-d9b97d1f4593"
      }, 
      {
          "recipient": "233546335113",
          "content": "Hi Joe, thank you for all you do for this business", 
          "messageId": "f58e7f2a-203a-4079-a518-7f6647099b5e"
      }
    ]
}
```

---

### Status Check (MessageID)
- **Endpoint:** `https://sms.hubtel.com/v1/messages/{messageId}`
- **Request Type:** GET

**Request Parameters:**
- messageID (String, Mandatory)

**Sample Request:**
```http
GET /v1/messages/batch/eadbfcd0-94d1-438f-ad32-0013f34042c2 HTTP/1.1
Host: sms.hubtel.com
```

**Sample Response:**
```json
{
  "rate": 0.0309,
  "batchId": null,
  "messageId": "eadbfcd0-94d1-438f-ad32-0013f34042c2",
  "content": "The Job is the JOB",
  "status": "Delivered",
  "updateTime": "2023-05-30T16:43:15",
  "time": "2023-05-30T16:43:13.7208383Z",
  "to": "233546335113",
  "from": "AbrantieCo"
}
```

---

### Status Check (BatchID)
- **Endpoint:** `https://sms.hubtel.com/v1/messages/{batchId}`
- **Request Type:** GET

**Request Parameters:**
- batchId (String, Mandatory)

**Sample Request:**
```http
GET /v1/messages/batch/18ee6a2a-29ac-41c6-b70f-de809b040584 HTTP/1.1
Host: sms.hubtel.com
```

**Sample Response:**
```json
{
    "batchId": "18ee6a2a-29ac-41c6-b70f-de809b040584", 
    "data": [
      {
          "rate": 0.0309,
          "messageId": "f58e7f2a-203a-4079-a518-7f6647099b5e",
          "content": "Hi Joe, thank you for all you do for this business",
          "status": "Delivered",
          "updateTime": "2023-03-21T12:54:43",
          "time": "2023-03-21T12:50:27.893495Z",
          "to": "233546335113",
          "from": "AbrantieCo" 
      },
      {
          "rate": 0.0309,
          "messageId": "350fd34d-dce1-4694-a4c9-d9b97d1f4593",
          "content": "Hi Pheezy, thank you for all you do for this business",
          "status": "Delivered",
          "updateTime": "2023-03-21T12:50:34",
          "time": "2023-03-21T12:50:27.893495Z",
          "to": "233501431586",
          "from": "AbrantieCo"
      }
    ]
}
```

---

## SMS Statuses

- **Delivered:** Message delivered to recipient's phone
- **Sent:** Forwarded to network operator, pending delivery
- **Pending:** Awaiting dispatch to network operator
- **Blacklisted:** Recipient opted out of bulk messages
- **Undeliverable/Failed/Unrouteable/Rejected:** Delivery failed due to network or device issues
- **NACK/Invalid Destination Address:** Invalid recipient number
- **NACK/Invalid Source Address:** Sender ID exceeds 11 characters

---

## Response Codes

| Http Code | Status | Description |
|-----------|--------|-------------|
| 200/201   | 0      | Request successful, message sent for delivery |
| 201       | 100    | General invalid request |
| 201       | 1      | Invalid destination address |
| 201       | 2      | Invalid source address |
| 400       | 3      | Message body too long |
| 400       | 4      | Message not routable |
| 400       | 5      | Invalid delivery time |
| 6         |        | Message content rejected/invalid |
| 7         |        | Parameter not allowed |
| 8         |        | Parameter not valid |
| 12        |        | Payment required, fund account |
| 401       |        | Authorization failed |
| 402       |        | Insufficient messaging credit |
| 403       |        | Forbidden, recipient not approved |
| 404       |        | Message not found |
| 500       |        | Server error |
| 502       |        | Bad Gateway |

---

## Notes
- Update this document whenever the configuration or API changes.
- For more details, refer to the project README or contact the development team.
