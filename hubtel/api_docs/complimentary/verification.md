# Verification API Documentation

**Last updated:** December 23rd, 2025

---

## Overview

The Hubtel Verification API allows you to:
- Verify a customer's MSISDN name used in SIM registration
- Check Mobile Money wallet details (name, registration status, profile)
- Validate Ghana ID and Voter ID details with name match scoring
- Confirm a customer's bank and bank account name before transferring money

Supported Mobile Money Providers:
- MTN Ghana (`mtn-gh`)
- Telecel Ghana (`vodafone-gh`)
- AirtelTigo Ghana (`tigo-gh`)

---

## Getting Started

**Business IP Whitelisting:**
- Share your public IP address with your Retail System Engineer for whitelisting.
- All API endpoints are live and only requests from whitelisted IP(s) can reach these endpoints.

---

## API Reference

### MSISDN Name Query
- **Endpoint:** `https://cs.hubtel.com/commissionservices/{Hubtel_POS_Sales_ID}/3e0841e70afc42fb97d13d19abd36384?destination={CustomerNumber}`
- **Request Type:** GET
- **Content Type:** JSON

**Request Parameters:**
- Hubtel_POS_Sales_ID (Number, Mandatory)
- destination (String, Mandatory): Customer's phone number (formats: 0XXXXXXXXX or 233XXXXXXXXX)

**Sample Request:**
```http
GET commissionservices/11684/3e0841e70afc42fb97d13d19abd36384?destination=233501431586 HTTP/1.1
Host: cs.hubtel.com
Accept: application/json
Content-Type: application/json
Authorization: Basic endjeOBiZHhza250fT3=
Cache-Control: no-cache
```

**Sample Response:**
```json
{
  "ResponseCode": "0000",
  "Message": "Customer Details",
  "Label": "Customer Details",
  "Data": [
    {
      "Display": "name",
      "Value": "JOSEPH ANNOH",
      "Amount": 0.0
    }
  ]
}
```

---

### Mobile Money Registration & Username Query
- **Endpoint:** `https://rnv.hubtel.com/v2/merchantaccount/merchants/{Hubtel_POS_Sales_ID}/mobilemoney/verify?channel={channel}&customerMsisdn={CustomerNumber}`
- **Request Type:** GET
- **Content Type:** JSON

**Request Parameters:**
- Hubtel_POS_Sales_ID (Number, Mandatory)
- channel (String, Mandatory): `mtn-gh`, `vodafone-gh`, `tigo-gh`
- customerMsisdn (String, Mandatory): Customer's mobile money number

**Sample Request:**
```http
GET v2/merchantaccount/merchants/11684/mobilemoney/verify?channel=vodafone-gh&customerMsisdn=0501431586 HTTP/1.1
Host: rnv.hubtel.com
Accept: application/json
Content-Type: application/json
Authorization: Basic endjeOBiZHhza250fT3=
Cache-Control: no-cache
```

**Sample Response:**
```json
{
  "message": "Success",
  "responseCode": "0000",
  "data": {
    "isRegistered": true,
    "name": "JOSEPH ANNOH",
    "status": "active",
    "profile": "Subscriber"
  }
}
```

---

### Ghana ID Validation
- **Endpoint:** `https://rnv.hubtel.com/v2/merchantaccount/merchants/{Hubtel_POS_Sales_ID}/ghanacard/verify`
- **Request Type:** POST
- **Content Type:** JSON

**Request Parameters:**
- Hubtel_POS_Sales_ID (Number, Mandatory)
- ghanaCardNumber (String, Mandatory): Format as printed (e.g. GHA-7XXXXXXXX-0)
- surname (String, Mandatory)
- firstnames (String, Mandatory)
- gender (String, Mandatory)
- dateOfBirth (String, Mandatory): Format dd/mm/yyyy

**Sample Request:**
```http
POST v2/merchantaccount/merchants/11684/ghanacard/verify HTTP/1.1
Host: rnv.hubtel.com
Accept: application/json
Content-Type: application/json
Authorization: Basic endjBiZHhza250fT=
Cache-Control: no-cache
{
  "ghanaCardNumber": "GHA-000000000-0",
  "surname": "Doe",
  "firstnames": "John",
  "gender": "male",
  "dateOfBirth": "dd/mm/yyyy"
}
```

**Sample Response:**
```json
{
  "message": "Success",
  "responseCode": "0000",
  "data": {
      "isValid": true,
      "score": "100%"
  }
}
```

---

### Voter ID Validation
- **Endpoint:** `https://rnv.hubtel.com/v2/merchantaccount/merchants/{Hubtel_POS_Sales_ID}/voteridcard/verify`
- **Request Type:** POST
- **Content Type:** JSON

**Request Parameters:**
- Hubtel_POS_Sales_ID (Number, Mandatory)
- voterIdCardNumber (String, Mandatory)
- surname (String, Mandatory)
- othernames (String, Mandatory)
- sex (String, Mandatory)
- dateOfBirth (String, Mandatory): Format yyyy/mm/dd

**Sample Request:**
```http
POST v2/merchantaccount/merchants/11684/voteridcard/verify HTTP/1.1
Host: rnv.hubtel.com
Accept: application/json
Content-Type: application/json
Authorization: Basic endjBiZHhza250fT=
Cache-Control: no-cache
{
  "voterIdCardNumber": "0000000000",
  "surname": "Doe",
  "othernames": "John",
  "sex": "male",
  "dateOfBirth": "yyyy/mm/dd"
}
```

**Sample Response:**
```json
{
  "message": "Success",
  "responseCode": "0000",
  "data": {
      "isValid": true,
      "score": "100%"
  }
}
```

---

### MTN Chenosis API
- **Endpoint:** `https://rnv.hubtel.com/v2/merchantaccount/merchants/{Hubtel_POS_Sales_ID}/idcard/verify?idtype=ghanacard&idnumber={CustomerMsisdn}&network=MTN&consentType={consentType}`
- **Request Type:** GET
- **Content Type:** JSON

**Request Parameters:**
- Hubtel_POS_Sales_ID (Number, Mandatory)
- idnumber (String, Mandatory): Customer's MTN number
- consentType (String, Optional): `sms` or `ussd`

**Sample Request:**
```http
GET v2/merchantaccount/merchants/11684/idcard/verify?idtype=ghanacard&idnumber=233XXXXXXXXX&network=MTN&consentType=ussd HTTP/1.1
Host: rnv.hubtel.com
Accept: application/json
Content-Type: application/json
Authorization: Basic endjBiZHhza250fT=
Cache-Control: no-cache
```

**Sample Response:**
```json
{
  "message": "Success",
  "responseCode": "0000",
  "data": {
    "name": "JOHN DONATUS MILLS",
    "dateOfBirth": "1984 June 23",
    "gender": "MALE",
    "nationalId": "GHA-000000000-0"
  }
}
```

---

### Bank Account Name Query
- **Endpoint:** `https://rnv.hubtel.com/v2/merchantaccount/merchants/{Hubtel_POS_Sales_ID}/bank/verify/{bankcode}/{bankAccountNumber}`
- **Request Type:** GET
- **Content Type:** JSON

**Bank Channels & Codes:**

| Bank Name | BankCode |
|-----------|----------|
| STANDARD CHARTERED BANK | 300302 |
| ABSA BANK GHANA LIMITED | 300303 |
| GCB BANK LIMITED | 300304 |
| NATIONAL INVESTMENT BANK | 300305 |
| ARB APEX BANK LIMITED | 300306 |
| AGRICULTURAL DEVELOPMENT BANK | 300307 |
| UNIVERSAL MERCHANT BANK | 300309 |
| REPUBLIC BANK LIMITED | 300310 |
| ZENITH BANK GHANA LTD | 300311 |
| ECOBANK GHANA LTD | 300312 |
| CAL BANK LIMITED | 300313 |
| FIRST ATLANTIC BANK | 300316 |
| PRUDENTIAL BANK LTD | 300317 |
| STANBIC BANK | 300318 |
| FIRST BANK OF NIGERIA | 300319 |
| BANK OF AFRICA | 300320 |
| GUARANTY TRUST BANK | 300322 |
| FIDELITY BANK LIMITED | 300323 |
| SAHEL - SAHARA BANK (BSIC) | 300324 |
| UNITED BANK OF AFRICA | 300325 |
| ACCESS BANK LTD | 300329 |
| CONSOLIDATED BANK GHANA | 300331 |
| FIRST NATIONAL BANK | 300334 |
| GHL BANK | 300362 |

**Sample Request:**
```http
GET v2/merchantaccount/merchants/11684/bank/verify/300312/144100225608 HTTP/1.1
Host: rnv.hubtel.com
Accept: application/json
Content-Type: application/json
Authorization: Basic endjBiZHhza250fT=
Cache-Control: no-cache
```

**Sample Response (Success):**
```json
{
  "message": "Success",
  "responseCode": "0000",
  "data": {
    "name": "JOHN DOE"
  }
}
```

**Sample Response (Failed):**
```json
{
  "message": "We're sorry, we could not verify this account. Do you want to save anyway?",
  "responseCode": "2001",
  "data": null
}
```

---

## Response Codes

| HTTP Status | ResponseCode | Description | Required Action |
|-------------|--------------|-------------|-----------------|
| 200         | 0000         | Request processed successfully | None |
| 424         | 2001         | Failed dependency | Data may take time to sync |
| 400         | 2001         | Could not verify account | Pass valid account number |
| 404         | 3000/2001    | Not found/Invalid account | Check registration or card issuer |
| 400         | 4000         | Missing required parameter | Try again with valid request |

---

## Notes
- Update this document whenever the configuration or API changes.
- For more details, refer to the project README or contact the development team.
