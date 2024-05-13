#include <Arduino.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <TimeLib.h>

#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

const char* ssid = "VALIAMANGALAM-4G";
const char* password = "mathew1112";

#define DATABASE_URL "iot-soil-moisture-a01d1-default-rtdb.asia-southeast1.firebasedatabase.app"
#define API_KEY "AIzaSyDm_4T2Ipv4CJio1sx1-iXlKbmgr-QqB4I"

const char* USER_EMAIL = "example@gmail.com";
const char* USER_PASSWORD = "123456";

const int soilPin = A0; // Define GPIO pin 15 for analog input (ADC channel A3)
const int ledPin = 15;   // GPIO pin number for relay control
int ledCount = 0;       // Counter for LED activations
bool ledOn = false;     // Flag to track LED state
const int MAX_READINGS = 5; // Maximum number of moisture readings to store per month
float moistureReadings[MAX_READINGS]; // Array to store moisture readings

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
unsigned long sendDataPrevMillis = 0;
int count = 0;
bool signupOK = false;

void setTime() {
  configTime(0, 0, "pool.ntp.org"); // Set the time zone and NTP server
  while (!time(nullptr)) { // Wait until time is set
    delay(1000);
  }
}

void setup() {
  setTime(); // Set the current time
  pinMode(ledPin, OUTPUT);
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  Serial.println();
  Serial.print("Connected with IP: ");
  Serial.println(WiFi.localIP());
  Serial.println();

  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println("ok");
    signupOK = true;
  } else {
    Serial.printf("%s\n", config.signer.signupError.message.c_str());
  }

  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;

  config.token_status_callback = tokenStatusCallback; //see addons/TokenHelper.h
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void loop() {
  unsigned long currentMillis = millis(); // Declare currentMillis variable
  if (Firebase.ready() && signupOK && (currentMillis - sendDataPrevMillis > 10000 || sendDataPrevMillis == 0)) {
    sendDataPrevMillis = currentMillis;

    int sensor_analog = analogRead(soilPin);
    Serial.print("Raw Analog Reading: ");
    float moisturePercentage = (100.0 - ((float)sensor_analog / 4095.0) * 100.0);
    Serial.println(moisturePercentage);

    // Get current time
    time_t now = time(nullptr);
    struct tm timeinfo;
    localtime_r(&now, &timeinfo);

    // Build the path with year and month
 

    // Turn LED on/off based on moisture level
    if (moisturePercentage > 10.0 && !ledOn) {
      digitalWrite(ledPin, HIGH);
      ledOn = true;
      ledCount++; // Increment LED count
    } else if (moisturePercentage < 5.0 && ledOn) {
      digitalWrite(ledPin, LOW);
      ledOn = false;
    }


   char path[50];
   sprintf(path, "/", timeinfo.tm_year + 1900, monthShortStr(timeinfo.tm_mon + 1));

    // Send moisture percentage to Firebase
    if (Firebase.RTDB.setFloat(&fbdo, String(path) + "moisturePercentage", moisturePercentage) && Firebase.RTDB.setFloat(&fbdo, String(path) + "MotorON", ledCount)) {
      Serial.println("PASSED: Moisture Percentage");
    } else {
      Serial.println("FAILED: Moisture Percentage");
      Serial.println("REASON: " + fbdo.errorReason());
    }
    // Store data in the 'data' document as a map
    char dataPath[50];
    sprintf(dataPath, "/data/%04d/%s", timeinfo.tm_year + 1900, monthShortStr(timeinfo.tm_mon + 1));
    FirebaseJson json;
    json.add("MotorON", ledCount);
    json.add("averageMositure", moisturePercentage);
    json.add("date", String(timeinfo.tm_mday) + "-" + monthShortStr(timeinfo.tm_mon + 1) + "-" + String(timeinfo.tm_year + 1900));
    if (Firebase.RTDB.setJSON(&fbdo, dataPath, &json)) {
      Serial.println("Data stored in 'data' document");
    } else {
      Serial.println("Failed to store data in 'data' document");
    }

   

  }
}


