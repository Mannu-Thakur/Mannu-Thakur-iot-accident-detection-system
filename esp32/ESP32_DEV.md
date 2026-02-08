# ESP32-DEV Device Documentation

The ESP32-DEV is the main controller for the Perseva vehicle safety device. It handles sensor data collection, impact detection, and communication with the server and ESP32-CAM.

## Hardware Requirements

| Component | Description |
|-----------|-------------|
| ESP32 DevKit V1 | Main microcontroller |
| NEO-6M GPS Module | Location tracking |
| MPU6050 | 6-axis accelerometer/gyroscope |
| Push Button | Manual incident trigger |
| LEDs (3x) | Status indicators |
| Wires | Connections |

## Wiring Diagram

```
ESP32-DEV                    ESP32-CAM
┌─────────────────┐          ┌─────────────────┐
│         GPIO 27 ├──────────┤ GPIO 13         │
│             GND ├──────────┤ GND             │
└─────────────────┘          └─────────────────┘

ESP32-DEV                    NEO-6M GPS
┌─────────────────┐          ┌─────────────────┐
│         GPIO 16 ├──────────┤ TX              │
│         GPIO 17 ├──────────┤ RX              │
│             3V3 ├──────────┤ VCC             │
│             GND ├──────────┤ GND             │
└─────────────────┘          └─────────────────┘

ESP32-DEV                    MPU6050
┌─────────────────┐          ┌─────────────────┐
│         GPIO 21 ├──────────┤ SDA             │
│         GPIO 22 ├──────────┤ SCL             │
│             3V3 ├──────────┤ VCC             │
│             GND ├──────────┤ GND             │
└─────────────────┘          └─────────────────┘
```

## Pin Configuration

| GPIO | Function | Description |
|------|----------|-------------|
| 2 | LED_WIFI | WiFi status (built-in) |
| 4 | LED_GPS | GPS status |
| 5 | LED_INCIDENT | Incident status |
| 15 | BUTTON | Manual incident trigger |
| 16 | GPS_RX | GPS module TX |
| 17 | GPS_TX | GPS module RX |
| 21 | I2C_SDA | MPU6050 data |
| 22 | I2C_SCL | MPU6050 clock |
| 27 | CAM_SIGNAL | Signal to ESP32-CAM |

## Signal Protocol to CAM

Single GPIO pin with pulse-duration encoding:
- **200ms HIGH pulse**: Capture and upload incident image
- **500ms HIGH pulse**: Start live streaming

## Configuration

Edit these constants in `ESP32_DEV.ino`:

```cpp
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL = "http://YOUR_SERVER_IP:3000";
const char* DEVICE_ID = "YOUR_DEVICE_ID";  // From admin device creation
const char* API_KEY = "YOUR_API_KEY";       // From admin device creation
```

## Impact Detection Thresholds

| Parameter | Default | Description |
|-----------|---------|-------------|
| IMPACT_THRESHOLD_G | 3.0 G | Minimum G-force for impact |
| FREE_FALL_THRESHOLD_G | 0.3 G | Maximum G-force for free fall |
| FREE_FALL_DURATION_MS | 200 ms | Duration to confirm free fall |

## LED Status Indicators

| LED | State | Meaning |
|-----|-------|---------|
| WiFi | ON | Connected to WiFi |
| WiFi | OFF | Disconnected |
| GPS | ON | Valid GPS fix |
| GPS | OFF | No GPS fix |
| Incident | Blinking | Incident reporting in progress |

## Dependencies

Install via Arduino Library Manager:
- `TinyGPS++` - GPS parsing
- `ArduinoJson` - JSON handling
- `Wire` (built-in) - I2C communication

## Upload Instructions

1. Select board: **ESP32 Dev Module**
2. Set partition scheme: **Default 4MB with spiffs**
3. Connect via USB
4. Upload

## Troubleshooting

| Issue | Solution |
|-------|----------|
| WiFi won't connect | Check credentials, ensure 2.4GHz network |
| GPS no fix | Wait outdoors, check wiring |
| MPU6050 not responding | Check I2C connections, address 0x68 |
| Server connection failed | Verify server URL and network |
