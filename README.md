<<<<<<< HEAD
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
=======
# 🚗 IoT-Based Accident Detection & Emergency Response System

## 📌 Overview
This project presents an IoT-based accident detection and emergency response system designed to reduce response time and improve road safety. The system automatically detects accidents using sensor data and instantly notifies emergency authorities and registered contacts with precise location information.

---

## 🎯 Problem Statement
Road accidents often go unreported for critical minutes due to:
- Victims being unconscious or unable to call for help
- Lack of real-time monitoring systems
- Poor communication infrastructure in remote areas
- Delayed emergency response coordination

---

## 💡 Solution
This system introduces an automated, sensor-driven accident detection mechanism integrated with cloud infrastructure and authority dashboards.

It enables:
- Automatic accident detection
- Real-time alert transmission
- Centralized monitoring
- Faster emergency response

---

## 🧩 System Architecture

The system is divided into multiple layers:

1. **Vehicle Device Layer**
   - MPU6050 (Accelerometer + Gyroscope)
   - GPS Module
   - Camera Module
   - IoT Controller
   - GSM / LoRa Communication

2. **Communication Layer**
   - Cellular Network (Primary)
   - LoRa (Fallback)
   - V2X Relay (Tertiary)

3. **Cloud Infrastructure**
   - API Server
   - Severity Analysis Engine
   - Event Processing System
   - Database Storage

4. **Authority Layer**
   - Local Authority Dashboard
   - State-Level Monitoring System

5. **Administrative Layer**
   - RTO Integration
   - Vehicle & Device Registry

---

## 🔄 System Workflow

1. Sensors continuously monitor vehicle motion.
2. Accident is detected using impact and motion patterns.
3. GPS location and timestamp are captured.
4. Device sends data to the cloud server.
5. Server verifies and analyzes severity.
6. Alerts are sent to:
   - Local Authorities
   - State Monitoring System
   - Registered Nominees
7. Authorities can request live image verification.
8. Rescue teams are dispatched.

---

## ⚙️ Key Features

- 🚨 Automated accident detection
- 📍 Real-time GPS tracking
- 📡 Multi-channel communication (Cellular + LoRa)
- 📊 Centralized monitoring dashboards
- 🧠 Severity-based prioritization
- 📷 Remote image verification
- 🔐 Secure and authenticated system

---

## 🛰 Communication Framework

- **Primary:** Cellular network (GSM/LTE)
- **Secondary:** LoRa (long-range fallback)
- **Tertiary:** Vehicle-to-vehicle relay (V2X)

---

## 🧪 Testing & Validation

- Sensor calibration testing
- Impact and vibration testing
- Environmental testing (water, heat)
- Field testing with vehicles
- Communication latency evaluation

---

## 📊 Tech Stack

- Embedded Systems (IoT Device)
- Sensor Integration (IMU, GPS)
- Cloud Server (REST APIs)
- Database Systems
- Dashboard UI (Web-based)
- Communication: GSM / LoRa

---

## 📈 Applications

- Smart City road safety systems
- Highway accident monitoring
- Government transport vehicles
- School buses and fleet management
- Rural and remote emergency response

---

## ⚠️ Limitations

- Depends on network availability
- Possible false triggers in extreme conditions
- Requires integration with government infrastructure
- Hardware deployment cost

---

## 🔮 Future Scope

- AI-based accident prediction
- Automatic ambulance dispatch
- Smart traffic integration
- Vehicle-to-vehicle communication
- Insurance automation

---

## 🎯 Impact

- Faster emergency response
- Reduced accident fatalities
- Improved road safety infrastructure
- Data-driven accident analysis

---

## 📊 UML Diagrams

The system design is modeled using UML:

- Component Diagram (System Architecture)
- Sequence Diagram (Accident Flow)
- Class Diagram (System Structure)

📁 See: `/docs/uml/`

---

## 🧠 Conclusion

This project presents a scalable, real-time IoT-based accident detection and emergency response system. By integrating sensors, cloud infrastructure, and authority dashboards, it enables faster response times and improves public safety. The system is designed for future integration with government-level infrastructure.

---

## 👥 Team Perseva

- Md. Arif  
- Mannu Kumar Thakur  
- Rohan Kumar  
- Sahil  
- Sangram Ganta  

---

## ⚠️ Confidentiality

This project contains research-level design concepts intended for evaluation purposes only. Unauthorized reproduction or distribution is prohibited.
>>>>>>> a8d0998229ca2e21e5260c3fe395088bfd04899d
