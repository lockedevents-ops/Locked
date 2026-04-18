# Commission Services API Documentation

**Last updated:** December 23rd, 2025

---

## Overview

The Hubtel Commission Services API is a set of developer tools and products that help businesses, financial organizations, and individuals facilitate bill payments, airtime top-ups, and other digital services for customers.

---

## Base Endpoint

All requests to the Commission Services API use the following base URL format:

| Parameter | Value |
|-----------|-------|
| BaseURL | `https://cs.hubtel.com/commissionservices` |
| HubtelPrepaidDepositID | `{HubtelPrepaidDepositID}` |
| ServiceID | `{serviceID}` |
| Content Type | JSON |

**Generic Endpoint:**
```
{BaseUrl}/{HubtelPrepaidDepositID}/{ServiceID}
```

**Example:**
```
https://cs.hubtel.com/commissionservices/11691/fdd76c884e614b1c8f669a3207b09a98
```

---

## ServiceIDs

| ServiceID | Description |
|-----------|-------------|
| fdd76c884e614b1c8f669a3207b09a98 | MTN Airtime |
| f4be83ad74c742e185224fdae1304800 | Telecel Airtime |
| dae2142eb5a14c298eace60240c09e4b | AirtelTigo Airtime |
| e6d6bac062b5499cb1ece1ac3d742a84 | ECG Prepaid & PostPaid |
| b9a1aa246ba748f9ba01ca4cdbb3d1d3 | Telecel Broadband |
| b230733cd56b4a0fad820e39f66bc27c | MTN Data |
| fa27127ba039455da04a2ac8a1613e00 | Telecel Data |
| 06abd92da459428496967612463575ca | AirtelTigo Data |
| 297a96656b5846ad8b00d5d41b256ea7 | DSTV |
| e6ceac7f3880435cb30b048e9617eb41 | GOtv |
| a3ab78c84c6b4976b78a6f393e247a72 | Telecel Postpaid Bills |
| 6c1e8a82d2e84feeb8bfd6be2790d71d | Ghana Water |
| 6598652d34ea4112949c93c079c501ce | StarTimes TV |

---

## Getting Started

### Understanding the Service Flow

The Hubtel Sales API allows you to integrate multiple functionalities into your applications. This document focuses on:

- **Commission Services endpoints:** REST API to either query one of the service endpoints or make a bill payment.
- **Status Check API:** REST API to check for the status of a Commissions Service transaction initiated previously after five (5) or more minutes of the transaction's completion. It is mandatory to implement the Transaction Status Check API only for transactions that you do not receive a callback from Hubtel.

The entire process is asynchronous. The figure below demonstrates the service flow:

![Commission Services Flow](../../api_flow_images/commission_services.png)

```mermaid
sequenceDiagram
    participant ClientApp as Client App
    participant Hubtel
    participant Provider as Service Provider
    
    ClientApp->>Hubtel: Service Request (Airtime/Bill)
    Hubtel-->>ClientApp: Response (Status: Pending)
    Hubtel->>Provider: Process Request
    Provider-->>Hubtel: Confirmation
    Hubtel->>ClientApp: Final Callback (Status: Success/Failed)
    
    opt No Callback received after 5 mins
        ClientApp->>Hubtel: Status Check Request
        Hubtel-->>ClientApp: Return Final Status
    end
```

| Step | Description |
|------|-------------|
| 1 | Client App makes a Commissions Service request to Hubtel. |
| 2 | Hubtel performs authentication on the request and sends a response to Client App accordingly. |
| 3 | A final callback is sent to Client App via the CallbackURL provided in the request. |
| 4 | In instances where a merchant does not receive the final status of the transaction after five (5) minutes from Hubtel, it is mandatory to do a status check using the Status Check API to determine the final status of the transaction. |

---

## API Reference

The core services are broken down into three main kinds: **Airtime Top-ups**, **Data Bundles** and **Utility Payments**. The details of how to integrate with each of the services can be found below.

> [!IMPORTANT]
> It's also mandatory to pass your Hubtel Prepaid Deposit ID for every Commission Service request in the URL. Replace `{HubtelPrepaidDepositID}` in the endpoint with your Hubtel Prepaid Deposit ID.

---

## Airtime Top-Ups

> [!NOTE]
> The maximum airtime top-up amount per request is 100 cedis.

### MTN Airtime Top-Up

This endpoint is used to top up an MTN account with Airtime.

| Property | Value |
|----------|-------|
| API Endpoint | `https://cs.hubtel.com/commissionservices/{HubtelPrepaidDepositID}/fdd76c884e614b1c8f669a3207b09a98` |
| Request Type | POST |
| Content Type | JSON |

**Request Parameters:**

| Parameter | Type | Requirement | Description |
|-----------|------|-------------|-------------|
| Destination | String | Mandatory | The destination account to receive the airtime value. |
| Amount | Float | Mandatory | The airtime value to be sent during this transaction. NB: Only 2 decimal places allowed (E.g.: 0.50). |
| CallbackUrl | String | Mandatory | Used to receive the callback for the transaction from Hubtel. |
| ClientReference | String | Mandatory | The reference number that is provided by the API user. |

**Response Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| ResponseCode | String | The unique response code on the status of the transaction. |
| Message | String | The description of the response received from the API call. |
| Data | Object | An object containing the required data response from the API. |
| ClientReference | String | The reference number initially provided by the API user. |
| Amount | Float | The transaction amount, minus the charges/fees. |
| TransactionId | String | The unique ID to identify a transaction. |
| Meta | Object | Object that contains Commission key. |
| Commission | String | The commission gained for the transaction. |

**Sample Request:**
```http
POST /commissionservices/11691/fdd76c884e614b1c8f669a3207b09a98 HTTP/1.1
Host: cs.hubtel.com
Accept: application/json
Content-Type: application/json
Authorization: Basic endjeOBiZHhza250fT3=

{
    "Destination": "233246912184",
    "Amount": 0.5,
    "CallbackUrl": "https://webhook.site/fcad8efa-624b-44c8-a129-b1c01921191d",
    "ClientReference": "TestEVD01011"
}
```

**Sample Response:**
```json
{
  "ResponseCode": "0001",
  "Message": "Transaction pending. Expect callback request for final state",
  "Data": {
      "ClientReference": "TestEVD01011",
      "Amount": 0.85,
      "TransactionId": "a50e003d8d8741d49a3a0dc677a7576b",
      "Meta": {
          "Commission": "0.05"
      }
  }   
}
```

---

### Telecel Airtime Top-Up

This endpoint is used to top up a Telecel account with Airtime.

| Property | Value |
|----------|-------|
| API Endpoint | `https://cs.hubtel.com/commissionservices/{HubtelPrepaidDepositID}/f4be83ad74c742e185224fdae1304800` |
| Request Type | POST |
| Content Type | JSON |

**Request Parameters:**

| Parameter | Type | Requirement | Description |
|-----------|------|-------------|-------------|
| Destination | String | Mandatory | The destination account to receive the airtime value. |
| Amount | Float | Mandatory | The airtime value to be sent during this transaction. (E.g: 0.5) |
| CallbackUrl | String | Mandatory | Used to receive the callback for the transaction from Hubtel. |
| ClientReference | String | Mandatory | The reference number that is provided by the API user. |

**Sample Request:**
```http
POST /commissionservices/11691/f4be83ad74c742e185224fdae1304800 HTTP/1.1
Host: cs.hubtel.com
Accept: application/json
Content-Type: application/json
Authorization: Basic endjeOBiZHhza250fT3=

{
    "Destination": "233206439599",
    "Amount": 0.5,
    "CallbackUrl": "https://webhook.site/fcad8efa-624b-44c8-a129-b1c01921191d",
    "ClientReference": "TestEVD01021"
}
```

**Sample Response:**
```json
{
  "ResponseCode": "0001",
  "Message": "Transaction pending. Expect callback request for final state",
  "Data": {
      "ClientReference": "TestEVD01021",
      "Amount": 0.85,
      "TransactionId": "0305e0d79b2048e5b57647d4acaff939",
      "Meta": {
          "Commission": "0.0280"
      }
  }   
}
```

---

### AT (AirtelTigo) Airtime Top-Up

This endpoint is used to top up an AT account with Airtime.

| Property | Value |
|----------|-------|
| API Endpoint | `https://cs.hubtel.com/commissionservices/{HubtelPrepaidDepositID}/dae2142eb5a14c298eace60240c09e4b` |
| Request Type | POST |
| Content Type | JSON |

**Request Parameters:**

| Parameter | Type | Requirement | Description |
|-----------|------|-------------|-------------|
| Destination | String | Mandatory | The destination account to receive the airtime value. |
| Amount | Float | Mandatory | The airtime value to be sent during this transaction. (E.g: 0.5) |
| CallbackUrl | String | Mandatory | Used to receive the callback for the transaction from Hubtel. |
| ClientReference | String | Mandatory | The reference number that is provided by the API user. |

**Sample Request:**
```http
POST /commissionservices/11691/dae2142eb5a14c298eace60240c09e4b HTTP/1.1
Host: cs.hubtel.com
Accept: application/json
Content-Type: application/json
Authorization: Basic endjeOBiZHhza250fT3=

{
    "Destination": "233574126849",
    "Amount": 0.5,
    "CallbackUrl": "https://webhook.site/fcad8efa-624b-44c8-a129-b1c01921191d",
    "ClientReference": "TestEVD01027"
}
```

**Sample Response:**
```json
{
  "ResponseCode": "0001",
  "Data": {
      "ClientReference": "TestEVD01027",
      "Amount": 0.85,
      "TransactionId": "a1579b60845444babfe13945660a679d",
      "Meta": {
          "Commission": "0.35"
      }
  }   
}
```

---

## Data & Voice Bundle Services

> [!NOTE]
> The data bundle packages are subject to change by the telco. Be sure to query the packages before initiating a top-up request.

### MTN Data Bundle Query

This queries the MTN Data bundle service for the available bundles which can be purchased for a specific number.

| Property | Value |
|----------|-------|
| API Endpoint | `https://cs.hubtel.com/commissionservices/{HubtelPrepaidDepositID}/b230733cd56b4a0fad820e39f66bc27c?destination={RecipientNumber}` |
| Request Type | GET |
| Content Type | JSON |

**Request Parameters:**

| Parameter | Type | Requirement | Description |
|-----------|------|-------------|-------------|
| Destination | String | Mandatory | The destination number which will be receiving the data bundle value. This parameter is to be placed in the URL. Not in the request body. |

**Response Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| ResponseCode | String | The unique response code on the status of the transaction. |
| Message | String | The description of the response received from the API call. |
| Label | String | The response label from the service provider. Usually the same as the message. |
| Data | ArrayOfObjects | An Array of objects showing different bundle packages. |
| Display | String | The display key for the bundle. |
| Value | String | The value of the data bundle. This will be used in the MTN Data topup endpoint. |
| Amount | Float | The transaction amount (actual cost of the data bundle). |

**Sample Request:**
```http
GET /commissionservices/11691/b230733cd56b4a0fad820e39f66bc27c?destination=233246912184 HTTP/1.1
Host: cs.hubtel.com
Accept: application/json
Content-Type: application/json
Authorization: Basic endjeOBiZHhza250fT3=
```

**Sample Response:**
```json
{
  "ResponseCode": "0000",
  "Message": "Successful",
  "Label": "Successful",
  "Data": [
      {
          "Display": "17.79MB",
          "Value": "data_bundle_1",
          "Amount": 0.5
      },
      {
          "Display": "Kokrokoo 400MB, 5am to 8am",
          "Value": "kokrokoo_bundle_1",
          "Amount": 1.24
      },
      {
          "Display": "35.57MB",
          "Value": "data_bundle_2",
          "Amount": 1.0
      }
  ]
}
```

---

### MTN Data Bundle Top-Up

This endpoint is used to top up an MTN account with a data bundle.

| Property | Value |
|----------|-------|
| API Endpoint | `https://cs.hubtel.com/commissionservices/{HubtelPrepaidDepositID}/b230733cd56b4a0fad820e39f66bc27c` |
| Request Type | POST |
| Content Type | JSON |

**Request Parameters:**

| Parameter | Type | Requirement | Description |
|-----------|------|-------------|-------------|
| Destination | String | Mandatory | The destination account to receive the data bundle value. |
| Amount | Float | Mandatory | The cost of the data bundle being purchased. |
| CallbackUrl | String | Mandatory | Used to receive the callback for the transaction from Hubtel. |
| ClientReference | String | Mandatory | The reference number that is provided by the API user. |
| Extradata | Object | Mandatory | This Object contains the bundle name/key. |
| Bundle | String | Mandatory | The desired bundle being purchased. Taken from the "value" response parameter on the MTN Data Bundle Query Endpoint. |

> [!WARNING]
> If the Bundle and the amount do not correspond to what is taken from the Data Bundle Query endpoint, the transaction will fail.

**Sample Request:**
```http
POST /commissionservices/11691/b230733cd56b4a0fad820e39f66bc27c HTTP/1.1
Host: cs.hubtel.com
Accept: application/json
Content-Type: application/json
Authorization: Basic endjeOBiZHhza250fT3=

{
    "Destination": "233246912184",
    "Amount": 0.5,
    "CallbackUrl": "https://webhook.site/fcad8efa-624b-44c8-a129-b1c01921191d",
    "ClientReference": "TestDATA01013",
    "Extradata": {
        "bundle": "data_bundle_1"
    }
}
```

**Sample Response:**
```json
{
  "ResponseCode": "0001",
  "Message": "Transaction pending. Expect callback request for final state.",
  "Data": {
      "ClientReference": "TestDATA01013",
      "Amount": 0.5,
      "TransactionId": "5b40e2e40fd4441d80b69b352f3103c7",
      "Meta": {
          "Commission": "0.0198"
      }
  }
}
```

**Sample Callback:**
```json
{
  "ResponseCode": "0000",
  "Data": {
      "AmountDebited": 0.5,
      "TransactionId": "5b40e2e40fd4441d80b69b352f3103c7",
      "ClientReference": "TestDATA01013",
      "Description": "GHC 0.50 (data_bundle_1) has been sent to 233242825109 on January 24, 2024.",
      "ExternalTransactionId": "2024012416592042208544402",
      "Amount": 0.5,
      "Charges": 0,
      "Meta": {
          "Commission": "0.0198"
      },
      "RecipientName": null
  }
}
```

---

### Telecel Data Query

This queries the Telecel Data Bundle Service for the available bundles which can be purchased for a specific number.

| Property | Value |
|----------|-------|
| API Endpoint | `https://cs.hubtel.com/commissionservices/{HubtelPrepaidDepositID}/fa27127ba039455da04a2ac8a1613e00?destination={RecipientNumber}` |
| Request Type | GET |
| Content Type | JSON |

**Sample Response:**
```json
{
  "ResponseCode": "0000",
  "Message": "Successful",
  "Label": "Successful",
  "Data": [
      {
          "Display": " Dual Recharge",
          "Value": " 5.7 GB",
          "Amount": 50.0
      },
      {
          "Display": "Chat Monthly",
          "Value": "2 GB",
          "Amount": 20.0
      },
      {
          "Display": "Starter Monthly",
          "Value": "560 MB",
          "Amount": 10.0
      }
  ]
}
```

---

### Telecel Data Bundle Top-Up

This endpoint is used to top up a Telecel account with a data bundle.

| Property | Value |
|----------|-------|
| API Endpoint | `https://cs.hubtel.com/commissionservices/{HubtelPrepaidDepositID}/fa27127ba039455da04a2ac8a1613e00` |
| Request Type | POST |
| Content Type | JSON |

**Sample Request:**
```http
POST /commissionservices/11691/fa27127ba039455da04a2ac8a1613e00 HTTP/1.1
Host: cs.hubtel.com
Accept: application/json
Content-Type: application/json
Authorization: Basic endjeOBiZHhza250fT3=

{
    "Destination": "233206439419",
    "Amount": 0.5,
    "CallbackUrl": "https://webhook.site/fcad8efa-624b-44c8-a129-b1c01921191d",
    "ClientReference": "TestDATA01025",
    "Extradata": {
        "bundle": "25 MB"
    }
}
```

---

### Telecel Broadband Query

This queries the Telecel Broadband service to get the details of a Broadband account.

| Property | Value |
|----------|-------|
| API Endpoint | `https://cs.hubtel.com/commissionservices/{HubtelPrepaidDepositID}/b9a1aa246ba748f9ba01ca4cdbb3d1d3?destination={RecipientNumber}` |
| Request Type | GET |
| Content Type | JSON |

**Request Parameters:**

| Parameter | Type | Requirement | Description |
|-----------|------|-------------|-------------|
| Destination | String | Mandatory | The landline number on the broadband account. E.g.: "0302450262" |

**Sample Response:**
```json
{
  "ResponseCode": "0000",
  "Message": "Successful",
  "Label": "",
  "Data": [
    {
        "Display": "name",
        "Value": "BOATENG PHILIP NANA BEDIAKO",
        "Amount": 0.0
    },
    {
        "Display": "amountDue",
        "Value": "0.00",
        "Amount": 0.0
    },
    {
        "Display": "account",
        "Value": "0302450262",
        "Amount": 0.0
    }
  ]
}
```

---

### Telecel Broadband Top-Up

This endpoint is used to top up a Telecel broadband account.

| Property | Value |
|----------|-------|
| API Endpoint | `https://cs.hubtel.com/commissionservices/{HubtelPrepaidDepositID}/b9a1aa246ba748f9ba01ca4cdbb3d1d3` |
| Request Type | POST |
| Content Type | JSON |

---

### AT Data Bundle Query

This queries the AT Data Bundle Service for the available bundles which can be purchased for a specific number.

| Property | Value |
|----------|-------|
| API Endpoint | `https://cs.hubtel.com/commissionservices/{HubtelPrepaidDepositID}/06abd92da459428496967612463575ca?destination={RecipientNumber}` |
| Request Type | GET |
| Content Type | JSON |

**Sample Response:**
```json
{
  "ResponseCode": "0000",
  "Message": "Successful",
  "Label": "Select bundle",
  "Data": [
      {
          "Display": "80MB Bundle (GHS 1)",
          "Value": "DATA1",
          "Amount": 1.0
      },
      {
          "Display": "200MB Bundle (GHS 2)",
          "Value": "DATA2",
          "Amount": 2.0
      },
      {
          "Display": "650MB Bundle (GHS 5)",
          "Value": "DATA5",
          "Amount": 5.0
      },
      {
          "Display": "2GB Bundle (GHS 10)",
          "Value": "DATA10",
          "Amount": 10.0
      },
      {
          "Display": "5GB Bundle (GHS 20)",
          "Value": "DATA20",
          "Amount": 20.0
      },
      {
          "Display": "11GB Bundle (GHS 50)",
          "Value": "DATA50",
          "Amount": 50.0
      }
  ]
}
```

---

### AT Data Bundle Top-Up

This endpoint is used to top up an AT account with a data bundle.

| Property | Value |
|----------|-------|
| API Endpoint | `https://cs.hubtel.com/commissionservices/{HubtelPrepaidDepositID}/06abd92da459428496967612463575ca` |
| Request Type | POST |
| Content Type | JSON |

---

## Utility Bill Payments

### DSTV Account Query

This queries the DSTV service to get the details of a DSTV account.

| Property | Value |
|----------|-------|
| API Endpoint | `https://cs.hubtel.com/commissionservices/{HubtelPrepaidDepositID}/297a96656b5846ad8b00d5d41b256ea7?destination={AccountNumber}` |
| Request Type | GET |
| Content Type | JSON |

**Request Parameters:**

| Parameter | Type | Requirement | Description |
|-----------|------|-------------|-------------|
| Destination | String | Mandatory | The DSTV account number. |

**Sample Response:**
```json
{
  "ResponseCode": "0000",
  "Message": "Successful",
  "Label": "",
  "Data": [
      {
          "Display": "name",
          "Value": "John Barnes",
          "Amount": 0.0
      },
      {
          "Display": "amountDue",
          "Value": "0.00",
          "Amount": 0.0
      },
      {
          "Display": "account",
          "Value": "7029864396",
          "Amount": 0.0
      }
  ]
}
```

---

### DSTV Bill Payment

This endpoint is used to top up a DSTV account with any specified amount.

| Property | Value |
|----------|-------|
| API Endpoint | `https://cs.hubtel.com/commissionservices/{HubtelPrepaidDepositID}/297a96656b5846ad8b00d5d41b256ea7` |
| Request Type | POST |
| Content Type | JSON |

**Request Parameters:**

| Parameter | Type | Requirement | Description |
|-----------|------|-------------|-------------|
| Destination | String | Mandatory | The DSTV account number. |
| Amount | Float | Mandatory | The top-up amount. NB: Only 2 decimal places allowed (E.g.: 0.50). |
| CallbackUrl | String | Mandatory | Used to receive the callback for the transaction from Hubtel. |
| ClientReference | String | Mandatory | The reference number that is provided by the API user. |

**Sample Request:**
```http
POST /commissionservices/11691/297a96656b5846ad8b00d5d41b256ea7 HTTP/1.1
Host: cs.hubtel.com
Accept: application/json
Content-Type: application/json
Authorization: Basic endjeOBiZHhza250fT3=

{
    "Destination": "7029864396",
    "Amount": 50,
    "CallbackUrl": "https://webhook.site/fcad8efa-624b-44c8-a129-b1c01921191d",
    "ClientReference": "TestTV0101"
}
```

**Sample Response:**
```json
{
  "ResponseCode": "0001",
  "Message": "Transaction pending. Expect callback request for final state",
  "Data": {
      "ClientReference": "TestTV0101",
      "Amount": 1,
      "TransactionId": "9c6d65a2a7834759b44919a1621b80fd",
      "Meta": {
          "Commission": "0.3500"
      }
  }
}
```

---

### GoTV Account Query

This queries the GoTV service to get the details of a GoTV account.

| Property | Value |
|----------|-------|
| API Endpoint | `https://cs.hubtel.com/commissionservices/{HubtelPrepaidDepositID}/e6ceac7f3880435cb30b048e9617eb41?destination={AccountNumber}` |
| Request Type | GET |
| Content Type | JSON |

---

### GoTV Bill Payment

This endpoint is used to top up a GoTV account with any specified amount.

| Property | Value |
|----------|-------|
| API Endpoint | `https://cs.hubtel.com/commissionservices/{HubtelPrepaidDepositID}/e6ceac7f3880435cb30b048e9617eb41` |
| Request Type | POST |
| Content Type | JSON |

---

### StarTimes TV Account Query

This queries the StarTimes TV service to get the details of a StarTimes TV account.

| Property | Value |
|----------|-------|
| API Endpoint | `https://cs.hubtel.com/commissionservices/{HubtelPrepaidDepositID}/6598652d34ea4112949c93c079c501ce?destination={AccountNumber}` |
| Request Type | GET |
| Content Type | JSON |

**Sample Response:**
```json
{
  "ResponseCode": "0000",
  "Message": "Successful",
  "Label": "Successful",
  "Data": [
      {
          "Display": "Name",
          "Value": "Joe Nti",
          "Amount": 0.0
      },
      {
          "Display": "Account Number",
          "Value": "02190617357",
          "Amount": 0.0
      },
      {
          "Display": "Bouquet",
          "Value": "DTH_Super ",
          "Amount": 0.0
      }
  ]
}
```

---

### StarTimes TV Bill Payment

This endpoint is used to top up a StarTimes TV account with any specified amount.

| Property | Value |
|----------|-------|
| API Endpoint | `https://cs.hubtel.com/commissionservices/{HubtelPrepaidDepositID}/6598652d34ea4112949c93c079c501ce` |
| Request Type | POST |
| Content Type | JSON |

---

### ECG Meter Query

This queries the list of Meters linked to a mobile number via the ECG Power App.

| Property | Value |
|----------|-------|
| API Endpoint | `https://cs.hubtel.com/commissionservices/{HubtelPrepaidDepositID}/e6d6bac062b5499cb1ece1ac3d742a84?destination={MobilePhone_Number}` |
| Request Type | GET |
| Content Type | JSON |

**Request Parameters:**

| Parameter | Type | Requirement | Description |
|-----------|------|-------------|-------------|
| Destination | String | Mandatory | The mobile number linked to a particular ECG meter. |

**Sample Response:**
```json
{
  "ResponseCode": "0000",
  "Message": "Successful",
  "Label": "Successful",
  "Data": [
      {
          "Display": " THOMAS ANANE (G131099826)",
          "Value": " G131099826",
          "Amount": -1.1432
      },
      {
          "Display": " ADEMAU LYDIA (24911947992)",
          "Value": " 24911947992",
          "Amount": 0
      }
  ]
}
```

---

### ECG Meter Top-Up

This endpoint is used to top up a Meter (PostPaid or Prepaid).

| Property | Value |
|----------|-------|
| API Endpoint | `https://cs.hubtel.com/commissionservices/{HubtelPrepaidDepositID}/e6d6bac062b5499cb1ece1ac3d742a84` |
| Request Type | POST |
| Content Type | JSON |

**Request Parameters:**

| Parameter | Type | Requirement | Description |
|-----------|------|-------------|-------------|
| Destination | String | Mandatory | The mobile phone number linked to a particular ECG Meter. |
| Amount | Float | Mandatory | The amount to be topped up on the meter. |
| CallbackUrl | String | Mandatory | Used to receive the callback for the transaction from Hubtel. |
| ClientReference | String | Mandatory | The reference number that is provided by the API user. |
| Extradata | Object | Mandatory | This Object contains the bundle. |
| Bundle | String | Mandatory | This is the actual Meter Number for which the Topup is to be done. |

> [!NOTE]
> This endpoint will link the phone number to the meter if that has not already been done. Please ensure that this is your intended action.

**Sample Request:**
```http
POST /commissionservices/11691/e6d6bac062b5499cb1ece1ac3d742a84 HTTP/1.1
Host: cs.hubtel.com
Accept: application/json
Content-Type: application/json
Authorization: Basic endjeOBiZHhza250fT3=

{
    "Destination": "233541312238",
    "Amount": 1,
    "CallbackUrl": "https://webhook.site/fcad8efa-624b-44c8-a129-b1c01921191d",
    "ClientReference": "TestDATA2022052105",
    "Extradata": {
        "bundle": "P09137104"
    }
}
```

---

### Ghana Water Meter Query

This queries the Ghana Water service to get the details of a Ghana Water Company Ltd account.

| Property | Value |
|----------|-------|
| API Endpoint | `https://cs.hubtel.com/commissionservices/{HubtelPrepaidDepositID}/6c1e8a82d2e84feeb8bfd6be2790d71d?destination={MeterNumber}&mobile={phoneNumber}` |
| Request Type | GET |
| Content Type | JSON |

**Request Parameters:**

| Parameter | Type | Requirement | Description |
|-----------|------|-------------|-------------|
| Destination | String | Mandatory | The meter number to be queried. |
| mobile | String | Mandatory | The phone number associated with the account. |

**Sample Response:**
```json
{
  "ResponseCode": "0000",
  "Message": "Successful",
  "Label": "Successful",
  "Data": [
      {
          "Display": "name",
          "Value": "AMAKYE FREMPONG",
          "Amount": 0.0
      },
      {
          "Display": "amountDue",
          "Value": "371.89",
          "Amount": 371.89
      },
      {
          "Display": "sessionId",
          "Value": "3792660ccf0e687b64cdb3f776fd6e368ca4260d",
          "Amount": 0.0
      }
  ]
}
```

---

### Ghana Water Meter Top-Up

This enables you to top-up your Ghana Water Company Ltd account.

| Property | Value |
|----------|-------|
| API Endpoint | `https://cs.hubtel.com/commissionservices/{HubtelPrepaidDepositID}/6c1e8a82d2e84feeb8bfd6be2790d71d` |
| Request Type | POST |
| Content Type | JSON |

**Request Parameters:**

| Parameter | Type | Requirement | Description |
|-----------|------|-------------|-------------|
| Destination | String | Mandatory | The Ghana Water meter number. |
| Amount | Float | Mandatory | This is the top-up amount. NB: Only 2 decimal places allowed (E.g.: 0.50). |
| ExtraData | Object | Mandatory | Contains the customer's phone number, e-mail, and session ID. |
| Bundle | String | Mandatory | This is the meter account number. |
| E-mail | String | Mandatory | The customer's email address. |
| SessionID | String | Mandatory | Generated from meter query. This is unique per transaction. |
| CallbackUrl | String | Mandatory | Used to receive the callback for the transaction from Hubtel. |
| ClientReference | String | Mandatory | The unique reference number that is provided by the API user. |

**Sample Request:**
```http
POST /commissionservices/11691/6c1e8a82d2e84feeb8bfd6be2790d71d HTTP/1.1
Host: cs.hubtel.com
Accept: application/json
Content-Type: application/json
Authorization: Basic endjeOBiZHhza250fT3=

{
    "Destination": "233548359582",
    "Amount": 1,
    "Extradata": {
        "bundle": "080706070056",
        "Email": "Phil@gmail.com",
        "SessionId": "e7a113dd2f8b08b85a149d3db40854de2f13410b"
    },
    "CallbackUrl": "https://webhook.site/b630fc60-8041-470c-b13e-ee69ef15b2c2",
    "ClientReference": "275438fce23f4983b9583abdf0ded9c7e"
}
```

---

## Transaction Status Check

It is mandatory to implement the Transaction Status Check API as it allows merchants to check for the status of a receive money transaction in rare instances where a merchant does not receive the final status of the transaction after five (5) minutes from Hubtel.

To check a transaction status, send an HTTP GET request to the below URL with either one or more unique transaction identifiers as parameters.

It is also mandatory to pass your POS Sales ID for Status Check requests in the endpoint.

> [!NOTE]
> Only requests from whitelisted IP(s) can reach the endpoint. Submit your public IP(s) to your Retail Systems Engineer to be whitelisted.
> 
> We permit a maximum of 4 IP addresses per service.

| Property | Value |
|----------|-------|
| API Endpoint | `https://api-txnstatus.hubtel.com/transactions/{POS_Sales_ID}/status` |
| Request Type | GET |
| Content Type | JSON |

**Request Parameters:**

| Parameter | Type | Requirement | Description |
|-----------|------|-------------|-------------|
| clientReference | String | Mandatory (preferred) | The clientReference of the transaction specified in the request payload. |
| hubtelTransactionId | String | Optional | TransactionId from Hubtel after successful receive money request. |
| networkTransactionId | String | Optional | The transaction reference from the mobile money provider. |

> [!TIP]
> Although either one of the unique transaction identifiers above could be passed as parameters, clientReference is recommended to be used most often.

**Sample Request:**
```http
GET /transactions/11684/status?clientReference=TestAirt HTTP/1.1
Host: api-txnstatus.hubtel.com
Authorization: Basic QmdfaWghe2Jhc2U2NF9lbmNvZGUoa2hzcW9seXU6bXVhaHdpYW8pfQ==
```

**Response Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| message | String | The description of response received from the Commission Services API. |
| responseCode | String | The response code of the API after the request. |
| data | Object | An object containing the required data response from the API. |
| date | String | Date of the transaction. |
| status | String | Status of the transaction i.e.: Paid or Unpaid. |
| transactionId | String | The unique ID used to identify a Hubtel transaction (from Hubtel). |
| externalTransactionId | String | The transaction reference from the mobile money provider (from Telco). |
| paymentMethod | String | The mode of payment. |
| clientReference | String | The reference ID that is initially provided by the client/API user (from merchant). |
| currencycode | String | Currency of the transaction; could be null. |
| amount | Float | The transaction amount. |
| charges | Float | The charge/fee for the transaction. |
| amountAfterCharges | Float | The transaction amount after charges/fees deduction. |
| isFulfilled | Boolean | Whether service was fulfilled; could be null. |

**Sample Response (Success):**
```json
{
  "message": "Successful",
  "responseCode": "0000",
  "data": {
      "date": "2024-01-15T21:28:17.3234841Z",
      "status": "Paid",
      "transactionId": "9a7304855d8a4041917509bb46be7050",
      "externalTransactionId": null,
      "paymentMethod": "cash",
      "clientReference": "TestAirt",
      "currencyCode": null,
      "amount": 1.0,
      "charges": 0.0,
      "amountAfterCharges": 1.0,
      "isFulfilled": true
  }
}
```

**Sample Response (Failed):**
```json
{
  "message": "Successful",
  "responseCode": "0000",
  "data": {
      "date": "2024-01-15T21:58:21.1918103Z",
      "status": "Unpaid",
      "transactionId": "f35e5ec1ee984c4b85b310ad969db776",
      "externalTransactionId": null,
      "paymentMethod": "cash",
      "clientReference": "testECGr",
      "currencyCode": null,
      "amount": 1.0,
      "charges": 0.0,
      "amountAfterCharges": 1.0,
      "isFulfilled": false
  }
}
```

---

## Response Codes

The Hubtel Commission Services API uses standard HTTP error reporting. Successful requests return HTTP status codes in the 2xx range. Failed requests return status codes in 4xx and 5xx.

Error responses are included in the JSON response body, which contains information about the error. You can also find Error Responses in the Final Callbacks.

> [!CAUTION]
> Response Codes which are not 0000 should be considered as FAILED.

| Response Code | Description | Required Action |
|---------------|-------------|-----------------|
| 0000 | The transaction has been processed successfully. | None |
| 0001 | Transaction pending. Expect callback request for final state. | None |
| 0005 | There was an HTTP failure/exception. | The transaction state is not known. Please contact your Retail Systems Engineer to confirm the status. |
| 2000 | General Failure Error | Review the callback description for actual error. |
| 2001 | General Failure Error | Usually, check the description of the response callback. It gives the actual error. E.g.: The receiving user is not registered in the system, or the Bundle is invalid. |
| 4000 | An error occurred. Kindly try again later / missing mobile value. | Ensure you are passing the correct parameters. |
| 4010 | Validation Errors | A required request parameter might have been left empty, invalid or omitted. |
| 4101 | Authorization for request is denied / could not find prepaid account | Ensure correct Basic Auth key for the Authorization header. Also ensure you're passing your Prepaid Deposit ID in the endpoint. |
| 4103 | Permission denied | You are not allowed to perform this transaction. Ensure your API keys are accurate. |
| 4075 | Insufficient prepaid balance. | You don't have enough funds in your prepaid balance. Top-up by transferring funds from your available balance or bank deposit. |

---

## Notes
- Update this document whenever the configuration or API changes.
- For more details, refer to the project README or contact the development team.
