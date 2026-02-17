/**
 * Perseva ESP32-CAM
 *
 * Receives CAM_SIG pulse commands from ESP32-DEV:
 * - ~220 ms pulse: capture + upload image (image-only incident)
 * - ~650 ms pulse: start stream (or toggle stop if already streaming)
 * - ~1200 ms pulse: explicit stream stop
 *
 * Backend integration:
 * - POST /api/devices/:deviceId/incident (multipart/form-data with image + payload)
 */

#include <WiFi.h>
#include <ArduinoJson.h>
#include "esp_camera.h"
#include "esp_http_client.h"
#include <WebSocketsClient.h>
#include <time.h>
#include <esp_system.h>

// ===== User configuration =====
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char* SERVER_URL = "http://YOUR_SERVER_IP:3000";
const char* DEVICE_ID = "YOUR_DEVICE_ID";
const char* API_KEY = "YOUR_API_KEY";
const char* CAMERA_FIRMWARE_VERSION = "2.0.0-cam";

// Optional WebSocket stream sink (disabled by default).
const bool ENABLE_WS_STREAMING = false;
const char* WS_HOST = "YOUR_SERVER_IP";
const uint16_t WS_PORT = 3000;
const char* WS_PATH = "/stream";

// ===== Time configuration =====
const long NTP_GMT_OFFSET_SEC = 0;
const int NTP_DAYLIGHT_OFFSET_SEC = 0;
const char* NTP_SERVER_1 = "pool.ntp.org";
const char* NTP_SERVER_2 = "time.nist.gov";
const uint32_t FALLBACK_EPOCH_BASE = 1735689600UL;  // 2025-01-01T00:00:00Z

// ===== Timing =====
const unsigned long WIFI_RETRY_INTERVAL_MS = 5000;
const unsigned long NTP_RESYNC_INTERVAL_MS = 6UL * 60UL * 60UL * 1000UL;
const unsigned long STREAM_FRAME_INTERVAL_MS = 120;  // ~8 FPS
const int HTTP_TIMEOUT_MS = 15000;
const uint8_t CAPTURE_RETRY_COUNT = 3;
const uint8_t UPLOAD_RETRY_COUNT = 3;

// Pulse windows (microseconds)
const uint32_t SIGNAL_CAPTURE_MIN_US = 150000;
const uint32_t SIGNAL_CAPTURE_MAX_US = 350000;
const uint32_t SIGNAL_STREAM_START_MIN_US = 500000;
const uint32_t SIGNAL_STREAM_START_MAX_US = 850000;
const uint32_t SIGNAL_STREAM_STOP_MIN_US = 900000;
const uint32_t SIGNAL_STREAM_STOP_MAX_US = 1500000;

// ===== ESP32-CAM pin mapping (AI Thinker) =====
#define PWDN_GPIO_NUM 32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM 0
#define SIOD_GPIO_NUM 26
#define SIOC_GPIO_NUM 27

#define Y9_GPIO_NUM 35
#define Y8_GPIO_NUM 34
#define Y7_GPIO_NUM 39
#define Y6_GPIO_NUM 36
#define Y5_GPIO_NUM 21
#define Y4_GPIO_NUM 19
#define Y3_GPIO_NUM 18
#define Y2_GPIO_NUM 5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM 23
#define PCLK_GPIO_NUM 22

const int PIN_DEV_SIGNAL = 13;
const int PIN_LED_FLASH = 4;
const int PIN_LED_STATUS = 33;

// ===== Globals =====
WebSocketsClient webSocket;

bool wifiConnected = false;
bool ntpSynced = false;
unsigned long lastWiFiAttempt = 0;
unsigned long lastNtpSync = 0;

bool cameraReady = false;

volatile uint32_t signalRiseAtUs = 0;
volatile uint32_t signalPulseUs = 0;
volatile bool signalPending = false;
portMUX_TYPE signalMux = portMUX_INITIALIZER_UNLOCKED;

bool isStreaming = false;
unsigned long lastStreamFrameAt = 0;
String lastIncidentId = "";

// ===== Forward declarations =====
void setupPins();
void setupWiFi();
void maintainWiFi();
bool ensureWiFiConnected(unsigned long timeoutMs);
void syncClockFromNtpIfNeeded(bool force);
time_t nowEpoch();
String epochToIso(uint32_t epoch);
String nowIso();
String newMessageId(const char* prefix);

bool setupCamera();
void configureSensorDefaults();
void setCaptureMode();
void setStreamMode();
void setStandbyMode();
camera_fb_t* captureFrameWithRetries(uint8_t maxAttempts);

void IRAM_ATTR onSignalChange();
void processSignalFromIsr();
void handlePulseCommand(uint32_t pulseUs);

void captureAndUploadIncident();
String buildIncidentPayloadJson();
bool uploadIncidentMultipart(camera_fb_t* fb, const String& payloadJson, int& statusCode, String& responseOut);
bool httpWriteAll(esp_http_client_handle_t client, const uint8_t* data, int len);
void parseIncidentIdFromResponse(const String& response);

void startStreaming();
void stopStreaming();
void processStreaming();
void setupWebSocketClient();
void onWebSocketEvent(WStype_t type, uint8_t* payload, size_t length);

void blinkStatus(uint8_t times, uint16_t onMs, uint16_t offMs);
void handleSerialConsole();
void printStatus();

// ===== Setup =====
void setup() {
  Serial.begin(115200);
  Serial.setTimeout(20);
  delay(150);

  Serial.println();
  Serial.println("====================================");
  Serial.println("Perseva ESP32-CAM");
  Serial.println("====================================");

  setupPins();
  setupWiFi();
  syncClockFromNtpIfNeeded(true);

  if (!setupCamera()) {
    Serial.println("[CAM] Camera init failed at boot. Will retry on demand.");
  }

  Serial.println("[BOOT] CAM ready, waiting for DEV pulse commands.");
}

// ===== Main loop =====
void loop() {
  maintainWiFi();
  syncClockFromNtpIfNeeded(false);

  processSignalFromIsr();
  handleSerialConsole();

  if (ENABLE_WS_STREAMING) {
    webSocket.loop();
  }

  processStreaming();

  delay(5);
}

// ===== Core setup =====
void setupPins() {
  pinMode(PIN_DEV_SIGNAL, INPUT);
  pinMode(PIN_LED_FLASH, OUTPUT);
  pinMode(PIN_LED_STATUS, OUTPUT);

  digitalWrite(PIN_LED_FLASH, LOW);
  digitalWrite(PIN_LED_STATUS, LOW);

  attachInterrupt(digitalPinToInterrupt(PIN_DEV_SIGNAL), onSignalChange, CHANGE);
}

void setupWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.printf("[WIFI] Connecting to %s", WIFI_SSID);
  const unsigned long startMs = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startMs < 12000) {
    delay(250);
    Serial.print(".");
  }
  Serial.println();

  wifiConnected = (WiFi.status() == WL_CONNECTED);
  if (wifiConnected) {
    Serial.print("[WIFI] Connected. IP: ");
    Serial.println(WiFi.localIP());
    blinkStatus(2, 120, 100);
  } else {
    Serial.println("[WIFI] Initial connect failed, will retry.");
  }
}

void maintainWiFi() {
  const bool connectedNow = (WiFi.status() == WL_CONNECTED);

  if (connectedNow && !wifiConnected) {
    wifiConnected = true;
    ntpSynced = false;
    Serial.print("[WIFI] Reconnected. IP: ");
    Serial.println(WiFi.localIP());
  } else if (!connectedNow && wifiConnected) {
    wifiConnected = false;
    Serial.println("[WIFI] Disconnected.");
    if (isStreaming) {
      stopStreaming();
    }
  }

  if (!connectedNow) {
    if (millis() - lastWiFiAttempt >= WIFI_RETRY_INTERVAL_MS) {
      lastWiFiAttempt = millis();
      Serial.println("[WIFI] Retry...");
      WiFi.disconnect(true, true);
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    }
  }
}

bool ensureWiFiConnected(unsigned long timeoutMs) {
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    return true;
  }

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  const unsigned long startMs = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startMs < timeoutMs) {
    delay(100);
  }

  wifiConnected = (WiFi.status() == WL_CONNECTED);
  return wifiConnected;
}

void syncClockFromNtpIfNeeded(bool force) {
  if (!wifiConnected) {
    return;
  }

  const unsigned long nowMs = millis();
  if (!force) {
    if (ntpSynced && (nowMs - lastNtpSync < NTP_RESYNC_INTERVAL_MS)) {
      return;
    }
    if (!ntpSynced && (nowMs - lastNtpSync < 15000)) {
      return;
    }
  }

  lastNtpSync = nowMs;
  configTime(NTP_GMT_OFFSET_SEC, NTP_DAYLIGHT_OFFSET_SEC, NTP_SERVER_1, NTP_SERVER_2);

  for (int i = 0; i < 20; ++i) {
    const time_t t = time(nullptr);
    if (t >= 1700000000) {
      ntpSynced = true;
      Serial.print("[TIME] NTP synced: ");
      Serial.println(epochToIso(static_cast<uint32_t>(t)));
      return;
    }
    delay(120);
  }

  Serial.println("[TIME] NTP sync pending (fallback timestamp active).");
}

time_t nowEpoch() {
  const time_t t = time(nullptr);
  if (t >= 1700000000) {
    return t;
  }
  return static_cast<time_t>(FALLBACK_EPOCH_BASE + (millis() / 1000));
}

String epochToIso(uint32_t epoch) {
  time_t tt = static_cast<time_t>(epoch);
  struct tm t;
  gmtime_r(&tt, &t);
  char buf[25];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &t);
  return String(buf);
}

String nowIso() {
  return epochToIso(static_cast<uint32_t>(nowEpoch()));
}

String newMessageId(const char* prefix) {
  const uint32_t nowS = static_cast<uint32_t>(nowEpoch());
  const uint32_t rnd = esp_random();
  String id = String(prefix) + "-" + String(nowS) + "-" + String(rnd, HEX);
  id.toUpperCase();
  return id;
}

// ===== Camera =====
bool setupCamera() {
  if (cameraReady) {
    return true;
  }

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

  if (psramFound()) {
    config.frame_size = FRAMESIZE_SVGA;
    config.jpeg_quality = 10;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_VGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }

  const esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[CAM] Init failed: 0x%x\n", err);
    cameraReady = false;
    return false;
  }

  configureSensorDefaults();
  setStandbyMode();

  cameraReady = true;
  Serial.println("[CAM] Camera initialized.");
  return true;
}

void configureSensorDefaults() {
  sensor_t* s = esp_camera_sensor_get();
  if (!s) {
    return;
  }

  s->set_brightness(s, 0);
  s->set_contrast(s, 0);
  s->set_saturation(s, 0);
  s->set_special_effect(s, 0);
  s->set_whitebal(s, 1);
  s->set_awb_gain(s, 1);
  s->set_exposure_ctrl(s, 1);
  s->set_gain_ctrl(s, 1);
  s->set_hmirror(s, 0);
  s->set_vflip(s, 0);
}

void setCaptureMode() {
  sensor_t* s = esp_camera_sensor_get();
  if (!s) {
    return;
  }

  if (psramFound()) {
    s->set_framesize(s, FRAMESIZE_UXGA);
  } else {
    s->set_framesize(s, FRAMESIZE_SVGA);
  }
}

void setStreamMode() {
  sensor_t* s = esp_camera_sensor_get();
  if (!s) {
    return;
  }
  s->set_framesize(s, FRAMESIZE_QVGA);
}

void setStandbyMode() {
  sensor_t* s = esp_camera_sensor_get();
  if (!s) {
    return;
  }

  if (psramFound()) {
    s->set_framesize(s, FRAMESIZE_SVGA);
  } else {
    s->set_framesize(s, FRAMESIZE_VGA);
  }
}

camera_fb_t* captureFrameWithRetries(uint8_t maxAttempts) {
  for (uint8_t i = 0; i < maxAttempts; ++i) {
    camera_fb_t* fb = esp_camera_fb_get();
    if (fb != nullptr && fb->len > 0) {
      return fb;
    }
    if (fb != nullptr) {
      esp_camera_fb_return(fb);
    }
    delay(80);
  }
  return nullptr;
}
// ===== Signal handling =====
void IRAM_ATTR onSignalChange() {
  const int level = digitalRead(PIN_DEV_SIGNAL);
  const uint32_t nowUs = micros();

  portENTER_CRITICAL_ISR(&signalMux);
  if (level == HIGH) {
    signalRiseAtUs = nowUs;
  } else {
    if (signalRiseAtUs != 0) {
      signalPulseUs = nowUs - signalRiseAtUs;
      signalRiseAtUs = 0;
      signalPending = true;
    }
  }
  portEXIT_CRITICAL_ISR(&signalMux);
}

void processSignalFromIsr() {
  uint32_t pulseUs = 0;
  bool hasPulse = false;

  portENTER_CRITICAL(&signalMux);
  if (signalPending) {
    pulseUs = signalPulseUs;
    signalPending = false;
    hasPulse = true;
  }
  portEXIT_CRITICAL(&signalMux);

  if (hasPulse) {
    handlePulseCommand(pulseUs);
  }
}

void handlePulseCommand(uint32_t pulseUs) {
  Serial.print("[SIGNAL] Pulse: ");
  Serial.print(static_cast<float>(pulseUs) / 1000.0f, 1);
  Serial.println(" ms");

  if (pulseUs >= SIGNAL_CAPTURE_MIN_US && pulseUs <= SIGNAL_CAPTURE_MAX_US) {
    Serial.println("[SIGNAL] Capture command");
    captureAndUploadIncident();
    return;
  }

  if (pulseUs >= SIGNAL_STREAM_START_MIN_US && pulseUs <= SIGNAL_STREAM_START_MAX_US) {
    Serial.println("[SIGNAL] Stream start/toggle command");
    if (isStreaming) {
      stopStreaming();
    } else {
      startStreaming();
    }
    return;
  }

  if (pulseUs >= SIGNAL_STREAM_STOP_MIN_US && pulseUs <= SIGNAL_STREAM_STOP_MAX_US) {
    Serial.println("[SIGNAL] Stream stop command");
    stopStreaming();
    return;
  }

  Serial.println("[SIGNAL] Unknown pulse window");
}

// ===== Incident capture/upload =====
void captureAndUploadIncident() {
  if (!cameraReady && !setupCamera()) {
    Serial.println("[CAPTURE] Camera unavailable");
    return;
  }

  if (!ensureWiFiConnected(8000)) {
    Serial.println("[CAPTURE] WiFi unavailable");
    blinkStatus(4, 60, 80);
    return;
  }

  setCaptureMode();

  digitalWrite(PIN_LED_FLASH, HIGH);
  camera_fb_t* fb = captureFrameWithRetries(CAPTURE_RETRY_COUNT);
  digitalWrite(PIN_LED_FLASH, LOW);

  if (fb == nullptr) {
    Serial.println("[CAPTURE] Frame capture failed");
    blinkStatus(4, 70, 70);
    if (isStreaming) {
      setStreamMode();
    } else {
      setStandbyMode();
    }
    return;
  }

  Serial.print("[CAPTURE] Frame bytes: ");
  Serial.println(fb->len);

  const String payloadJson = buildIncidentPayloadJson();

  bool uploaded = false;
  int statusCode = 0;
  String response;

  for (uint8_t attempt = 1; attempt <= UPLOAD_RETRY_COUNT; ++attempt) {
    response = "";
    statusCode = 0;

    if (uploadIncidentMultipart(fb, payloadJson, statusCode, response)) {
      if (statusCode == 200 || statusCode == 201) {
        uploaded = true;
        break;
      }
      Serial.printf("[UPLOAD] HTTP %d (attempt %u/%u)\n", statusCode, attempt, UPLOAD_RETRY_COUNT);
    } else {
      Serial.printf("[UPLOAD] Transport error (attempt %u/%u)\n", attempt, UPLOAD_RETRY_COUNT);
    }

    delay(250 * attempt);
  }

  if (uploaded) {
    Serial.printf("[UPLOAD] Success HTTP %d\n", statusCode);
    if (response.length() > 0) {
      Serial.println(response);
      parseIncidentIdFromResponse(response);
    }
    blinkStatus(2, 160, 120);
  } else {
    Serial.printf("[UPLOAD] Failed, last HTTP %d\n", statusCode);
    blinkStatus(5, 80, 80);
  }

  esp_camera_fb_return(fb);

  if (isStreaming) {
    setStreamMode();
  } else {
    setStandbyMode();
  }
}

String buildIncidentPayloadJson() {
  StaticJsonDocument<256> doc;
  doc["senderTimestamp"] = nowIso();
  doc["connectivityUsed"] = "INTERNET";
  doc["messageId"] = newMessageId("CAM");
  doc["firmwareVersion"] = CAMERA_FIRMWARE_VERSION;

  String payload;
  serializeJson(doc, payload);
  return payload;
}

bool httpWriteAll(esp_http_client_handle_t client, const uint8_t* data, int len) {
  int offset = 0;
  while (offset < len) {
    const int written = esp_http_client_write(client, reinterpret_cast<const char*>(data + offset), len - offset);
    if (written <= 0) {
      return false;
    }
    offset += written;
  }
  return true;
}

bool uploadIncidentMultipart(camera_fb_t* fb, const String& payloadJson, int& statusCode, String& responseOut) {
  statusCode = 0;
  responseOut = "";

  if (fb == nullptr || fb->len == 0) {
    return false;
  }

  const String url = String(SERVER_URL) + "/api/devices/" + DEVICE_ID + "/incident";
  const String boundary = "----PersevaBoundary" + String(esp_random(), HEX);

  String head = "--" + boundary + "\r\n";
  head += "Content-Disposition: form-data; name=\"image\"; filename=\"incident.jpg\"\r\n";
  head += "Content-Type: image/jpeg\r\n\r\n";

  String tail = "\r\n--" + boundary + "\r\n";
  tail += "Content-Disposition: form-data; name=\"payload\"\r\n\r\n";
  tail += payloadJson + "\r\n";
  tail += "--" + boundary + "--\r\n";

  const int totalLen = head.length() + fb->len + tail.length();

  esp_http_client_config_t config = {};
  config.url = url.c_str();
  config.timeout_ms = HTTP_TIMEOUT_MS;

  esp_http_client_handle_t client = esp_http_client_init(&config);
  if (client == nullptr) {
    return false;
  }

  esp_http_client_set_method(client, HTTP_METHOD_POST);
  const String contentType = "multipart/form-data; boundary=" + boundary;
  esp_http_client_set_header(client, "Content-Type", contentType.c_str());
  esp_http_client_set_header(client, "x-device-key", API_KEY);
  esp_http_client_set_header(client, "Connection", "close");

  const esp_err_t openErr = esp_http_client_open(client, totalLen);
  if (openErr != ESP_OK) {
    esp_http_client_cleanup(client);
    return false;
  }

  const bool writeOk =
      httpWriteAll(client, reinterpret_cast<const uint8_t*>(head.c_str()), head.length()) &&
      httpWriteAll(client, fb->buf, fb->len) &&
      httpWriteAll(client, reinterpret_cast<const uint8_t*>(tail.c_str()), tail.length());

  if (!writeOk) {
    esp_http_client_close(client);
    esp_http_client_cleanup(client);
    return false;
  }

  esp_http_client_fetch_headers(client);
  statusCode = esp_http_client_get_status_code(client);

  char buf[128];
  int r = 0;
  while ((r = esp_http_client_read(client, buf, sizeof(buf) - 1)) > 0) {
    buf[r] = '\0';
    if (responseOut.length() < 1024) {
      responseOut += buf;
    }
  }

  esp_http_client_close(client);
  esp_http_client_cleanup(client);

  return statusCode > 0;
}

void parseIncidentIdFromResponse(const String& response) {
  StaticJsonDocument<256> doc;
  const DeserializationError err = deserializeJson(doc, response);
  if (err) {
    return;
  }

  if (doc["data"]["incidentId"].is<const char*>()) {
    lastIncidentId = doc["data"]["incidentId"].as<String>();
    Serial.print("[UPLOAD] incidentId: ");
    Serial.println(lastIncidentId);
  }
}

// ===== Streaming =====
void setupWebSocketClient() {
  webSocket.begin(WS_HOST, WS_PORT, WS_PATH);
  webSocket.onEvent(onWebSocketEvent);
  webSocket.setReconnectInterval(3000);
}

void startStreaming() {
  if (isStreaming) {
    Serial.println("[STREAM] Already active");
    return;
  }

  if (!cameraReady && !setupCamera()) {
    Serial.println("[STREAM] Camera unavailable");
    return;
  }

  if (!ensureWiFiConnected(5000)) {
    Serial.println("[STREAM] WiFi unavailable");
    return;
  }

  isStreaming = true;
  lastStreamFrameAt = 0;
  setStreamMode();

  if (ENABLE_WS_STREAMING) {
    setupWebSocketClient();
  }

  Serial.println("[STREAM] Started");
  blinkStatus(3, 90, 90);
}

void stopStreaming() {
  if (!isStreaming) {
    return;
  }

  isStreaming = false;

  if (ENABLE_WS_STREAMING) {
    webSocket.disconnect();
  }

  setStandbyMode();
  Serial.println("[STREAM] Stopped");
  blinkStatus(1, 300, 100);
}

void processStreaming() {
  if (!isStreaming) {
    return;
  }

  const unsigned long nowMs = millis();
  if (nowMs - lastStreamFrameAt < STREAM_FRAME_INTERVAL_MS) {
    return;
  }
  lastStreamFrameAt = nowMs;

  if (!ENABLE_WS_STREAMING) {
    return;
  }

  if (!webSocket.isConnected()) {
    return;
  }

  camera_fb_t* fb = captureFrameWithRetries(2);
  if (fb == nullptr) {
    Serial.println("[STREAM] Frame failed");
    return;
  }

  webSocket.sendBIN(fb->buf, fb->len);
  esp_camera_fb_return(fb);
}

void onWebSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED: {
      Serial.printf("[WS] Connected: %s\n", reinterpret_cast<char*>(payload));
      StaticJsonDocument<256> doc;
      doc["type"] = "cam_auth";
      doc["deviceId"] = DEVICE_ID;
      doc["apiKey"] = API_KEY;
      doc["incidentId"] = lastIncidentId;
      doc["senderTimestamp"] = nowIso();
      String msg;
      serializeJson(doc, msg);
      webSocket.sendTXT(msg);
      break;
    }

    case WStype_DISCONNECTED:
      Serial.println("[WS] Disconnected");
      break;

    case WStype_TEXT: {
      String text = reinterpret_cast<char*>(payload);
      Serial.print("[WS] Text: ");
      Serial.println(text);

      StaticJsonDocument<192> doc;
      if (deserializeJson(doc, text) == DeserializationError::Ok) {
        String typeMsg = doc["type"] | "";
        if (typeMsg == "stop") {
          stopStreaming();
        }
      }
      break;
    }

    case WStype_ERROR:
      Serial.println("[WS] Error");
      break;

    case WStype_PING:
    case WStype_PONG:
    case WStype_BIN:
      break;
  }
}

// ===== Utility =====
void blinkStatus(uint8_t times, uint16_t onMs, uint16_t offMs) {
  for (uint8_t i = 0; i < times; ++i) {
    digitalWrite(PIN_LED_STATUS, HIGH);
    delay(onMs);
    digitalWrite(PIN_LED_STATUS, LOW);
    delay(offMs);
  }
}

void handleSerialConsole() {
  if (!Serial.available()) {
    return;
  }

  String cmd = Serial.readStringUntil('\n');
  cmd.trim();
  if (cmd.length() == 0) {
    return;
  }

  cmd.toUpperCase();

  if (cmd == "CAPTURE") {
    captureAndUploadIncident();
    return;
  }

  if (cmd == "STREAM START") {
    startStreaming();
    return;
  }

  if (cmd == "STREAM STOP") {
    stopStreaming();
    return;
  }

  if (cmd == "STATUS") {
    printStatus();
    return;
  }

  Serial.println("[CMD] Unknown command");
}

void printStatus() {
  Serial.println("----- CAM STATUS -----");
  Serial.print("WiFi: ");
  Serial.println(wifiConnected ? "CONNECTED" : "DISCONNECTED");
  if (wifiConnected) {
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  }

  Serial.print("Time: ");
  Serial.println(nowIso());

  Serial.print("Camera: ");
  Serial.println(cameraReady ? "READY" : "NOT_READY");

  Serial.print("Streaming: ");
  Serial.println(isStreaming ? "ON" : "OFF");

  Serial.print("Last incidentId: ");
  Serial.println(lastIncidentId.length() > 0 ? lastIncidentId : "N/A");

  Serial.println("----------------------");
}
