/**
 * Perseva ESP32-CAM Camera Module
 * 
 * Handles:
 * - WiFi connectivity with auto-reconnect
 * - OV2640 camera initialization and configuration
 * - GPIO interrupt listener for signals from ESP32-DEV
 * - Image capture and HTTP upload to server
 * - WebSocket-based live streaming to Local Authority
 * - LED status indicators
 * 
 * GPIO Signal Protocol (from DEV):
 * - 200ms HIGH pulse = Capture and upload incident image
 * - 500ms HIGH pulse = Start live streaming
 * - LOW after streaming = Stop streaming
 * 
 * This code uses interrupt-based signal detection for accurate timing.
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "esp_camera.h"
#include "esp_http_client.h"
#include <WebSocketsClient.h>

// ============== CONFIGURATION ==============
// WiFi credentials (same network as ESP32-DEV)
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Server configuration
const char* SERVER_URL = "http://YOUR_SERVER_IP:3000";
const char* WS_SERVER = "YOUR_SERVER_IP";
const int WS_PORT = 3000;
const char* DEVICE_ID = "YOUR_DEVICE_ID";
const char* API_KEY = "YOUR_API_KEY";

// Timing configuration (milliseconds)
const unsigned long WIFI_RECONNECT_INTERVAL = 5000;
const unsigned long SIGNAL_CAPTURE_MIN = 150;    // Min pulse for capture
const unsigned long SIGNAL_CAPTURE_MAX = 300;    // Max pulse for capture
const unsigned long SIGNAL_STREAM_MIN = 400;     // Min pulse for stream
const unsigned long SIGNAL_STREAM_MAX = 600;     // Max pulse for stream
const unsigned long STREAM_FRAME_INTERVAL = 100; // 10 FPS for streaming

// ============== PIN DEFINITIONS ==============
// ESP32-CAM specific pins (AI-Thinker module)
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// GPIO input from DEV ESP32
const int PIN_DEV_SIGNAL = 13;  // GPIO13 for signal from DEV

// Built-in LED (ESP32-CAM has LED on GPIO 4)
const int PIN_LED_FLASH = 4;

// External status LED (if available)
const int PIN_LED_STATUS = 33;

// ============== GLOBAL OBJECTS ==============
WebSocketsClient webSocket;

// ============== STATE VARIABLES ==============
// WiFi
bool wifiConnected = false;
unsigned long lastWiFiAttempt = 0;

// Signal detection
volatile unsigned long signalStartTime = 0;
volatile unsigned long signalEndTime = 0;
volatile bool signalRising = false;
volatile bool signalProcessed = true;

// Streaming
bool isStreaming = false;
unsigned long lastFrameTime = 0;
String currentIncidentId = "";
String streamToken = "";

// Camera
bool cameraInitialized = false;

// ============== INTERRUPT HANDLER ==============
void IRAM_ATTR onSignalChange() {
    if (digitalRead(PIN_DEV_SIGNAL) == HIGH) {
        // Rising edge
        signalStartTime = millis();
        signalRising = true;
    } else {
        // Falling edge
        if (signalRising) {
            signalEndTime = millis();
            signalRising = false;
            signalProcessed = false;
        }
    }
}

// ============== FUNCTION DECLARATIONS ==============
void setupWiFi();
void setupCamera();
void setupWebSocket();
void checkWiFi();
void processSignal();
void captureAndUpload();
void startStreaming();
void stopStreaming();
void sendStreamFrame();
void onWebSocketEvent(WStype_t type, uint8_t* payload, size_t length);
void blinkLED(int pin, int times, int delayMs);

// ============== SETUP ==============
void setup() {
    Serial.begin(115200);
    Serial.println("\n=================================");
    Serial.println("Perseva ESP32-CAM Starting...");
    Serial.println("=================================\n");

    // Initialize pins
    pinMode(PIN_DEV_SIGNAL, INPUT);
    pinMode(PIN_LED_FLASH, OUTPUT);
    pinMode(PIN_LED_STATUS, OUTPUT);
    digitalWrite(PIN_LED_FLASH, LOW);
    digitalWrite(PIN_LED_STATUS, LOW);

    // Attach interrupt for signal detection
    attachInterrupt(digitalPinToInterrupt(PIN_DEV_SIGNAL), onSignalChange, CHANGE);

    // Initialize WiFi
    setupWiFi();

    // Initialize camera
    setupCamera();

    // Initialize WebSocket (for streaming)
    setupWebSocket();

    Serial.println("\nSetup complete. Waiting for signals...\n");
}

// ============== MAIN LOOP ==============
void loop() {
    unsigned long currentMillis = millis();

    // Check WiFi connection
    checkWiFi();

    // Process signal from DEV (if any)
    if (!signalProcessed) {
        processSignal();
    }

    // Handle WebSocket
    webSocket.loop();

    // Send stream frames if streaming
    if (isStreaming && (currentMillis - lastFrameTime >= STREAM_FRAME_INTERVAL)) {
        sendStreamFrame();
        lastFrameTime = currentMillis;
    }

    // Small delay
    delay(10);
}

// ============== SETUP FUNCTIONS ==============

void setupWiFi() {
    Serial.print("[WIFI] Connecting to ");
    Serial.println(WIFI_SSID);

    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        wifiConnected = true;
        Serial.println("\n[WIFI] Connected!");
        Serial.print("[WIFI] IP: ");
        Serial.println(WiFi.localIP());
        blinkLED(PIN_LED_STATUS, 2, 200);
    } else {
        Serial.println("\n[WIFI] Failed to connect. Will retry...");
    }
}

void setupCamera() {
    Serial.println("[CAMERA] Initializing...");

    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer = LEDC_TIMER_0;
    config.pin_d0 = Y2_GPIO_NUM;
    config.pin_d1 = Y3_GPIO_NUM;
    config.pin_d2 = Y4_GPIO_NUM;
    config.pin_d3 = Y5_GPIO_NUM;
    config.pin_d4 = Y6_GPIO_NUM;
    config.pin_d5 = Y7_GPIO_NUM;
    config.pin_d6 = Y8_GPIO_NUM;
    config.pin_d7 = Y9_GPIO_NUM;
    config.pin_xclk = XCLK_GPIO_NUM;
    config.pin_pclk = PCLK_GPIO_NUM;
    config.pin_vsync = VSYNC_GPIO_NUM;
    config.pin_href = HREF_GPIO_NUM;
    config.pin_sscb_sda = SIOD_GPIO_NUM;
    config.pin_sscb_scl = SIOC_GPIO_NUM;
    config.pin_pwdn = PWDN_GPIO_NUM;
    config.pin_reset = RESET_GPIO_NUM;
    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_JPEG;

    // Use higher resolution for incident photos, lower for streaming
    if (psramFound()) {
        config.frame_size = FRAMESIZE_UXGA;  // 1600x1200
        config.jpeg_quality = 10;
        config.fb_count = 2;
        Serial.println("[CAMERA] PSRAM found, using high resolution");
    } else {
        config.frame_size = FRAMESIZE_SVGA;  // 800x600
        config.jpeg_quality = 12;
        config.fb_count = 1;
        Serial.println("[CAMERA] No PSRAM, using lower resolution");
    }

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf("[CAMERA] Init failed with error 0x%x\n", err);
        cameraInitialized = false;
        return;
    }

    // Get camera sensor and adjust settings
    sensor_t* s = esp_camera_sensor_get();
    if (s) {
        s->set_brightness(s, 0);     // -2 to 2
        s->set_contrast(s, 0);       // -2 to 2
        s->set_saturation(s, 0);     // -2 to 2
        s->set_special_effect(s, 0); // No effect
        s->set_whitebal(s, 1);       // Enable auto white balance
        s->set_awb_gain(s, 1);       // Enable auto white balance gain
        s->set_wb_mode(s, 0);        // Auto white balance mode
        s->set_exposure_ctrl(s, 1);  // Enable auto exposure
        s->set_aec2(s, 0);           // Disable AEC DSP
        s->set_gain_ctrl(s, 1);      // Enable auto gain
        s->set_agc_gain(s, 0);       // AGC gain (0-30)
        s->set_gainceiling(s, (gainceiling_t)0); // Gain ceiling (0-6)
        s->set_bpc(s, 0);            // Disable bad pixel correction
        s->set_wpc(s, 1);            // Enable white pixel correction
        s->set_raw_gma(s, 1);        // Enable gamma correction
        s->set_lenc(s, 1);           // Enable lens correction
        s->set_hmirror(s, 0);        // Disable horizontal mirror
        s->set_vflip(s, 0);          // Disable vertical flip
        s->set_dcw(s, 1);            // Enable DCW
    }

    cameraInitialized = true;
    Serial.println("[CAMERA] Initialized successfully");
}

void setupWebSocket() {
    // WebSocket will be connected when streaming starts
    Serial.println("[WEBSOCKET] Setup complete. Will connect when streaming.");
}

// ============== WiFi FUNCTIONS ==============

void checkWiFi() {
    if (WiFi.status() == WL_CONNECTED) {
        if (!wifiConnected) {
            wifiConnected = true;
            Serial.println("[WIFI] Reconnected!");
        }
    } else {
        if (wifiConnected) {
            wifiConnected = false;
            Serial.println("[WIFI] Disconnected!");
            if (isStreaming) {
                stopStreaming();
            }
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

// ============== SIGNAL PROCESSING ==============

void processSignal() {
    unsigned long pulseDuration = signalEndTime - signalStartTime;
    signalProcessed = true;

    Serial.printf("[SIGNAL] Pulse duration: %lu ms\n", pulseDuration);

    if (pulseDuration >= SIGNAL_CAPTURE_MIN && pulseDuration <= SIGNAL_CAPTURE_MAX) {
        // Capture command
        Serial.println("[SIGNAL] Capture command received");
        captureAndUpload();
    } else if (pulseDuration >= SIGNAL_STREAM_MIN && pulseDuration <= SIGNAL_STREAM_MAX) {
        // Stream start command
        Serial.println("[SIGNAL] Stream start command received");
        startStreaming();
    } else {
        Serial.printf("[SIGNAL] Unknown pulse duration: %lu ms\n", pulseDuration);
    }
}

// ============== CAPTURE AND UPLOAD ==============

void captureAndUpload() {
    if (!cameraInitialized) {
        Serial.println("[CAPTURE] Camera not initialized!");
        return;
    }

    if (!wifiConnected) {
        Serial.println("[CAPTURE] No WiFi connection!");
        return;
    }

    // Flash LED briefly
    digitalWrite(PIN_LED_FLASH, HIGH);

    // Set to high resolution for incident capture
    sensor_t* s = esp_camera_sensor_get();
    if (s && psramFound()) {
        s->set_framesize(s, FRAMESIZE_UXGA);
    }

    // Capture image
    camera_fb_t* fb = esp_camera_fb_get();

    digitalWrite(PIN_LED_FLASH, LOW);

    if (!fb) {
        Serial.println("[CAPTURE] Camera capture failed!");
        return;
    }

    Serial.printf("[CAPTURE] Image captured: %d bytes\n", fb->len);

    // Upload to server
    uploadImage(fb);

    // Return frame buffer
    esp_camera_fb_return(fb);
}

void uploadImage(camera_fb_t* fb) {
    Serial.println("[UPLOAD] Uploading image...");

    HTTPClient http;
    String url = String(SERVER_URL) + "/api/devices/" + DEVICE_ID + "/incident";

    http.begin(url);
    http.addHeader("X-Device-Key", API_KEY);

    // Build multipart form data
    String boundary = "----PersevaBoundary" + String(millis());
    http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);

    // Create the multipart body
    String bodyStart = "--" + boundary + "\r\n";
    bodyStart += "Content-Disposition: form-data; name=\"image\"; filename=\"incident.jpg\"\r\n";
    bodyStart += "Content-Type: image/jpeg\r\n\r\n";

    String bodyEnd = "\r\n--" + boundary + "\r\n";
    bodyEnd += "Content-Disposition: form-data; name=\"payload\"\r\n\r\n";
    bodyEnd += "{}\r\n";  // Empty payload - DEV will send full incident details
    bodyEnd += "--" + boundary + "--\r\n";

    // Calculate total length
    int totalLen = bodyStart.length() + fb->len + bodyEnd.length();

    // Create combined buffer
    uint8_t* body = (uint8_t*)malloc(totalLen);
    if (!body) {
        Serial.println("[UPLOAD] Memory allocation failed!");
        http.end();
        return;
    }

    int pos = 0;
    memcpy(body + pos, bodyStart.c_str(), bodyStart.length());
    pos += bodyStart.length();
    memcpy(body + pos, fb->buf, fb->len);
    pos += fb->len;
    memcpy(body + pos, bodyEnd.c_str(), bodyEnd.length());

    int httpCode = http.POST(body, totalLen);
    free(body);

    if (httpCode > 0) {
        Serial.printf("[UPLOAD] Response: %d\n", httpCode);
        if (httpCode == 201) {
            String response = http.getString();
            Serial.println(response);

            // Parse incident ID from response for streaming later
            StaticJsonDocument<256> doc;
            DeserializationError error = deserializeJson(doc, response);
            if (!error) {
                if (doc["data"]["incidentId"]) {
                    currentIncidentId = doc["data"]["incidentId"].as<String>();
                    Serial.printf("[UPLOAD] Incident ID: %s\n", currentIncidentId.c_str());
                }
            }

            blinkLED(PIN_LED_STATUS, 2, 200);
        }
    } else {
        Serial.printf("[UPLOAD] Failed: %s\n", http.errorToString(httpCode).c_str());
        blinkLED(PIN_LED_STATUS, 5, 100);
    }

    http.end();
}

// ============== LIVE STREAMING ==============

void startStreaming() {
    if (isStreaming) {
        Serial.println("[STREAM] Already streaming");
        return;
    }

    if (!cameraInitialized) {
        Serial.println("[STREAM] Camera not initialized!");
        return;
    }

    if (!wifiConnected) {
        Serial.println("[STREAM] No WiFi connection!");
        return;
    }

    Serial.println("[STREAM] Starting live stream...");

    // Set to lower resolution for streaming (higher FPS)
    sensor_t* s = esp_camera_sensor_get();
    if (s) {
        s->set_framesize(s, FRAMESIZE_VGA);  // 640x480 for smooth streaming
    }

    // Connect WebSocket
    // Path: /socket.io/?EIO=4&transport=websocket
    // For simplicity, using basic WebSocket - in production use Socket.IO client
    webSocket.begin(WS_SERVER, WS_PORT, "/stream");
    webSocket.onEvent(onWebSocketEvent);
    webSocket.setReconnectInterval(5000);

    isStreaming = true;
    lastFrameTime = millis();

    blinkLED(PIN_LED_STATUS, 3, 100);
}

void stopStreaming() {
    if (!isStreaming) {
        return;
    }

    Serial.println("[STREAM] Stopping live stream...");

    webSocket.disconnect();
    isStreaming = false;

    // Reset to high resolution
    sensor_t* s = esp_camera_sensor_get();
    if (s && psramFound()) {
        s->set_framesize(s, FRAMESIZE_UXGA);
    }

    blinkLED(PIN_LED_STATUS, 1, 500);
}

void sendStreamFrame() {
    if (!isStreaming || !cameraInitialized) {
        return;
    }

    camera_fb_t* fb = esp_camera_fb_get();
    if (!fb) {
        Serial.println("[STREAM] Frame capture failed");
        return;
    }

    // Send frame via WebSocket
    if (webSocket.isConnected()) {
        webSocket.sendBIN(fb->buf, fb->len);
    }

    esp_camera_fb_return(fb);
}

void onWebSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
    switch (type) {
        case WStype_DISCONNECTED:
            Serial.println("[WS] Disconnected");
            break;

        case WStype_CONNECTED:
            Serial.printf("[WS] Connected to %s\n", (char*)payload);
            // Send auth message
            {
                StaticJsonDocument<128> doc;
                doc["type"] = "auth";
                doc["deviceId"] = DEVICE_ID;
                doc["apiKey"] = API_KEY;
                doc["incidentId"] = currentIncidentId;
                String msg;
                serializeJson(doc, msg);
                webSocket.sendTXT(msg);
            }
            break;

        case WStype_TEXT:
            Serial.printf("[WS] Message: %s\n", payload);
            // Handle commands (stop stream, etc.)
            {
                StaticJsonDocument<128> doc;
                DeserializationError error = deserializeJson(doc, payload);
                if (!error) {
                    String type = doc["type"] | "";
                    if (type == "stop") {
                        stopStreaming();
                    }
                }
            }
            break;

        case WStype_BIN:
            // Not expected
            break;

        case WStype_ERROR:
            Serial.printf("[WS] Error: %s\n", payload);
            break;

        case WStype_PING:
        case WStype_PONG:
            break;
    }
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
