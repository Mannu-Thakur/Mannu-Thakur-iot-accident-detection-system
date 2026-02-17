/**
 * Perseva ESP32-DEV
 *
 * Hardware architecture from the provided circuit:
 * - SN74HC595 SIPO drives TIP122 low-side switches (T1GND..T6GND)
 * - TIP122 channels control component grounds (MPU, GPS, TFT, SIM800L, Buzzer, CAM)
 * - CAM module receives command pulses on CAM_SIG
 *
 * Backend integration:
 * - POST /api/devices/:deviceId/heartbeat (JSON)
 * - POST /api/devices/:deviceId/incident (JSON data-only from DEV)
 * - POST /api/devices/:deviceId/live-access/ack
 * - POST /api/devices/:deviceId/live-access/cancel
 *
 * NOTE:
 * The shift-register bit mapping and some GPIO mappings are configurable below.
 * If your PCB wiring differs, update only mapping constants.
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>
#include <time.h>
#include <math.h>
#include <string.h>
#include <esp_system.h>

// ===== User configuration =====
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char* SERVER_URL = "http://YOUR_SERVER_IP:3000";
const char* DEVICE_ID = "YOUR_DEVICE_ID";
const char* API_KEY = "YOUR_API_KEY";
const char* FIRMWARE_VERSION = "2.0.0-sr-tip122";

// ===== Time configuration =====
const long NTP_GMT_OFFSET_SEC = 0;
const int NTP_DAYLIGHT_OFFSET_SEC = 0;
const char* NTP_SERVER_1 = "pool.ntp.org";
const char* NTP_SERVER_2 = "time.nist.gov";
const uint32_t FALLBACK_EPOCH_BASE = 1735689600UL;  // 2025-01-01T00:00:00Z

// ===== Pin mapping =====
// ESP32 -> SN74HC595 control lines
const int PIN_SR_DATA = 23;   // MOSI
const int PIN_SR_CLOCK = 18;  // SCK
const int PIN_SR_LATCH = 5;   // RLCK2 (or RLCK)

// Signals and local IO
const int PIN_CAM_SIGNAL = 27;        // CAM_SIG
const int PIN_BUTTON_INCIDENT = 15;   // BTN_SIG
const int PIN_LED_WIFI = 2;
const int PIN_LED_INCIDENT = 4;

// GPS UART2
const int PIN_GPS_RX = 16;  // RX2
const int PIN_GPS_TX = 17;  // TX2

// I2C bus for MPU6050 (+ DS1307/in-vehicle I2C)
const int PIN_I2C_SDA = 21;
const int PIN_I2C_SCL = 22;

// ===== Shift register to TIP122 mapping =====
// Logical ON means component ground is connected through TIP122.
const bool SR_ACTIVE_HIGH = true;
const bool SR_SHIFT_MSB_FIRST = true;

// Q0..Q5 assumed mapped to T1..T6 sequentially.
// Update these bit numbers if your hardware differs.
const uint8_t SR_BIT_T1_MPU_GND = 0;     // T1GND -> MPU6050
const uint8_t SR_BIT_T2_GPS_GND = 1;     // T2GND -> GPS
const uint8_t SR_BIT_T3_TFT_GND = 2;     // T3GND -> TFT
const uint8_t SR_BIT_T4_SIM_GND = 3;     // T4GND -> SIM800L
const uint8_t SR_BIT_T5_BUZZER_GND = 4;  // T5GND -> Buzzer
const uint8_t SR_BIT_T6_CAM_GND = 5;     // T6GND -> ESP32-CAM

const uint8_t SR_MASK_MPU = (1u << SR_BIT_T1_MPU_GND);
const uint8_t SR_MASK_GPS = (1u << SR_BIT_T2_GPS_GND);
const uint8_t SR_MASK_TFT = (1u << SR_BIT_T3_TFT_GND);
const uint8_t SR_MASK_SIM = (1u << SR_BIT_T4_SIM_GND);
const uint8_t SR_MASK_BUZZER = (1u << SR_BIT_T5_BUZZER_GND);
const uint8_t SR_MASK_CAM = (1u << SR_BIT_T6_CAM_GND);

// ===== Timing =====
const unsigned long WIFI_RETRY_INTERVAL_MS = 5000;
const unsigned long HEARTBEAT_INTERVAL_MS = 30000;
const unsigned long NTP_RESYNC_INTERVAL_MS = 6UL * 60UL * 60UL * 1000UL;
const unsigned long SENSOR_SAMPLE_INTERVAL_MS = 20;  // 50 Hz
const unsigned long GPS_UPDATE_INTERVAL_MS = 200;
const unsigned long BUTTON_DEBOUNCE_MS = 50;
const unsigned long BUTTON_LONG_PRESS_MS = 1500;

const unsigned long CAMERA_BOOT_TIME_MS = 4500;
const unsigned long CAMERA_KEEP_ALIVE_MS = 20000;
const unsigned long INCIDENT_COOLDOWN_MS = 10000;
const unsigned long INCIDENT_RETRY_BASE_MS = 2000;
const unsigned long INCIDENT_RETRY_MAX_MS = 60000;
const uint8_t INCIDENT_MAX_ATTEMPTS = 6;
const int HTTP_TIMEOUT_MS = 10000;

// CAM command pulses (measured at CAM input)
const unsigned long CAM_PULSE_CAPTURE_MS = 220;
const unsigned long CAM_PULSE_STREAM_START_MS = 650;
const unsigned long CAM_PULSE_STREAM_STOP_MS = 1200;

// ===== Motion thresholds =====
const float IMPACT_THRESHOLD_G = 3.2f;
const float FREE_FALL_THRESHOLD_G = 0.35f;
const unsigned long FREE_FALL_CONFIRM_MS = 180;
const unsigned long FREE_FALL_IMPACT_WINDOW_MS = 2500;

// ===== MPU6050 registers =====
const uint8_t MPU_REG_WHO_AM_I = 0x75;
const uint8_t MPU_REG_PWR_MGMT_1 = 0x6B;
const uint8_t MPU_REG_ACCEL_CONFIG = 0x1C;
const uint8_t MPU_REG_ACCEL_XOUT_H = 0x3B;

// ===== Types =====
enum CamCommandType : uint8_t {
  CAM_CMD_NONE = 0,
  CAM_CMD_CAPTURE = 1,
  CAM_CMD_STREAM_START = 2,
  CAM_CMD_STREAM_STOP = 3
};

struct IncidentEvent {
  bool manualTrigger;
  bool isFreeFall;
  bool isBrakeFail;
  bool airbagsDeployed;
  bool hasLocation;
  float lat;
  float lon;
  float speedKmph;
  float impactForce;
  char impactDirection[12];
  char messageId[40];
  uint32_t epoch;
  uint8_t attempts;
  unsigned long nextAttemptAt;
};

// ===== Globals =====
TinyGPSPlus gps;
HardwareSerial gpsSerial(1);

// Shift register logical state (1 bit == component ON)
uint8_t srLogicalState = 0;

// WiFi/time state
bool wifiConnected = false;
bool ntpSynced = false;
unsigned long lastWiFiAttempt = 0;
unsigned long lastNtpSync = 0;
unsigned long lastHeartbeat = 0;

// Sensor state
uint8_t mpuAddress = 0;
bool mpuReady = false;
float accelX = 0.0f;
float accelY = 0.0f;
float accelZ = 1.0f;
float totalG = 1.0f;
float filteredG = 1.0f;
bool freeFallTracking = false;
bool freeFallQualified = false;
unsigned long freeFallStartAt = 0;
unsigned long freeFallExpireAt = 0;
unsigned long lastSensorSample = 0;

// GPS state
float currentLat = 0.0f;
float currentLon = 0.0f;
float currentSpeed = 0.0f;
bool gpsValid = false;
unsigned long lastGpsUpdate = 0;

// Incident queue
const uint8_t INCIDENT_QUEUE_SIZE = 6;
IncidentEvent incidentQueue[INCIDENT_QUEUE_SIZE];
uint8_t incidentHead = 0;
uint8_t incidentTail = 0;
uint8_t incidentCount = 0;
unsigned long lastIncidentRaisedAt = 0;

// Button state
bool buttonStableState = HIGH;
bool buttonLastReading = HIGH;
unsigned long buttonLastChangeAt = 0;
unsigned long buttonPressedAt = 0;

// Buzzer pattern state (TIP122 controlled ground)
bool buzzerState = false;
uint8_t buzzerTransitionsRemaining = 0;
unsigned long buzzerNextToggleAt = 0;
uint16_t buzzerOnMs = 120;
uint16_t buzzerOffMs = 120;

// Camera power/command state
bool cameraPowered = false;
bool cameraStreaming = false;
bool cameraForceOn = false;
unsigned long cameraBootReadyAt = 0;
unsigned long cameraKeepAliveUntil = 0;
CamCommandType pendingCamCommand = CAM_CMD_NONE;
unsigned long pendingCamReadyAt = 0;

// Live access state (request ID should come from socket integration)
String activeLiveRequestId = "";

// ===== Forward declarations =====
void setupPins();
void setupPowerChannels();
void flushShiftRegister();
void setPowerMask(uint8_t mask, bool on);
bool isPowerMaskOn(uint8_t mask);

void setupWiFi();
void maintainWiFi();
void syncClockFromNtpIfNeeded(bool force);
time_t nowEpoch();
String epochToIso(uint32_t epoch);
String nowIso();

void setupGps();
void updateGps();

bool setupMpu6050();
void readMpuSample();
void analyzeMotion();

void handleButton();
void onShortPress();
void onLongPress();

void startBuzzerPattern(uint8_t pulses, uint16_t onMs, uint16_t offMs);
void updateBuzzerPattern();

void ensureCameraPowered();
void setCameraPower(bool on);
void holdCameraFor(unsigned long holdMs);
void queueCameraCommand(CamCommandType cmd);
void processPendingCameraCommand();
void processCameraPowerPolicy();

bool enqueueIncident(const IncidentEvent& event);
IncidentEvent* peekIncident();
void popIncident();
String newMessageId(const char* prefix);
String estimateImpactDirection();
void raiseIncident(bool manual, bool isFreeFall, bool isBrakeFail);
void processIncidentQueue();

bool sendHeartbeat();
bool sendIncidentData(const IncidentEvent& event);
bool postJson(const String& path, const String& body, int& httpCode, String* responseOut);

bool sendLiveAccessAck(const String& requestId);
bool sendLiveAccessCancel(const String& requestId, const String& reason);
void onLiveAccessRequest(const String& requestId, const String& authorityName);

void handleSerialConsole();
void printStatus();

// ===== Setup =====
void setup() {
  Serial.begin(115200);
  Serial.setTimeout(20);
  delay(200);

  Serial.println();
  Serial.println("===============================================");
  Serial.println("Perseva ESP32-DEV (SR + TIP122 architecture)");
  Serial.println("===============================================");

  setupPins();
  setupPowerChannels();

  // Essential channels ON first (sensor power through TIP122 ground path).
  setPowerMask(SR_MASK_MPU, true);
  setPowerMask(SR_MASK_GPS, true);
  setPowerMask(SR_MASK_BUZZER, false);
  setPowerMask(SR_MASK_CAM, false);
  setPowerMask(SR_MASK_SIM, false);
  setPowerMask(SR_MASK_TFT, false);

  setupWiFi();
  syncClockFromNtpIfNeeded(true);

  setupGps();
  mpuReady = setupMpu6050();

  Serial.println("[BOOT] Setup complete.");
}

// ===== Main loop =====
void loop() {
  const unsigned long nowMs = millis();

  maintainWiFi();
  syncClockFromNtpIfNeeded(false);
  updateGps();

  if (nowMs - lastSensorSample >= SENSOR_SAMPLE_INTERVAL_MS) {
    readMpuSample();
    analyzeMotion();
    lastSensorSample = nowMs;
  }

  if (nowMs - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
    sendHeartbeat();
    lastHeartbeat = nowMs;
  }

  handleButton();
  handleSerialConsole();

  processPendingCameraCommand();
  processCameraPowerPolicy();
  updateBuzzerPattern();
  processIncidentQueue();

  delay(5);
}

// ===== Pins and power =====
void setupPins() {
  pinMode(PIN_SR_DATA, OUTPUT);
  pinMode(PIN_SR_CLOCK, OUTPUT);
  pinMode(PIN_SR_LATCH, OUTPUT);

  pinMode(PIN_CAM_SIGNAL, OUTPUT);
  digitalWrite(PIN_CAM_SIGNAL, LOW);

  pinMode(PIN_BUTTON_INCIDENT, INPUT_PULLUP);

  pinMode(PIN_LED_WIFI, OUTPUT);
  pinMode(PIN_LED_INCIDENT, OUTPUT);
  digitalWrite(PIN_LED_WIFI, LOW);
  digitalWrite(PIN_LED_INCIDENT, LOW);

  Serial.println("[PINS] Configured.");
}

void setupPowerChannels() {
  srLogicalState = 0;
  flushShiftRegister();
  Serial.println("[POWER] Shift register initialized.");
}

void flushShiftRegister() {
  const uint8_t physical = SR_ACTIVE_HIGH ? srLogicalState : static_cast<uint8_t>(~srLogicalState);

  digitalWrite(PIN_SR_LATCH, LOW);
  shiftOut(PIN_SR_DATA, PIN_SR_CLOCK, SR_SHIFT_MSB_FIRST ? MSBFIRST : LSBFIRST, physical);
  digitalWrite(PIN_SR_LATCH, HIGH);
}

void setPowerMask(uint8_t mask, bool on) {
  if (on) {
    srLogicalState |= mask;
  } else {
    srLogicalState &= static_cast<uint8_t>(~mask);
  }
  flushShiftRegister();
}

bool isPowerMaskOn(uint8_t mask) {
  return (srLogicalState & mask) == mask;
}

// ===== WiFi and time =====
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
  digitalWrite(PIN_LED_WIFI, wifiConnected ? HIGH : LOW);

  if (wifiConnected) {
    Serial.print("[WIFI] Connected. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("[WIFI] Initial connect failed, will retry in loop.");
  }
}

void maintainWiFi() {
  const bool connectedNow = (WiFi.status() == WL_CONNECTED);

  if (connectedNow && !wifiConnected) {
    wifiConnected = true;
    digitalWrite(PIN_LED_WIFI, HIGH);
    Serial.print("[WIFI] Reconnected. IP: ");
    Serial.println(WiFi.localIP());
    ntpSynced = false;
  } else if (!connectedNow && wifiConnected) {
    wifiConnected = false;
    digitalWrite(PIN_LED_WIFI, LOW);
    Serial.println("[WIFI] Disconnected.");
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
    delay(150);
  }

  Serial.println("[TIME] NTP sync pending (using fallback timestamp until sync).");
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

// ===== GPS =====
void setupGps() {
  gpsSerial.begin(9600, SERIAL_8N1, PIN_GPS_RX, PIN_GPS_TX);
  Serial.println("[GPS] UART2 started at 9600 baud.");
}

void updateGps() {
  if (millis() - lastGpsUpdate < GPS_UPDATE_INTERVAL_MS) {
    while (gpsSerial.available() > 0) {
      gps.encode(gpsSerial.read());
    }
    return;
  }
  lastGpsUpdate = millis();

  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  const bool locationFresh = gps.location.isValid() && gps.location.age() < 5000;
  gpsValid = locationFresh;

  if (locationFresh) {
    currentLat = gps.location.lat();
    currentLon = gps.location.lng();
  }

  if (gps.speed.isValid() && gps.speed.age() < 5000) {
    currentSpeed = gps.speed.kmph();
  }
}
// ===== MPU6050 =====
static bool mpuReadRegAt(uint8_t addr, uint8_t reg, uint8_t* out, uint8_t len) {
  Wire.beginTransmission(addr);
  Wire.write(reg);
  if (Wire.endTransmission(false) != 0) {
    return false;
  }

  const uint8_t received = Wire.requestFrom(static_cast<int>(addr), static_cast<int>(len), static_cast<int>(true));
  if (received != len) {
    return false;
  }

  for (uint8_t i = 0; i < len; ++i) {
    out[i] = static_cast<uint8_t>(Wire.read());
  }
  return true;
}

static bool mpuWriteReg(uint8_t addr, uint8_t reg, uint8_t value) {
  Wire.beginTransmission(addr);
  Wire.write(reg);
  Wire.write(value);
  return Wire.endTransmission(true) == 0;
}

bool setupMpu6050() {
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);

  const uint8_t probeAddresses[2] = {0x68, 0x69};
  uint8_t who = 0;
  bool found = false;

  for (uint8_t i = 0; i < 2; ++i) {
    const uint8_t addr = probeAddresses[i];
    if (mpuReadRegAt(addr, MPU_REG_WHO_AM_I, &who, 1) && (who == 0x68 || who == 0x71)) {
      mpuAddress = addr;
      found = true;
      break;
    }
  }

  if (!found) {
    Serial.println("[MPU] Not detected at 0x68 or 0x69.");
    return false;
  }

  if (!mpuWriteReg(mpuAddress, MPU_REG_PWR_MGMT_1, 0x00)) {
    Serial.println("[MPU] Failed to wake sensor.");
    return false;
  }

  // +/-8g range
  if (!mpuWriteReg(mpuAddress, MPU_REG_ACCEL_CONFIG, 0x10)) {
    Serial.println("[MPU] Failed to set accel range.");
    return false;
  }

  Serial.print("[MPU] Ready at 0x");
  Serial.print(mpuAddress, HEX);
  Serial.println(" (+/-8g).");
  return true;
}

void readMpuSample() {
  if (!mpuReady) {
    return;
  }

  uint8_t buf[6];
  if (!mpuReadRegAt(mpuAddress, MPU_REG_ACCEL_XOUT_H, buf, sizeof(buf))) {
    return;
  }

  const int16_t rawX = static_cast<int16_t>((buf[0] << 8) | buf[1]);
  const int16_t rawY = static_cast<int16_t>((buf[2] << 8) | buf[3]);
  const int16_t rawZ = static_cast<int16_t>((buf[4] << 8) | buf[5]);

  // +/-8g => 4096 LSB/g
  accelX = static_cast<float>(rawX) / 4096.0f;
  accelY = static_cast<float>(rawY) / 4096.0f;
  accelZ = static_cast<float>(rawZ) / 4096.0f;

  totalG = sqrtf((accelX * accelX) + (accelY * accelY) + (accelZ * accelZ));
  filteredG = (filteredG * 0.85f) + (totalG * 0.15f);
}

void analyzeMotion() {
  const unsigned long nowMs = millis();

  if (nowMs - lastIncidentRaisedAt < INCIDENT_COOLDOWN_MS) {
    return;
  }

  // Free-fall qualification
  if (totalG <= FREE_FALL_THRESHOLD_G) {
    if (!freeFallTracking) {
      freeFallTracking = true;
      freeFallStartAt = nowMs;
    } else if (!freeFallQualified && (nowMs - freeFallStartAt >= FREE_FALL_CONFIRM_MS)) {
      freeFallQualified = true;
      freeFallExpireAt = nowMs + FREE_FALL_IMPACT_WINDOW_MS;
      Serial.println("[MOTION] Free-fall qualified.");
    }
  } else if (!freeFallQualified) {
    freeFallTracking = false;
  }

  if (freeFallQualified && nowMs > freeFallExpireAt) {
    freeFallQualified = false;
    freeFallTracking = false;
  }

  // Impact trigger
  if (totalG >= IMPACT_THRESHOLD_G) {
    const bool isFreeFallImpact = freeFallQualified && (nowMs <= freeFallExpireAt);
    Serial.print("[MOTION] Impact detected. G=");
    Serial.println(totalG, 2);

    raiseIncident(false, isFreeFallImpact, false);

    freeFallQualified = false;
    freeFallTracking = false;
  }
}

// ===== Button =====
void handleButton() {
  const bool reading = digitalRead(PIN_BUTTON_INCIDENT);

  if (reading != buttonLastReading) {
    buttonLastChangeAt = millis();
  }

  if ((millis() - buttonLastChangeAt) > BUTTON_DEBOUNCE_MS) {
    if (reading != buttonStableState) {
      buttonStableState = reading;

      if (buttonStableState == LOW) {
        buttonPressedAt = millis();
      } else {
        const unsigned long pressDuration = millis() - buttonPressedAt;
        if (pressDuration >= BUTTON_LONG_PRESS_MS) {
          onLongPress();
        } else {
          onShortPress();
        }
      }
    }
  }

  buttonLastReading = reading;
}

void onShortPress() {
  Serial.println("[BUTTON] Short press -> manual incident.");
  raiseIncident(true, false, false);
}

void onLongPress() {
  if (activeLiveRequestId.length() > 0) {
    Serial.println("[BUTTON] Long press -> cancel live access.");
    if (sendLiveAccessCancel(activeLiveRequestId, "Owner long-pressed cancel button")) {
      queueCameraCommand(CAM_CMD_STREAM_STOP);
      activeLiveRequestId = "";
      cameraStreaming = false;
      cameraForceOn = false;
    }
    return;
  }

  // Long press fallback action for field testing.
  const bool camNow = isPowerMaskOn(SR_MASK_CAM);
  setCameraPower(!camNow);
  cameraForceOn = !camNow;
  if (camNow) {
    Serial.println("[BUTTON] Long press -> camera power OFF.");
  } else {
    Serial.println("[BUTTON] Long press -> camera power ON.");
  }
}

// ===== Buzzer =====
void startBuzzerPattern(uint8_t pulses, uint16_t onMs, uint16_t offMs) {
  if (pulses == 0) {
    return;
  }

  buzzerTransitionsRemaining = static_cast<uint8_t>(pulses * 2);
  buzzerOnMs = onMs;
  buzzerOffMs = offMs;
  buzzerState = false;
  buzzerNextToggleAt = 0;
}

void updateBuzzerPattern() {
  if (buzzerTransitionsRemaining == 0) {
    if (isPowerMaskOn(SR_MASK_BUZZER)) {
      setPowerMask(SR_MASK_BUZZER, false);
    }
    return;
  }

  const unsigned long nowMs = millis();
  if (buzzerNextToggleAt != 0 && nowMs < buzzerNextToggleAt) {
    return;
  }

  buzzerState = !buzzerState;
  setPowerMask(SR_MASK_BUZZER, buzzerState);

  if (buzzerState) {
    buzzerNextToggleAt = nowMs + buzzerOnMs;
  } else {
    buzzerNextToggleAt = nowMs + buzzerOffMs;
  }

  if (buzzerTransitionsRemaining > 0) {
    --buzzerTransitionsRemaining;
  }
}

// ===== Camera power/commands =====
void ensureCameraPowered() {
  if (!cameraPowered) {
    setCameraPower(true);
  }
}

void setCameraPower(bool on) {
  setPowerMask(SR_MASK_CAM, on);
  cameraPowered = on;

  if (on) {
    cameraBootReadyAt = millis() + CAMERA_BOOT_TIME_MS;
    holdCameraFor(CAMERA_KEEP_ALIVE_MS);
  } else {
    cameraBootReadyAt = 0;
    cameraKeepAliveUntil = 0;
    pendingCamCommand = CAM_CMD_NONE;
    cameraStreaming = false;
    cameraForceOn = false;
  }
}

void holdCameraFor(unsigned long holdMs) {
  const unsigned long until = millis() + holdMs;
  if (until > cameraKeepAliveUntil) {
    cameraKeepAliveUntil = until;
  }
}

void queueCameraCommand(CamCommandType cmd) {
  ensureCameraPowered();

  pendingCamCommand = cmd;
  pendingCamReadyAt = millis();
  if (cameraBootReadyAt > pendingCamReadyAt) {
    pendingCamReadyAt = cameraBootReadyAt;
  }

  if (cmd == CAM_CMD_CAPTURE) {
    holdCameraFor(CAMERA_KEEP_ALIVE_MS);
  } else if (cmd == CAM_CMD_STREAM_START) {
    cameraForceOn = true;
    holdCameraFor(CAMERA_KEEP_ALIVE_MS);
  }
}

void processPendingCameraCommand() {
  if (pendingCamCommand == CAM_CMD_NONE) {
    return;
  }

  if (millis() < pendingCamReadyAt) {
    return;
  }

  unsigned long pulseMs = 0;
  switch (pendingCamCommand) {
    case CAM_CMD_CAPTURE:
      pulseMs = CAM_PULSE_CAPTURE_MS;
      break;
    case CAM_CMD_STREAM_START:
      pulseMs = CAM_PULSE_STREAM_START_MS;
      break;
    case CAM_CMD_STREAM_STOP:
      pulseMs = CAM_PULSE_STREAM_STOP_MS;
      break;
    default:
      break;
  }

  if (pulseMs == 0) {
    pendingCamCommand = CAM_CMD_NONE;
    return;
  }

  Serial.print("[CAM] Pulse command: ");
  Serial.print(static_cast<int>(pendingCamCommand));
  Serial.print(" (");
  Serial.print(pulseMs);
  Serial.println(" ms)");

  digitalWrite(PIN_CAM_SIGNAL, HIGH);
  delay(pulseMs);
  digitalWrite(PIN_CAM_SIGNAL, LOW);

  if (pendingCamCommand == CAM_CMD_STREAM_START) {
    cameraStreaming = true;
  } else if (pendingCamCommand == CAM_CMD_STREAM_STOP) {
    cameraStreaming = false;
    cameraForceOn = false;
    holdCameraFor(5000);
  }

  pendingCamCommand = CAM_CMD_NONE;
}

void processCameraPowerPolicy() {
  if (!cameraPowered) {
    return;
  }

  if (cameraForceOn || cameraStreaming || pendingCamCommand != CAM_CMD_NONE) {
    return;
  }

  if (millis() > cameraKeepAliveUntil) {
    setCameraPower(false);
    Serial.println("[CAM] Power auto-off (idle timeout).");
  }
}

// ===== Incident queue =====
bool enqueueIncident(const IncidentEvent& event) {
  if (incidentCount >= INCIDENT_QUEUE_SIZE) {
    // Drop oldest to keep latest crash event.
    popIncident();
    Serial.println("[INCIDENT] Queue full, dropped oldest event.");
  }

  incidentQueue[incidentTail] = event;
  incidentTail = static_cast<uint8_t>((incidentTail + 1) % INCIDENT_QUEUE_SIZE);
  ++incidentCount;
  return true;
}

IncidentEvent* peekIncident() {
  if (incidentCount == 0) {
    return nullptr;
  }
  return &incidentQueue[incidentHead];
}

void popIncident() {
  if (incidentCount == 0) {
    return;
  }
  incidentHead = static_cast<uint8_t>((incidentHead + 1) % INCIDENT_QUEUE_SIZE);
  --incidentCount;
}

String newMessageId(const char* prefix) {
  const uint32_t nowS = static_cast<uint32_t>(nowEpoch());
  const uint32_t rnd = esp_random();
  String id = String(prefix) + "-" + String(nowS) + "-" + String(rnd, HEX);
  id.toUpperCase();
  return id;
}

String estimateImpactDirection() {
  const float ax = fabsf(accelX);
  const float ay = fabsf(accelY);
  const float az = fabsf(accelZ);

  if (ax >= ay && ax >= az) {
    return (accelX >= 0.0f) ? "FRONT" : "REAR";
  }
  if (ay >= az) {
    return (accelY >= 0.0f) ? "LEFT" : "RIGHT";
  }
  return "ROLLOVER";
}

void raiseIncident(bool manual, bool isFreeFall, bool isBrakeFail) {
  const unsigned long nowMs = millis();
  if (nowMs - lastIncidentRaisedAt < INCIDENT_COOLDOWN_MS) {
    return;
  }

  IncidentEvent event;
  memset(&event, 0, sizeof(event));

  event.manualTrigger = manual;
  event.isFreeFall = isFreeFall;
  event.isBrakeFail = isBrakeFail;
  event.airbagsDeployed = false;  // Replace when airbag sensor is wired.
  event.speedKmph = currentSpeed;
  event.impactForce = totalG;
  event.epoch = static_cast<uint32_t>(nowEpoch());
  event.attempts = 0;
  event.nextAttemptAt = nowMs;

  if (gpsValid) {
    event.hasLocation = true;
    event.lat = currentLat;
    event.lon = currentLon;
  }

  const String direction = estimateImpactDirection();
  strncpy(event.impactDirection, direction.c_str(), sizeof(event.impactDirection) - 1);
  event.impactDirection[sizeof(event.impactDirection) - 1] = '\0';

  const String msgId = newMessageId("INC");
  strncpy(event.messageId, msgId.c_str(), sizeof(event.messageId) - 1);
  event.messageId[sizeof(event.messageId) - 1] = '\0';

  enqueueIncident(event);
  lastIncidentRaisedAt = nowMs;

  // Power on CAM and trigger image capture path.
  queueCameraCommand(CAM_CMD_CAPTURE);

  // Audible warning.
  startBuzzerPattern(3, 130, 130);

  digitalWrite(PIN_LED_INCIDENT, HIGH);
  Serial.print("[INCIDENT] Queued event ");
  Serial.print(event.messageId);
  Serial.print(" | impact=");
  Serial.print(event.impactForce, 2);
  Serial.print("g | direction=");
  Serial.println(event.impactDirection);
}

void processIncidentQueue() {
  IncidentEvent* event = peekIncident();
  if (event == nullptr) {
    digitalWrite(PIN_LED_INCIDENT, LOW);
    return;
  }

  digitalWrite(PIN_LED_INCIDENT, HIGH);

  if (millis() < event->nextAttemptAt) {
    return;
  }

  if (!wifiConnected) {
    event->nextAttemptAt = millis() + 3000;
    return;
  }

  if (sendIncidentData(*event)) {
    Serial.print("[INCIDENT] Sent OK: ");
    Serial.println(event->messageId);
    popIncident();
    return;
  }

  event->attempts++;
  if (event->attempts >= INCIDENT_MAX_ATTEMPTS) {
    Serial.print("[INCIDENT] Dropping after retries: ");
    Serial.println(event->messageId);
    popIncident();
    return;
  }

  uint32_t backoff = INCIDENT_RETRY_BASE_MS;
  const uint8_t shift = event->attempts > 5 ? 5 : event->attempts;
  backoff <<= shift;
  if (backoff > INCIDENT_RETRY_MAX_MS) {
    backoff = INCIDENT_RETRY_MAX_MS;
  }
  event->nextAttemptAt = millis() + backoff;

  Serial.print("[INCIDENT] Retry scheduled in ");
  Serial.print(backoff);
  Serial.println(" ms");
}

// ===== Backend calls =====
bool postJson(const String& path, const String& body, int& httpCode, String* responseOut) {
  HTTPClient http;
  const String url = String(SERVER_URL) + path;

  if (!http.begin(url)) {
    Serial.println("[HTTP] begin() failed");
    httpCode = -1;
    return false;
  }

  http.setTimeout(HTTP_TIMEOUT_MS);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-key", API_KEY);

  httpCode = http.POST(body);

  if (httpCode > 0 && responseOut != nullptr) {
    *responseOut = http.getString();
  }

  if (httpCode <= 0) {
    Serial.print("[HTTP] Error: ");
    Serial.println(http.errorToString(httpCode));
  }

  http.end();
  return (httpCode > 0);
}

bool sendHeartbeat() {
  if (!wifiConnected) {
    return false;
  }

  StaticJsonDocument<320> doc;
  doc["senderTimestamp"] = nowIso();
  doc["batteryLevel"] = 100;  // Replace with ADC battery measurement if available.
  doc["firmwareVersion"] = FIRMWARE_VERSION;
  doc["messageId"] = newMessageId("HB");

  if (gpsValid) {
    JsonObject gpsObj = doc.createNestedObject("gps");
    gpsObj["lat"] = currentLat;
    gpsObj["lon"] = currentLon;
  }

  String body;
  serializeJson(doc, body);

  int code = 0;
  if (!postJson("/api/devices/" + String(DEVICE_ID) + "/heartbeat", body, code, nullptr)) {
    return false;
  }

  Serial.print("[HEARTBEAT] HTTP ");
  Serial.println(code);
  return (code == 200);
}

bool sendIncidentData(const IncidentEvent& event) {
  StaticJsonDocument<512> doc;

  doc["messageId"] = event.messageId;
  doc["senderTimestamp"] = epochToIso(event.epoch);
  if (event.hasLocation) {
    JsonObject loc = doc.createNestedObject("location");
    loc["lat"] = event.lat;
    loc["lon"] = event.lon;
  }

  // Keep speed always present so backend classifies this as data-side report.
  doc["speed"] = event.speedKmph;
  doc["impactForce"] = event.impactForce;
  doc["impactDirection"] = event.impactDirection;
  doc["airbagsDeployed"] = event.airbagsDeployed;
  doc["isBreakFail"] = event.isBrakeFail;
  doc["isFreeFall"] = event.isFreeFall;
  doc["connectivityUsed"] = "INTERNET";

  String body;
  serializeJson(doc, body);

  String response;
  int code = 0;
  if (!postJson("/api/devices/" + String(DEVICE_ID) + "/incident", body, code, &response)) {
    return false;
  }

  Serial.print("[INCIDENT] HTTP ");
  Serial.println(code);
  if (response.length() > 0) {
    Serial.println(response);
  }
  return (code == 200 || code == 201);
}

// ===== Live access helpers =====
bool sendLiveAccessAck(const String& requestId) {
  StaticJsonDocument<192> doc;
  doc["requestId"] = requestId;
  doc["senderTimestamp"] = nowIso();

  String body;
  serializeJson(doc, body);

  int code = 0;
  if (!postJson("/api/devices/" + String(DEVICE_ID) + "/live-access/ack", body, code, nullptr)) {
    return false;
  }

  return (code == 200);
}

bool sendLiveAccessCancel(const String& requestId, const String& reason) {
  StaticJsonDocument<256> doc;
  doc["requestId"] = requestId;
  doc["senderTimestamp"] = nowIso();
  doc["reason"] = reason;
  doc["messageId"] = newMessageId("LAC");

  String body;
  serializeJson(doc, body);

  int code = 0;
  if (!postJson("/api/devices/" + String(DEVICE_ID) + "/live-access/cancel", body, code, nullptr)) {
    return false;
  }

  return (code == 200);
}

// Call this from Socket.IO integration when a live request arrives.
void onLiveAccessRequest(const String& requestId, const String& authorityName) {
  Serial.print("[LIVE] Request from ");
  Serial.print(authorityName);
  Serial.print(" | requestId=");
  Serial.println(requestId);

  activeLiveRequestId = requestId;

  if (sendLiveAccessAck(requestId)) {
    Serial.println("[LIVE] ACK sent.");
  } else {
    Serial.println("[LIVE] ACK failed.");
  }

  queueCameraCommand(CAM_CMD_STREAM_START);
}

// ===== Console =====
static bool parseChannelMask(const String& name, uint8_t& maskOut) {
  if (name == "MPU") {
    maskOut = SR_MASK_MPU;
    return true;
  }
  if (name == "GPS") {
    maskOut = SR_MASK_GPS;
    return true;
  }
  if (name == "TFT") {
    maskOut = SR_MASK_TFT;
    return true;
  }
  if (name == "SIM") {
    maskOut = SR_MASK_SIM;
    return true;
  }
  if (name == "BUZZER") {
    maskOut = SR_MASK_BUZZER;
    return true;
  }
  if (name == "CAM") {
    maskOut = SR_MASK_CAM;
    return true;
  }
  if (name == "ALL") {
    maskOut = (SR_MASK_MPU | SR_MASK_GPS | SR_MASK_TFT | SR_MASK_SIM | SR_MASK_BUZZER | SR_MASK_CAM);
    return true;
  }
  return false;
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

  if (cmd == "STATUS") {
    printStatus();
    return;
  }

  if (cmd == "INCIDENT") {
    raiseIncident(true, false, false);
    return;
  }

  if (cmd == "STREAM START") {
    queueCameraCommand(CAM_CMD_STREAM_START);
    return;
  }

  if (cmd == "STREAM STOP") {
    queueCameraCommand(CAM_CMD_STREAM_STOP);
    return;
  }

  if (cmd.startsWith("LIVE ")) {
    String requestId = cmd.substring(5);
    requestId.trim();
    if (requestId.length() > 0) {
      onLiveAccessRequest(requestId, "SIMULATED_AUTHORITY");
    }
    return;
  }

  if (cmd == "CANCEL") {
    if (activeLiveRequestId.length() == 0) {
      Serial.println("[LIVE] No active request id.");
      return;
    }
    if (sendLiveAccessCancel(activeLiveRequestId, "Console cancel")) {
      queueCameraCommand(CAM_CMD_STREAM_STOP);
      activeLiveRequestId = "";
    }
    return;
  }

  if (cmd.startsWith("POWER ")) {
    // POWER <CHANNEL> <ON|OFF>
    const int first = cmd.indexOf(' ');
    const int second = cmd.indexOf(' ', first + 1);
    if (second < 0) {
      Serial.println("[CMD] Use: POWER <MPU|GPS|TFT|SIM|BUZZER|CAM|ALL> <ON|OFF>");
      return;
    }

    String channel = cmd.substring(first + 1, second);
    String state = cmd.substring(second + 1);
    channel.trim();
    state.trim();

    uint8_t mask = 0;
    if (!parseChannelMask(channel, mask)) {
      Serial.println("[CMD] Unknown channel.");
      return;
    }

    if (state == "ON") {
      setPowerMask(mask, true);
      if (mask & SR_MASK_CAM) {
        cameraPowered = true;
        holdCameraFor(CAMERA_KEEP_ALIVE_MS);
      }
      Serial.println("[CMD] Power set ON.");
      return;
    }
    if (state == "OFF") {
      setPowerMask(mask, false);
      if (mask & SR_MASK_CAM) {
        cameraPowered = false;
        cameraStreaming = false;
        cameraForceOn = false;
      }
      Serial.println("[CMD] Power set OFF.");
      return;
    }

    Serial.println("[CMD] State must be ON or OFF.");
    return;
  }

  Serial.println("[CMD] Unknown command.");
}

void printStatus() {
  Serial.println("----- STATUS -----");
  Serial.print("WiFi: ");
  Serial.println(wifiConnected ? "CONNECTED" : "DISCONNECTED");
  if (wifiConnected) {
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  }

  Serial.print("Time: ");
  Serial.println(nowIso());

  Serial.print("GPS valid: ");
  Serial.println(gpsValid ? "YES" : "NO");
  if (gpsValid) {
    Serial.print("GPS lat/lon: ");
    Serial.print(currentLat, 6);
    Serial.print(", ");
    Serial.println(currentLon, 6);
  }

  Serial.print("Accel G (raw/filtered): ");
  Serial.print(totalG, 3);
  Serial.print(" / ");
  Serial.println(filteredG, 3);

  Serial.print("Queue depth: ");
  Serial.println(incidentCount);

  Serial.print("SR state (logical bits): 0b");
  for (int i = 7; i >= 0; --i) {
    Serial.print((srLogicalState >> i) & 0x01);
  }
  Serial.println();

  Serial.print("Camera powered/streaming: ");
  Serial.print(cameraPowered ? "ON" : "OFF");
  Serial.print(" / ");
  Serial.println(cameraStreaming ? "ON" : "OFF");

  Serial.println("------------------");
}
