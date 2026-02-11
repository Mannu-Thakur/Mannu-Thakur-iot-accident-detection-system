/**
 * Perseva - ESP32 Dev Module Firmware
 * 
 * Responsibilities:
 * 1. Read Sensors: Accelerometer (ADXL345/MPU6050), GPS (NEO-6M), Buttons (Break Fail, Free Fall sim)
 * 2. Detect Accident: Threshold based logic (Impact force > 4G)
 * 3. Trigger Camera: Send HIGH signal to GPIO pin connected to ESP32-CAM
 * 4. Report Data: Send JSON payload to Backend via HTTP POST
 * 5. Heartbeat: Send periodic heartbeat
 * 
 * Hardware Pins:
 * - TRIG_CAM_PIN (Output): 23 (Connect to ESP32-CAM input)
 * - GPS RX/TX: 16/17
 * - I2C SDA/SCL: 21/22
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// --- CONFIGURATION ---
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASS";
const char* API_BASE_URL = "http://YOUR_SERVER_IP:3000/api/devices";
const char* DEVICE_ID = "YOUR_DEVICE_ID";
const char* API_KEY = "YOUR_API_KEY";

const int TRIG_CAM_PIN = 23;
const unsigned long HEARTBEAT_INTERVAL = 30000; // 30 sec

unsigned long lastHeartbeatTime = 0;

void setup() {
  Serial.begin(115200);
  
  // Pin Setup
  pinMode(TRIG_CAM_PIN, OUTPUT);
  digitalWrite(TRIG_CAM_PIN, LOW);
  
  // WiFi Setup
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected");
}

void loop() {
  // 1. Read Sensors (Simulation)
  // In real implementation, read MPU6050
  float impactForce = 0.0; // G
  bool accidentDetected = false;
  
  // Simulate accident via Serial input for testing
  if (Serial.available()) {
    char c = Serial.read();
    if (c == 'a') {
      accidentDetected = true;
      impactForce = 5.5; // Simulated heavy impact
    }
  }

  // 2. Accident Handling
  if (accidentDetected) {
    Serial.println("ACCIDENT DETECTED!");
    
    // Step A: Trigger Camera IMMEDIATELY
    digitalWrite(TRIG_CAM_PIN, HIGH);
    delay(100); // 100ms pulse
    digitalWrite(TRIG_CAM_PIN, LOW);
    
    // Step B: Send Data Report
    sendIncidentReport(impactForce);
    
    delay(5000); // Debounce
  }

  // 3. Heartbeat
  if (millis() - lastHeartbeatTime > HEARTBEAT_INTERVAL) {
    sendHeartbeat();
    lastHeartbeatTime = millis();
  }
}

void sendIncidentReport(float impact) {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  String url = String(API_BASE_URL) + "/" + DEVICE_ID + "/incident";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-key", API_KEY);
  
  // Create JSON Payload
  StaticJsonDocument<256> doc;
  doc["speed"] = 65; // Simulated speed
  doc["impactForce"] = impact;
  doc["impactDirection"] = "FRONT";
  doc["airbagsDeployed"] = true;
  doc["senderTimestamp"] = "2023-11-01T12:00:00Z"; // In real app, sync NTP
  
  String requestBody;
  serializeJson(doc, requestBody);
  
  int httpResponseCode = http.POST(requestBody);
  Serial.printf("Incident Report sent: %d\n", httpResponseCode);
  
  http.end();
}

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  String url = String(API_BASE_URL) + "/" + DEVICE_ID + "/heartbeat";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-key", API_KEY);
  
  StaticJsonDocument<200> doc;
  doc["senderTimestamp"] = "2023-11-01T12:00:00Z"; // Use NTP
  doc["batteryLevel"] = 95;
  
  String requestBody;
  serializeJson(doc, requestBody);
  
  int httpResponseCode = http.POST(requestBody);
  Serial.printf("Heartbeat sent: %d\n", httpResponseCode);
  
  http.end();
}
