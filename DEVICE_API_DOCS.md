# Device API Documentation

This document references the API endpoints used by IoT devices (Hardware) to communicate with the Perseva backend.

## Base URL

`http://<server_url>/api/devices`

## Authentication

All device endpoints require authentication via an API Key. This key must be included in the request header.

-   **Header Name:** `x-device-key`
-   **Header Value:** `<your_device_api_key>`

If the API key is missing or invalid, the server will respond with `401 Unauthorized`.

---

## Endpoints

### 1. Send Heartbeat

Sends telemetry data to the server to indicate the device is online and report its status.

-   **URL:** `/:deviceId/heartbeat`
-   **Method:** `POST`
-   **Description:** Updates the device's last seen status, battery level, location, and firmware version.

#### Request Body

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `senderTimestamp` | String (ISO) | **Yes** | Time when the message was sent from the device |
| `batteryLevel` | Number | No | Battery percentage (0-100) |
| `gps` | Object | No | GPS location data |
| `gps.lat` | Number | No | Latitude (-90 to 90) |
| `gps.lon` | Number | No | Longitude (-180 to 180) |
| `firmwareVersion` | String | No | Current firmware version of the device |
| `messageId` | String | No | Unique ID for the message (for tracking) |

**Example Input:**

```json
{
  "senderTimestamp": "2023-10-27T10:30:00.000Z",
  "batteryLevel": 85,
  "gps": {
    "lat": 12.9716,
    "lon": 77.5946
  },
  "firmwareVersion": "1.2.0",
  "messageId": "msg_123456789"
}
```

#### Response

-   **Success (200 OK):**

```json
{
  "status": "success",
  "data": {
    "status": "OK",
    "serverTimestamp": "2023-10-27T10:30:01.000Z"
  }
}
```

-   **Error (400 Bad Request):** Validation failed (e.g., missing timestamp).
-   **Error (401 Unauthorized):** Invalid/Missing API Key.

---

### 2. Report Incident

Report a detected accident or incident. This endpoint supports multipart/form-data to include an image snapshot.

-   **URL:** `/:deviceId/incident`
-   **Method:** `POST`
-   **Content-Type:** `multipart/form-data`
-   **Description:** Uploads incident data and an optional image. If an image is provided, AI analysis is triggered.

#### Form Fields

1.  **`image`** (File, Optional): Image file (jpg, png, webp). Max size 10MB.
2.  **`payload`** (String/JSON, Required): A JSON string containing the incident details.

#### Payload JSON Fields

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `messageId` | String | No | Unique ID for the message (recommended for dedup) |
| `senderTimestamp` | String (ISO) | No | Time of incident (defaults to server time) |
| `location` | Object | No | Incident location (defaults to device last loc) |
| `location.lat` | Number | No | Latitude |
| `location.lon` | Number | No | Longitude |
| `speed` | Number | No | Vehicle speed in km/h (0-500) |
| `impactForce` | Number | No | G-force of impact |
| `impactDirection` | String | No | 'FRONT', 'REAR', 'LEFT', 'RIGHT', 'ROLLOVER', 'UNKNOWN' |
| `airbagsDeployed` | Boolean | No | True if airbags triggered |
| `isBreakFail` | Boolean | No | True if brake failure detected |
| `isFreeFall` | Boolean | No | True if free fall detected |
| `connectivityUsed` | String | No | 'INTERNET' (default) or 'LORA' |

**Example Payload JSON:**

```json
{
  "messageId": "inc_987654321",
  "senderTimestamp": "2023-10-27T10:45:00.000Z",
  "location": {
    "lat": 12.9716,
    "lon": 77.5946
  },
  "speed": 65,
  "impactForce": 4.5,
  "impactDirection": "FRONT",
  "airbagsDeployed": true,
  "isBreakFail": false
}
```

#### Response

-   **Success (201 Created):**

```json
{
  "status": "success",
  "data": {
    "status": "RECEIVED",
    "incidentId": "INC-20231027-ABCD",
    "serverTimestamp": "2023-10-27T10:45:02.000Z",
    "dedup": false
  }
}
```

-   **Success (200 OK):** Duplicate incident detected (dedup: true).
-   **Error (400 Bad Request):** Device not bound to vehicle, or invalid payload.
-   **Error (500 Internal Server Error):** Bound vehicle not found.

---

### 3. Cancel Live Access

Notify the server that the owner has manually cancelled a live streaming request (e.g., pressed a button on the device).

-   **URL:** `/:deviceId/live-access/cancel`
-   **Method:** `POST`
-   **Description:** Cancels a pending or active live access request initiated by an authority.

#### Request Body

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `requestId` | String | **Yes** | The ID of the live access request being cancelled |
| `senderTimestamp` | String (ISO) | **Yes** | Time of cancellation |
| `messageId` | String | No | Unique message ID |
| `reason` | String | No | Reason for cancellation |

**Example Input:**

```json
{
  "requestId": "req_xyz123",
  "senderTimestamp": "2023-10-27T11:00:00.000Z",
  "reason": "Owner pressed privacy button"
}
```

#### Response

-   **Success (200 OK):**

```json
{
  "status": "success",
  "data": {
    "status": "CANCELLED",
    "requestId": "req_xyz123",
    "incidentId": "INC-20231027-ABCD"
  }
}
```
-   **Error (404 Not Found):** Request ID not found.
-   **Error (403 Forbidden):** Device mismatch (request belongs to another device).

---

### 4. Acknowledge Live Access

Acknowledge that the device has received and displayed a live access request to the user.

-   **URL:** `/:deviceId/live-access/ack`
-   **Method:** `POST`
-   **Description:** Confirms receipt of a live access request.

#### Request Body

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `requestId` | String | **Yes** | The ID of the request |
| `senderTimestamp` | String (ISO) | **Yes** | Time of acknowledgement |

**Example Input:**

```json
{
  "requestId": "req_xyz123",
  "senderTimestamp": "2023-10-27T11:00:05.000Z"
}
```

#### Response

-   **Success (200 OK):**

```json
{
  "status": "success",
  "data": {
    "status": "ACKED",
    "requestId": "req_xyz123"
  }
}
```
