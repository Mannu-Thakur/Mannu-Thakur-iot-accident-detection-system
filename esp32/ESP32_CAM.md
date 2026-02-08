# ESP32-CAM Camera Module Documentation

The ESP32-CAM handles image capture and live video streaming for the Perseva vehicle safety device. It receives commands from ESP32-DEV via GPIO and communicates with the server via HTTP/WebSocket.

## Hardware Requirements

| Component | Description |
|-----------|-------------|
| ESP32-CAM (AI-Thinker) | Camera module with OV2640 |
| FTDI Programmer | For uploading code (3.3V) |
| Wire | Connection to ESP32-DEV |

## Wiring Diagram

### Connection to ESP32-DEV

```
ESP32-CAM                    ESP32-DEV
┌─────────────────┐          ┌─────────────────┐
│         GPIO 13 ├──────────┤ GPIO 27         │
│             GND ├──────────┤ GND             │
└─────────────────┘          └─────────────────┘
```

### Programming Connection (FTDI)

```
ESP32-CAM                    FTDI
┌─────────────────┐          ┌─────────────────┐
│             U0R ├──────────┤ TX              │
│             U0T ├──────────┤ RX              │
│             GND ├──────────┤ GND             │
│             5V  ├──────────┤ VCC (5V)        │
│         GPIO 0  ├──────────┤ GND (for flash) │
└─────────────────┘          └─────────────────┘

Note: Connect GPIO 0 to GND only during upload. Remove after flashing.
```

## Pin Configuration

| GPIO | Function | Description |
|------|----------|-------------|
| 0 | XCLK | Camera clock |
| 4 | LED_FLASH | Flash LED (built-in) |
| 5 | Y2 | Camera data |
| 13 | DEV_SIGNAL | Signal input from DEV |
| 18-19, 21 | Y3-Y5 | Camera data |
| 22 | PCLK | Pixel clock |
| 23 | HREF | Horizontal reference |
| 25 | VSYNC | Vertical sync |
| 26-27 | SIOD/SIOC | I2C for camera sensor |
| 32 | PWDN | Camera power down |
| 33 | LED_STATUS | Status LED |
| 34-36, 39 | Y6-Y9 | Camera data |

## Signal Protocol from DEV

Interrupt-based detection of GPIO pulses:
- **150-300ms HIGH pulse**: Capture and upload image
- **400-600ms HIGH pulse**: Start live streaming

## Configuration

Edit these constants in `ESP32_CAM.ino`:

```cpp
const char* WIFI_SSID = "YOUR_WIFI_SSID";         // Same as DEV
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL = "http://YOUR_SERVER_IP:3000";
const char* WS_SERVER = "YOUR_SERVER_IP";
const int WS_PORT = 3000;
const char* DEVICE_ID = "YOUR_DEVICE_ID";
const char* API_KEY = "YOUR_API_KEY";
```

## Camera Resolution Modes

| Mode | Resolution | Usage |
|------|------------|-------|
| UXGA | 1600x1200 | Incident capture (high quality) |
| VGA | 640x480 | Live streaming (10 FPS) |

## LED Indicators

| LED | State | Meaning |
|-----|-------|---------|
| Flash | Brief flash | Image captured |
| Status | 2 blinks | Upload successful |
| Status | 5 rapid blinks | Upload failed |
| Status | 3 blinks | Streaming started |

## Dependencies

Install via Arduino Library Manager:
- `ArduinoJson` - JSON handling
- `WebSockets` by Markus Sattler - WebSocket client

## Board Configuration

1. **Board**: AI-Thinker ESP32-CAM
2. **Partition Scheme**: Huge APP (3MB No OTA/1MB SPIFFS)
3. **PSRAM**: Enabled

## Upload Instructions

1. Connect FTDI programmer
2. Connect GPIO 0 to GND
3. Press reset button on ESP32-CAM
4. Click Upload in Arduino IDE
5. Wait for upload to complete
6. Disconnect GPIO 0 from GND
7. Press reset to run

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Camera init failed (0x20001) | Check power supply, try external 5V |
| Camera init failed (0x105) | Verify camera ribbon cable connection |
| brownout detector triggered | Use better power supply (5V/1A min) |
| Image upload timeout | Check server URL and network |
| No signal detected | Verify GPIO 13 connection to DEV GPIO 27 |
| WebSocket won't connect | Check WS_SERVER IP and port |

## Power Requirements

The ESP32-CAM requires stable 5V power (minimum 500mA, recommended 1A):
- Camera capture: ~300mA peak
- WiFi transmission: ~200mA peak
- Combined: Can spike to 500mA+

> **Warning**: Insufficient power causes brownout resets and camera failures.
