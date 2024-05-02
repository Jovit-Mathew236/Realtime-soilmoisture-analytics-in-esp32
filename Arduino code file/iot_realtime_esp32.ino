#include <Arduino.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>

//Provide the token generation process info.
#include "addons/TokenHelper.h"
//Provide the RTDB payload printing info and other helper functions.
#include "addons/RTDBHelper.h"

const char* ssid = "wifi";
const char* password = "ashin123";
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

void setup() {
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
  if (Firebase.ready() && signupOK && (currentMillis - sendDataPrevMillis > 1000 || sendDataPrevMillis == 0)) {
    sendDataPrevMillis = currentMillis;

    int sensor_analog = analogRead(soilPin);
    Serial.print("Raw Analog Reading: ");
    float moisturePercentage = (100.0 - ((float)sensor_analog / 4095.0) * 100.0);
    Serial.println(moisturePercentage);

    if (Firebase.RTDB.setFloat(&fbdo, "moisturePercentage", moisturePercentage)) {
      Serial.println("PASSED: Moisture Percentage");
      Serial.println("PATH: " + fbdo.dataPath());
      Serial.println("TYPE: " + fbdo.dataType());
    } else {
      Serial.println("FAILED: Moisture Percentage");
      Serial.println("REASON: " + fbdo.errorReason());
    }

    if (Firebase.RTDB.setInt(&fbdo, "ledCount", ledCount)) {
      Serial.println("PASSED: LED Count");
      Serial.println("PATH: " + fbdo.dataPath());
      Serial.println("TYPE: " + fbdo.dataType());
    } else {
      Serial.println("FAILED: LED Count");
      Serial.println("REASON: " + fbdo.errorReason());
    }

    if (moisturePercentage > 10.0 && !ledOn) {
      digitalWrite(ledPin, HIGH); // Turn on LED if moisture is greater than 50%
      ledCount++; // Increment LED count
      ledOn = true; // Set LED state flag
    } else if (moisturePercentage < 5.0 && ledOn) {
      digitalWrite(ledPin, LOW);  // Turn off LED if moisture is not greater than 50%
      ledOn = false; // Reset LED state flag
    }
  }
}
