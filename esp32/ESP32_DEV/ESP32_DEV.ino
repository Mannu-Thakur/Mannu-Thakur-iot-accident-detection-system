/**
 * Perseva ESP32-DEV Main Device
 * 
 * Handles:
 * - WiFi connectivity with auto-reconnect
 * - GPS module (NEO-6M) for location
 * - MPU6050 accelerometer for impact/free-fall detection
 * - GPIO signaling to ESP32-CAM (single pin, pulse duration based)
 * - HTTP client for API calls (heartbeat, incident report)
 * - Manual incident trigger button
 * - LED status indicators
 * 
 * GPIO Signal Protocol (to CAM):
 * - 200ms HIGH pulse = Capture and upload incident image
 * - 500ms HIGH pulse = Start live streaming
 * - 500ms LOW after HIGH = Stop live streaming
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>

// ============== CONFIGURATION ==============
// WiFi credentials
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Server configuration
const char* SERVER_URL = "http://YOUR_SERVER_IP:3000";
const char* DEVICE_ID = "YOUR_DEVICE_ID";
const char* API_KEY = "YOUR_API_KEY";

// Timing configuration (milliseconds)
const unsigned long HEARTBEAT_INTERVAL = 30000;      // 30 seconds
const unsigned long GPS_UPDATE_INTERVAL = 1000;       // 1 second
const unsigned long WIFI_RECONNECT_INTERVAL = 5000;   // 5 seconds
const unsigned long DEBOUNCE_DELAY = 50;              // 50ms for button debounce

// Impact detection thresholds
const float IMPACT_THRESHOLD_G = 3.0;                 // G-force threshold for impact
const float FREE_FALL_THRESHOLD_G = 0.3;              // G-force threshold for free fall
const unsigned long FREE_FALL_DURATION_MS = 200;      // Duration to confirm free fall

// GPIO signaling durations
const unsigned long CAM_SIGNAL_CAPTURE = 200;         // 200ms pulse for capture
const unsigned long CAM_SIGNAL_STREAM = 500;          // 500ms pulse for stream start

// ============== PIN DEFINITIONS ==============
// CAM communication
const int PIN_CAM_SIGNAL = 27;         // GPIO to signal CAM ESP32

// Status LEDs
const int PIN_LED_WIFI = 2;            // Built-in LED for WiFi status
const int PIN_LED_GPS = 4;             // External LED for GPS status
const int PIN_LED_INCIDENT = 5;        // External LED for incident status

// Manual trigger button
const int PIN_BUTTON_INCIDENT = 15;    // Manual incident trigger button

// GPS Serial pins
const int PIN_GPS_RX = 16;             // GPS TX -> ESP32 RX
const int PIN_GPS_TX = 17;             // GPS RX -> ESP32 TX

// MPU6050 I2C pins (default)
const int PIN_SDA = 21;
const int PIN_SCL = 22;

// ============== MPU6050 REGISTERS ==============
const int MPU6050_ADDR = 0x68;
const int MPU6050_PWR_MGMT_1 = 0x6B;
const int MPU6050_ACCEL_XOUT_H = 0x3B;
const int MPU6050_ACCEL_CONFIG = 0x1C;

// ============== GLOBAL OBJECTS ==============
TinyGPSPlus gps;
HardwareSerial gpsSerial(1);

// ============== STATE VARIABLES ==============
// WiFi
bool wifiConnected = false;
unsigned long lastWiFiAttempt = 0;

// GPS
float currentLat = 0.0;
float currentLon = 0.0;
float currentSpeed = 0.0;
bool gpsValid = false;
unsigned long lastGPSUpdate = 0;

// Accelerometer
float accelX = 0.0, accelY = 0.0, accelZ = 0.0;
float totalG = 1.0;
bool freeFallDetected = false;
unsigned long freeFallStartTime = 0;

// Heartbeat
unsigned long lastHeartbeat = 0;

// Incident
bool incidentInProgress = false;
unsigned long lastIncidentTime = 0;
const unsigned long INCIDENT_COOLDOWN = 10000;  // 10 second cooldown

// Button
bool buttonState = HIGH;
bool lastButtonState = HIGH;
unsigned long lastDebounceTime = 0;

// Live streaming state
bool isStreaming = false;

// ============== FUNCTION DECLARATIONS ==============
void setupWiFi();
void setupGPS();
void setupMPU6050();
void setupPins();
void checkWiFi();
void updateGPS();
void readAccelerometer();
void checkImpact();
void sendHeartbeat();
void reportIncident(bool isManual);
void signalCAMCapture();
void signalCAMStreamStart();
void signalCAMStreamStop();
void handleButton();
void blinkLED(int pin, int times, int delayMs);
String generateMessageId();

// ============== SETUP ==============
void setup() {
    Serial.begin(115200);
    Serial.println("\n=================================");
    Serial.println("Perseva ESP32-DEV Starting...");
    Serial.println("=================================\n");

    setupPins();
    setupWiFi();
    setupGPS();
    setupMPU6050();

    Serial.println("\nSetup complete. Entering main loop...\n");
}

// ============== MAIN LOOP ==============
void loop() {
    unsigned long currentMillis = millis();

    // Check WiFi connection
    checkWiFi();

    // Update GPS data
    if (currentMillis - lastGPSUpdate >= GPS_UPDATE_INTERVAL) {
        updateGPS();
        lastGPSUpdate = currentMillis;
    }

    // Read accelerometer and check for impact/free-fall
    readAccelerometer();
    checkImpact();

    // Send heartbeat
    if (currentMillis - lastHeartbeat >= HEARTBEAT_INTERVAL) {
        if (wifiConnected) {
            sendHeartbeat();
        }
        lastHeartbeat = currentMillis;
    }

    // Handle manual trigger button
    handleButton();

    // Small delay to prevent watchdog issues
    delay(10);
}

// ============== SETUP FUNCTIONS ==============

void setupPins() {
    // CAM signal pin
    pinMode(PIN_CAM_SIGNAL, OUTPUT);
    digitalWrite(PIN_CAM_SIGNAL, LOW);

    // LED pins
    pinMode(PIN_LED_WIFI, OUTPUT);
    pinMode(PIN_LED_GPS, OUTPUT);
    pinMode(PIN_LED_INCIDENT, OUTPUT);

    // Button pin (internal pull-up)
    pinMode(PIN_BUTTON_INCIDENT, INPUT_PULLUP);

    // Initialize LEDs off
    digitalWrite(PIN_LED_WIFI, LOW);
    digitalWrite(PIN_LED_GPS, LOW);
    digitalWrite(PIN_LED_INCIDENT, LOW);

    Serial.println("[PINS] GPIO pins configured");
}

void setupWiFi() {
    Serial.print("[WIFI] Connecting to ");
    Serial.println(WIFI_SSID);

    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        wifiConnected = true;
        digitalWrite(PIN_LED_WIFI, HIGH);
        Serial.println("\n[WIFI] Connected!");
        Serial.print("[WIFI] IP: ");
        Serial.println(WiFi.localIP());
    } else {
        Serial.println("\n[WIFI] Failed to connect. Will retry...");
    }
}

void setupGPS() {
    gpsSerial.begin(9600, SERIAL_8N1, PIN_GPS_RX, PIN_GPS_TX);
    Serial.println("[GPS] Serial initialized at 9600 baud");
}

void setupMPU6050() {
    Wire.begin(PIN_SDA, PIN_SCL);

    // Wake up MPU6050
    Wire.beginTransmission(MPU6050_ADDR);
    Wire.write(MPU6050_PWR_MGMT_1);
    Wire.write(0x00);  // Clear sleep mode
    Wire.endTransmission(true);

    // Configure accelerometer range to ±8G
    Wire.beginTransmission(MPU6050_ADDR);
    Wire.write(MPU6050_ACCEL_CONFIG);
    Wire.write(0x10);  // ±8G range
    Wire.endTransmission(true);

    Serial.println("[MPU6050] Accelerometer initialized");
}

// ============== WiFi FUNCTIONS ==============

void checkWiFi() {
    if (WiFi.status() == WL_CONNECTED) {
        if (!wifiConnected) {
            wifiConnected = true;
            digitalWrite(PIN_LED_WIFI, HIGH);
            Serial.println("[WIFI] Reconnected!");
        }
    } else {
        if (wifiConnected) {
            wifiConnected = false;
            digitalWrite(PIN_LED_WIFI, LOW);
            Serial.println("[WIFI] Disconnected!");
        }

        // Attempt reconnect
        if (millis() - lastWiFiAttempt >= WIFI_RECONNECT_INTERVAL) {
            Serial.println("[WIFI] Attempting reconnect...");
            WiFi.disconnect();
            WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
            lastWiFiAttempt = millis();
        }
    }
}

// ============== GPS FUNCTIONS ==============

void updateGPS() {
    while (gpsSerial.available() > 0) {
        if (gps.encode(gpsSerial.read())) {
            if (gps.location.isValid()) {
                currentLat = gps.location.lat();
                currentLon = gps.location.lng();
                gpsValid = true;
                digitalWrite(PIN_LED_GPS, HIGH);
            } else {
                gpsValid = false;
                digitalWrite(PIN_LED_GPS, LOW);
            }

            if (gps.speed.isValid()) {
                currentSpeed = gps.speed.kmph();
            }
        }
    }
}

// ============== ACCELEROMETER FUNCTIONS ==============

void readAccelerometer() {
    Wire.beginTransmission(MPU6050_ADDR);
    Wire.write(MPU6050_ACCEL_XOUT_H);
    Wire.endTransmission(false);
    Wire.requestFrom(MPU6050_ADDR, 6, true);

    int16_t rawX = Wire.read() << 8 | Wire.read();
    int16_t rawY = Wire.read() << 8 | Wire.read();
    int16_t rawZ = Wire.read() << 8 | Wire.read();

    // Convert to G (±8G range, 4096 LSB/g)
    accelX = rawX / 4096.0;
    accelY = rawY / 4096.0;
    accelZ = rawZ / 4096.0;

    // Calculate total G-force magnitude
    totalG = sqrt(accelX * accelX + accelY * accelY + accelZ * accelZ);
}

void checkImpact() {
    unsigned long currentMillis = millis();

    // Skip if incident is in cooldown
    if (incidentInProgress || (currentMillis - lastIncidentTime < INCIDENT_COOLDOWN)) {
        return;
    }

    // Check for impact (sudden high G-force)
    if (totalG >= IMPACT_THRESHOLD_G) {
        Serial.print("[IMPACT] Detected! G-force: ");
        Serial.println(totalG);
        reportIncident(false);
        return;
    }

    // Check for free fall (very low G-force)
    if (totalG <= FREE_FALL_THRESHOLD_G) {
        if (!freeFallDetected) {
            freeFallDetected = true;
            freeFallStartTime = currentMillis;
        } else if (currentMillis - freeFallStartTime >= FREE_FALL_DURATION_MS) {
            Serial.println("[FREE FALL] Detected!");
            reportIncident(false);
            freeFallDetected = false;
        }
    } else {
        freeFallDetected = false;
    }
}

// ============== HEARTBEAT FUNCTION ==============

void sendHeartbeat() {
    if (!wifiConnected) return;

    HTTPClient http;
    String url = String(SERVER_URL) + "/api/devices/" + DEVICE_ID + "/heartbeat";

    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Device-Key", API_KEY);

    // Build JSON payload
    StaticJsonDocument<256> doc;
    doc["senderTimestamp"] = getISOTimestamp();
    doc["batteryLevel"] = 100;  // TODO: Implement actual battery monitoring

    if (gpsValid) {
        JsonObject gpsObj = doc.createNestedObject("gps");
        gpsObj["lat"] = currentLat;
        gpsObj["lon"] = currentLon;
        gpsObj["accuracy"] = 10;
    }

    String payload;
    serializeJson(doc, payload);

    int httpCode = http.POST(payload);

    if (httpCode > 0) {
        Serial.print("[HEARTBEAT] Sent. Response: ");
        Serial.println(httpCode);
    } else {
        Serial.print("[HEARTBEAT] Failed: ");
        Serial.println(http.errorToString(httpCode));
    }

    http.end();
}

// ============== INCIDENT REPORTING ==============

void reportIncident(bool isManual) {
    if (!wifiConnected) {
        Serial.println("[INCIDENT] No WiFi connection. Cannot report.");
        blinkLED(PIN_LED_INCIDENT, 3, 200);
        return;
    }

    incidentInProgress = true;
    lastIncidentTime = millis();
    digitalWrite(PIN_LED_INCIDENT, HIGH);

    Serial.println("[INCIDENT] Reporting incident...");

    // Signal CAM to capture image
    signalCAMCapture();

    // Wait for CAM to capture and upload
    delay(3000);

    // Build incident report
    HTTPClient http;
    String url = String(SERVER_URL) + "/api/devices/" + DEVICE_ID + "/incident";

    http.begin(url);
    http.addHeader("Content-Type", "application/x-www-form-urlencoded");
    http.addHeader("X-Device-Key", API_KEY);

    // Build JSON payload
    StaticJsonDocument<512> doc;
    doc["messageId"] = generateMessageId();
    doc["senderTimestamp"] = getISOTimestamp();

    if (gpsValid) {
        JsonObject location = doc.createNestedObject("location");
        location["lat"] = currentLat;
        location["lon"] = currentLon;
    }

    doc["speed"] = currentSpeed;
    doc["impactForce"] = totalG;

    // Determine impact direction based on accelerometer (simplified)
    if (abs(accelX) > abs(accelY) && abs(accelX) > abs(accelZ)) {
        doc["impactDirection"] = accelX > 0 ? "FRONT" : "REAR";
    } else if (abs(accelY) > abs(accelZ)) {
        doc["impactDirection"] = accelY > 0 ? "LEFT" : "RIGHT";
    } else {
        doc["impactDirection"] = "ROLLOVER";
    }

    doc["isFreeFall"] = freeFallDetected;
    doc["isBreakFail"] = false;  // TODO: Implement brake sensor
    doc["airbagsDeployed"] = false;  // TODO: Implement airbag sensor

    String jsonPayload;
    serializeJson(doc, jsonPayload);

    // Send as form data
    String formData = "payload=" + urlEncode(jsonPayload);

    int httpCode = http.POST(formData);

    if (httpCode > 0) {
        Serial.print("[INCIDENT] Reported. Response: ");
        Serial.println(httpCode);

        if (httpCode == 201) {
            String response = http.getString();
            Serial.println(response);
            blinkLED(PIN_LED_INCIDENT, 2, 300);
        }
    } else {
        Serial.print("[INCIDENT] Failed: ");
        Serial.println(http.errorToString(httpCode));
        blinkLED(PIN_LED_INCIDENT, 5, 100);
    }

    http.end();
    digitalWrite(PIN_LED_INCIDENT, LOW);
    incidentInProgress = false;
}

// ============== CAM SIGNALING ==============

void signalCAMCapture() {
    Serial.println("[CAM] Signaling capture (200ms pulse)");
    digitalWrite(PIN_CAM_SIGNAL, HIGH);
    delay(CAM_SIGNAL_CAPTURE);
    digitalWrite(PIN_CAM_SIGNAL, LOW);
}

void signalCAMStreamStart() {
    if (!isStreaming) {
        Serial.println("[CAM] Signaling stream start (500ms pulse)");
        digitalWrite(PIN_CAM_SIGNAL, HIGH);
        delay(CAM_SIGNAL_STREAM);
        digitalWrite(PIN_CAM_SIGNAL, LOW);
        isStreaming = true;
    }
}

void signalCAMStreamStop() {
    if (isStreaming) {
        Serial.println("[CAM] Signaling stream stop");
        // Stop signal is a short LOW after stream was active
        // CAM monitors for this after stream start
        isStreaming = false;
    }
}

// ============== BUTTON HANDLING ==============

void handleButton() {
    int reading = digitalRead(PIN_BUTTON_INCIDENT);

    if (reading != lastButtonState) {
        lastDebounceTime = millis();
    }

    if ((millis() - lastDebounceTime) > DEBOUNCE_DELAY) {
        if (reading != buttonState) {
            buttonState = reading;

            if (buttonState == LOW) {
                Serial.println("[BUTTON] Manual incident trigger pressed!");
                reportIncident(true);
            }
        }
    }

    lastButtonState = reading;
}

// ============== UTILITY FUNCTIONS ==============

void blinkLED(int pin, int times, int delayMs) {
    for (int i = 0; i < times; i++) {
        digitalWrite(pin, HIGH);
        delay(delayMs);
        digitalWrite(pin, LOW);
        delay(delayMs);
    }
}

String generateMessageId() {
    return "MSG-" + String(millis()) + "-" + String(random(1000, 9999));
}

String getISOTimestamp() {
    // In production, use RTC or NTP time
    // For now, return placeholder (server will use its time if not valid ISO)
    unsigned long uptime = millis() / 1000;
    return String(uptime);  // Server will handle invalid timestamps
}

String urlEncode(const String& str) {
    String encoded = "";
    char c;
    for (int i = 0; i < str.length(); i++) {
        c = str.charAt(i);
        if (c == ' ') {
            encoded += "%20";
        } else if (isalnum(c) || c == '-' || c == '_' || c == '.' || c == '~') {
            encoded += c;
        } else {
            char buf[4];
            sprintf(buf, "%%%02X", (unsigned char)c);
            encoded += buf;
        }
    }
    return encoded;
}

// ============== EXTERNAL COMMANDS (Socket.IO) ==============
// These would be called when receiving commands from the server
// In production, use WebSocket client to receive live access requests

void onLiveAccessRequest(const char* requestId, const char* authorityName) {
    Serial.println("[LIVE] Live access request received");
    Serial.print("  Request ID: ");
    Serial.println(requestId);
    Serial.print("  Authority: ");
    Serial.println(authorityName);

    // Auto-grant for now (in production, user should approve via button)
    signalCAMStreamStart();

    // TODO: Send acknowledgment to server
}

void onLiveAccessCancel() {
    Serial.println("[LIVE] Live access cancelled");
    signalCAMStreamStop();
}
