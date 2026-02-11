/**
 * Perseva - ESP32 CAM Module Firmware
 * 
 * Responsibilities:
 * 1. Wait for Trigger Signal (GPIO Interrupt) from Dev Module
 * 2. Capture Image using OV2640
 * 3. Upload Image to Server via HTTP POST
 * 
 * Logic:
 * - Deep Sleep or Loop waiting for Pin HIGH.
 * - On HIGH -> Camera Capture -> WiFi Connect (if not on) -> Upload -> Wait
 */

#include "esp_camera.h"
#include <WiFi.h>
#include "esp_http_client.h"

// --- CONFIGURATION ---
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASS";
const char* API_BASE_URL = "http://YOUR_SERVER_IP:3000/api/devices";
const char* DEVICE_ID = "YOUR_DEVICE_ID"; 
const char* API_KEY = "YOUR_API_KEY"; // Same key as Dev or distinct? Usually same if logically one device.

const int TRIG_PIN = 12; // Input PIN from Dev Module

// Camera Pins (AI THINKER Model)
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

void setup() {
  Serial.begin(115200);
  
  pinMode(TRIG_PIN, INPUT_PULLDOWN);

  // Camera Config
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
  config.frame_size = FRAMESIZE_VGA;
  config.jpeg_quality = 12;
  config.fb_count = 1;

  if (esp_camera_init(&config) != ESP_OK) {
    Serial.println("Camera Init Failed");
    return;
  }

  // WiFi Setup
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected");
}

void loop() {
  // Check Trigger
  if (digitalRead(TRIG_PIN) == HIGH) {
    Serial.println("Trigger Received! Capturing...");
    captureAndUpload();
    delay(2000); // Debounce
  }
  delay(10);
}

void captureAndUpload() {
  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera Capture Failed");
    return;
  }

  Serial.printf("Picture taken! Size: %d bytes\n", fb->len);

  // Upload
  if (WiFi.status() == WL_CONNECTED) {
    String url = String(API_BASE_URL) + "/" + DEVICE_ID + "/incident";
    
    esp_http_client_config_t config = {
      .url = url.c_str(),
    };
    esp_http_client_handle_t client = esp_http_client_init(&config);
    
    // Headers
    esp_http_client_set_header(client, "x-device-key", API_KEY);
    esp_http_client_set_header(client, "Content-Type", "multipart/form-data; boundary=Esp32Boundary");

    // Body Construction (Manual Multipart)
    String head = "--Esp32Boundary\r\nContent-Disposition: form-data; name=\"image\"; filename=\"capture.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n";
    String tail = "\r\n--Esp32Boundary--\r\n";

    uint32_t totalLen = head.length() + fb->len + tail.length();
    
    // This is a simplified way to send data. 
    // In production, better to use esp_http_client_open -> write -> close workflow.
    
    esp_http_client_open(client, totalLen);
    esp_http_client_write(client, head.c_str(), head.length());
    esp_http_client_write(client, (const char *)fb->buf, fb->len);
    esp_http_client_write(client, tail.c_str(), tail.length());
    
    int content_length = esp_http_client_fetch_headers(client);
    int status_code = esp_http_client_get_status_code(client);
    
    Serial.printf("Upload Status: %d\n", status_code);
    
    esp_http_client_close(client);
    esp_http_client_cleanup(client);
  }
  
  esp_camera_fb_return(fb);
}
