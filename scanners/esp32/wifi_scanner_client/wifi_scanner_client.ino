#include <WiFi.h>
#include <HTTPClient.h>

// --- 1. WIFI CREDENTIALS ---
const char* ssid     = "Songsing S225"; 
const char* password = "12345678";

// --- 2. SERVER CONFIGURATION ---
// UPDATE THIS TO YOUR LAPTOP IP (Check ipconfig/ifconfig)
String serverIP = "10.211.235.203"; 

// We are using update-sensor to push data to the server.
String serverUrl = "http://" + serverIP + ":5000/update-sensor";

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n\n--- ESP32 WI-FI SIGNAL SCANNER ---");
  
  // 1. HARD RESET WIFI
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
  delay(500);
  WiFi.mode(WIFI_STA);

  WiFi.setSleep(false); 
  
  Serial.printf("Connecting to %s ", ssid);
  
  // 3. BEGIN CONNECTION
  WiFi.begin(ssid, password);
  
  // Wait for connection with timeout
  int attempt = 0;
  while (WiFi.status() != WL_CONNECTED && attempt < 20) {
    delay(500);
    Serial.print(".");
    attempt++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nConnected!");
    Serial.print("ESP32 IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Target Server: ");
    Serial.println(serverUrl);
  } else {
    Serial.println("\nFailed to connect. Check credentials.");
  }
}

void loop() {
  // Only try to send if we are connected to WiFi
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    
    // Start connection
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    
    // Get Signal Strength
    long rssi = WiFi.RSSI();
    
    // Create JSON Payload: {"signal": -55}
    String jsonPayload = "{\"signal\": " + String(rssi) + "}";
    
    // Send POST Request
    int httpResponseCode = http.POST(jsonPayload);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.printf("Sent: %ld dBm | Code: %d | Resp: %s\n", rssi, httpResponseCode, response.c_str());
    } else {
      Serial.printf("Error sending: %d\n", httpResponseCode);
    }
    
    // Close connection
    http.end();
    
  } else {
    Serial.println("WiFi Disconnected. Reconnecting...");
    WiFi.reconnect();
  }
  
  // Send data every 2 seconds
  delay(2000); 
}