# API Authentication Documentation

**Last updated:** December 23rd, 2025

---

## Overview

To integrate with Hubtel APIs, you must create API keys for authentication. Each API requires specific keys for access.

---

## Authentication Methods

There are two main authentication methods:
- **HTTP Basic Authentication**
- **URL Authentication**

---

### HTTP Basic Authentication

The simplest method is HTTP Basic Authentication. It requires:
- Base64 encoding of your ClientID (or API ID) as username
- Base64 encoding of your ClientSecret (or API Key) as password
- The encoded string is sent in the HTTP Authorization header

**Header Format:**
- For SMS: `Authorization: Basic {base64_encode(ClientID:ClientSecret)}`
- For Sales: `Authorization: Basic {base64_encode(API ID:API Key)}`

**Example:**
If your ClientID is `khsqolyu` and your ClientSecret is `muahwiao`, the header will be:
```
Authorization: Basic a2hzcW9sb3U6bWdhaHdpYW8=
```

---

### URL Authentication

URL Authentication involves passing your ClientId and ClientSecret as query parameters in the request URL. This is used for the Hubtel Quick Send SMS API.

**Example Request:**
```
https://domain.website.com?From={From}&To={To}&Content={Content}&ClientId={ClientId}&ClientSecret={ClientSecret}&RegisteredDelivery={RegisteredDelivery}
```

---

## Notes
- Always keep your API keys secure and never expose them in public repositories.
- Update this document whenever authentication requirements change.
- For more details, refer to the project README or contact the development team.
