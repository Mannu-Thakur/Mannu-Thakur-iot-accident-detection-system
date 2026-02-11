# Admin API Documentation

This document references the API endpoints used by System Administrators to manage the Perseva platform, including devices, RTOs, and Authorities.

## Base URL

`http://<server_url>/api/admin`

## Authentication

All admin endpoints require a valid JWT token with the `ROLE_ADMIN` role.
-   **Header:** `Authorization: Bearer <token>`

---

## Endpoints

### 1. Create Device
Register a new hardware device in the system.

-   **URL:** `/devices`
-   **Method:** `POST`
-   **Body:**
    ```json
    {
      "serialNumber": "SN-12345678",
      "camEnabled": true,
      "firmwareVersion": "1.0.0",
      "speedometerAttachedDate": "2023-01-01T00:00:00Z"
    }
    ```
-   **Response:**
    ```json
    {
      "status": "success",
      "data": {
        "deviceId": "dev_...",
        "serialNumber": "SN-12345678",
        "apiKey": "pk_..." // SHOWN ONLY ONCE
      }
    }
    ```

### 2. Regenerate Device API Key
Generate a fresh API key for a device if the old one is lost or compromised. **Warning:** The old key will stop working immediately.

-   **URL:** `/devices/:deviceId/api-key`
-   **Method:** `POST`
-   **Response:**
    ```json
    {
      "status": "success",
      "data": {
        "deviceId": "dev_...",
        "apiKey": "pk_new_key_...",
        "message": "API key regenerated successfully..."
      }
    }
    ```

### 3. List Devices
Get a paginated list of all devices.

-   **URL:** `/devices`
-   **Method:** `GET`
-   **Query Params:** `page`, `limit`, `status` (ACTIVE/PENDING), `bound` (true/false)
-   **Response:**
    ```json
    {
      "status": "success",
      "data": [ ... ],
      "meta": { "total": 100, "page": 1, "limit": 20 }
    }
    ```

### 4. Create RTO
Register a new Regional Transport Office.

-   **URL:** `/rtos`
-   **Method:** `POST`
-   **Body:**
    ```json
    {
      "name": "Bangalore Central RTO",
      "code": "KA-01",
      "contactEmail": "rto.ka01@gov.in",
      "password": "secure_password",
      "lat": 12.97,
      "lon": 77.59
    }
    ```

### 5. Create State Authority
Register a new State Authority (e.g., State Police Head).

-   **URL:** `/state-authorities`
-   **Method:** `POST`
-   **Body:**
    ```json
    {
      "name": "Karnataka State Police",
      "contactEmail": "ksp@gov.in"
    }
    ```

### 6. System Stats
Get high-level system statistics.

-   **URL:** `/stats`
-   **Method:** `GET`
-   **Response:**
    ```json
    {
      "status": "success",
      "data": {
        "devices": { "total": 500, "online": 120 },
        "users": 1050
      }
    }
    ```
