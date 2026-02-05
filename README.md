# Perseva - Accident Detection & Rescue Coordination Platform

Perseva is a robust backend system designed to handle real-time accident detection, automated severity assessment, and coordination of rescue efforts. It connects IoT devices, vehicle owners, and emergency authorities (RTO, Police, Hospitals) to ensure rapid response to road incidents.

## 🚀 Features

- **IoT Device Integration**: Real-time telemetry (heartbeat), accident detection (accelerometer/gyro data), and image uploads.
- **Incident Management**: Automated severity calculation, deduplication of reports, and specific workflows for false positives vs. verified incidents.
- **Role-Based Access Control**: Separate portals for Admin, RTO (Regional Transport Office), Local Authorities (Emergency Responders), State Authorities, and Vehicle Owners.
- **Real-time Communication**: Socket.IO integration for live alerts, live camera streaming requests, and tracking response vehicles.
- **Geo-Fencing**: Automatic assignment of incidents to the nearest Local Authority based on jurisdiction polygons or proximity.
- **Background Processing**: Message queues (Bull/Redis) for AI analysis of accident images and handling expired live access requests.
- **Audit Trails**: Immutable logs for all critical system actions for legal compliance.

## 🛠️ Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Caching/Queues**: Redis & Bull
- **Real-time**: Socket.IO
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting, JWT, API Keys
- **Logging**: Winston

## 🏗️ Architecture

The system is built with a modular architecture:
- **Models**: Defines data schemas (Owner, Vehicle, Incident, Authority, etc.)
- **Controllers**: Handles business logic for each domain.
- **Services**: Reusable logic components (GeoService, NotificationService, SeverityService).
- **Middleware**: Request processing pipeline (Auth, Validation, Error Handling).
- **Jobs**: Background tasks for heavy processing.

## 📦 Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/rahmaniyaShekh/perseva.git
    cd perseva
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    - Copy `.env.example` to `.env` (or use the provided `.env`)
    - Ensure MongoDB is running or provide a valid connection string.
    - Ensure Redis is running (required for queues).

4.  **Run the Server**
    - **Development**:
      ```bash
      npm run dev
      ```
    - **Production**:
      ```bash
      npm start
      ```
    The server runs on port 3000 by default.

## 🔑 Key Concepts

### Device Binding
IoT Devices are "bound" to Vehicles. Data sent from a device is automatically associated with the vehicle and its owner.

### Incident Workflow
1.  **Detection**: Device detects impact > threshold.
2.  **Reporting**: Device uploads sensor data + image to `/api/devices/:id/incident`.
3.  **Processing**:
    - Deduplication checks if this event was already reported.
    - AI Service analyzes image (mocked in dev).
    - Severity is calculated.
4.  **Notification**:
    - Nearest Authority is identified via Geospatial query.
    - Alert sent to Authority via Socket/SMS.
    - Alert sent to Owner's emergency nominees.
5.  **Response**:
    - Authority can request "Live Access" to device camera.
    - Authority assigns "Rescue Task" to employees (Ambulance/Police).

## 🧪 Testing

Run unit and integration tests:
```bash
npm test
```

## 📜 API Documentation

Detailed API documentation is available in [API_DOCS.md](./API_DOCS.md).

## 📄 License

ISC
