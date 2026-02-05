# Perseva API Documentation

Base URL: `/api`

## Authentication

All protected endpoints require a JWT token in the `Authorization` header or a Device API Key in the `X-Device-Key` header.

### Authenticating as User (Admin, RTO, Authority, Owner)
**Header:** `Authorization: Bearer <token>`

#### Login
by role (Admin, RTO, Local Authority, State Authority, Owner)

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": "651a...",
      "email": "user@example.com",
      "role": "RTO",
      "name": "Pune RTO Admin"
    },
    "profile": {
      "rtoId": "RTO-MH-12",
      "name": "Pune RTO",
      "code": "MH-12"
      // ... role specific profile details
    }
  }
}
```

**Errors:**
- `400 Bad Request`: Missing email/password
- `401 Unauthorized`: Invalid credentials

---

### Authenticating as Device
**Header:** `X-Device-Key: <api_key>` (Received during device creation)

---

## Admin Endpoints
**Role Required:** `ADMIN`

### Create RTO
Creates a new RTO entity and a corresponding Admin User account.

**Endpoint:** `POST /admin/rtos`

**Request Body:**
```json
{
  "name": "Pune Regional Transport Office",
  "code": "MH-12",
  "region": "Pune",
  "district": "Pune",
  "state": "Maharashtra",
  "contactEmail": "admin@rto.pune.gov.in",
  "contactPhone": "+919876543210",
  "address": "Sangam Bridge, Pune",
  "password": "SecurePassword123" // Optional, default: Perseva@123
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "rtoId": "RTO-...",
    "name": "Pune Regional Transport Office",
    "code": "MH-12",
    "userEmail": "admin@rto.pune.gov.in"
  }
}
```

### Create Device
**Endpoint:** `POST /admin/devices`

**Request Body:**
```json
{
  "serialNumber": "DEV-2024-001",
  "firmwareVersion": "1.0.0"
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "deviceId": "DEV-...",
    "serialNumber": "DEV-2024-001",
    "apiKey": "pk_..." // SAVE THIS! Only shown once.
  }
}
```

### Create State Authority
**Endpoint:** `POST /admin/state-authorities`

**Request Body:**
```json
{
  "name": "Maharashtra State Safety Board",
  "code": "MH",
  "contactEmail": "safety@maharashtra.gov.in",
  "contactPhone": "022-12345678",
  "address": "Mumbai",
  "password": "SecurePassword123"
}
```

---

## RTO Endpoints
**Role Required:** `RTO`

### Create Vehicle Owner
**Endpoint:** `POST /rto/owners`

**Request Body:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "mobileNumber": "+919876543210",
  "address": "123 Main St, Pune",
  "nominees": [
    {
      "name": "Jane Doe",
      "relation": "SPOUSE",
      "mobileNumber": "+919876543211",
      "isPrimary": true
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "ownerId": "OWN-...",
    "fullName": "John Doe",
    "email": "john@example.com",
    "userEmail": "john@example.com" // Login email for Owner app
  }
}
```

### Register Vehicle
**Endpoint:** `POST /rto/vehicles`

**Request Body:**
```json
{
  "ownerId": "OWN-...",
  "registrationNo": "MH12AB1234",
  "chassisNo": "EX123...",
  "vehicleType": "CAR",
  "fuelType": "PETROL",
  "model": "Swift",
  "manufacturer": "Maruti Suzuki",
  "manufacturingYear": 2023
}
```

### Transfer Vehicle Ownership
**Endpoint:** `POST /rto/vehicles/:vehicleId/transfer`

**Request Body:**
```json
{
  "newOwnerId": "OWN-NEW-...",
  "transferReason": "Sold",
  "docs": ["doc_url_1"]
}
```

---

## Device Endpoints
**Role Required:** Device (`X-Device-Key`)

### Heartbeat
**Endpoint:** `POST /api/devices/:deviceId/heartbeat`

**Request Body:**
```json
{
  "batteryLevel": 85,
  "gps": {
    "lat": 18.5204,
    "lon": 73.8567,
    "accuracy": 10
  },
  "senderTimestamp": "2024-02-05T10:00:00Z"
}
```

### Report Incident
**Endpoint:** `POST /api/devices/:deviceId/incident`
**Content-Type:** `multipart/form-data`

**Form Data:**
- `image`: (File) - Actual accident photo
- `payload`: (JSON String)
```json
{
  "messageId": "MSG-...",
  "senderTimestamp": "2024-02-05T10:05:00Z",
  "location": { "lat": 18.5204, "lon": 73.8567 },
  "speed": 80,
  "impactForce": 15.5,
  "airbagsDeployed": true
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "status": "RECEIVED",
    "incidentId": "INC-...",
    "dedup": false
  }
}
```

---

## Local Authority Endpoints
**Role Required:** `LOCAL_AUTHORITY`

### Get Incidents
**Endpoint:** `GET /authority/:authorityId/incidents`
**Query Params:** `status=REPORTED,VERIFIED`

**Response:**
```json
{
  "status": "success",
  "results": 5,
  "data": [
    {
      "incidentId": "INC-...",
      "severityLevel": 5,
      "location": { "coordinates": [73.8567, 18.5204] },
      "status": "VERIFIED",
       // ... details
    }
  ]
}
```

### Request Live Access (Camera)
**Endpoint:** `POST /authority/:authorityId/live-access/request`

**Request Body:**
```json
{
  "incidentId": "INC-..."
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "requestId": "REQ-...",
    "status": "PENDING",
    "expiresAt": "2024-02-05T10:06:00Z"
  }
}
```
*Note: This triggers a Socket.IO event to the device.*

---

## Owner Endpoints
**Role Required:** `OWNER`

### Get Profile
**Endpoint:** `GET /owner/profile`

### Update Nominees
**Endpoint:** `PUT /owner/nominees`

**Request Body:**
```json
{
  "nominees": [
    { "name": "New Name", "mobileNumber": "..." }
  ]
}
```

---

## Socket.IO Events

**Connection:** `ws://host:port`
- Namespace: `/device` (Auth: `auth: { deviceId, apiKey }`)
- Namespace: `/authority` (Auth: `auth: { token }`)
- Namespace: `/employee` (Auth: `auth: { token }`)

### Device Events
- **Emit:** `heartbeat`
- **Listen:** `live_access_request` -> Payload: `{ requestId, authorityName, ... }`

### Authority Events
- **Listen:** `incident_alert` -> Payload: `{ incidentId, location, severity }`
- **Listen:** `access_granted` -> Payload: `{ streamToken, requestId }`

## Error Codes
- `400`: Bad Request (Validation Error)
- `401`: Unauthorized (Invalid Token/Key)
- `403`: Forbidden (Insufficient Role)
- `404`: Not Found
- `429`: Too Many Requests
- `500`: Internal Server Error

---
