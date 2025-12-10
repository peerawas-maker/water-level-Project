#include <ESP8266WiFi.h>
#include <PubSubClient.h>

/* ===== Wi-Fi ===== */
const char* ssid     = "Chetaoy_2.4GHz";
const char* password = "73918470";

/* ===== MQTT ===== */
const char* mqtt_server = "broker.emqx.io";
const int   mqtt_port   = 1883;
const char* topic_pub   = "peerawas/demo/water";

WiFiClient espClient;
PubSubClient client(espClient);

/* ===== State Machine ===== */
const int CONNECT_STATUS = 0;
const int SAVE_DATA = 1;
const int CHECK_DATA = 2;
const int SEND_DATA = 3;
int state = CONNECT_STATUS;

/* ===== Sensor Pin ===== */
#define TRIG_PIN D5
#define ECHO_PIN D6

/* ===== Buzzer ===== */
#define BUZZER_PIN D2
#define BUZZER_ACTIVE_LOW true

/* ===== Tank Config ===== */
const float TANK_DEPTH_CM    = 16.0;
const float SENSOR_TO_MAX_CM = 3.0;
const float LOW_PERCENT  = 15.0;
const float HIGH_PERCENT = 95.0;

/* ===== Buzzer Timing ===== */
const unsigned long BEEP_ON_MS  = 200;
const unsigned long BEEP_OFF_MS = 300;
bool buzzerShouldBeep = false;
bool buzzerIsOn = false;
unsigned long lastBeepToggle = 0;

/* ===== Data Variables ===== */
float dist = NAN;
float level_cm = 0;
float percent = 0;
unsigned long lastSend = 0;

/* ===== Setup WiFi ===== */
void setup_wifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi ");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi connected");
  Serial.print("IP: "); Serial.println(WiFi.localIP());
}

/* ===== Reconnect MQTT ===== */
void reconnect() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT...");
    String cid = "esp8266-" + String(ESP.getChipId(), HEX);
    if (client.connect(cid.c_str())) {
      Serial.println("✅ Connected to MQTT broker");
    } else {
      Serial.print("❌ rc="); Serial.print(client.state());
      Serial.println(" retry in 2s");
      delay(2000);
    }
  }
}

/* ===== Sensor ===== */
const unsigned long PULSE_TIMEOUT_US = 30000;
const int SAMPLES = 5;

float measureOnceCm() {
  digitalWrite(TRIG_PIN, LOW); delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  unsigned long dur = pulseIn(ECHO_PIN, HIGH, PULSE_TIMEOUT_US);
  if (dur == 0) return NAN;
  return (dur * 0.0343f) / 2.0f;
}

float medianOf(float* arr, int n) {
  for (int i = 0; i < n - 1; i++)
    for (int j = i + 1; j < n; j++)
      if (arr[j] < arr[i]) { float t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
  return (n % 2) ? arr[n / 2] : 0.5f * (arr[n / 2 - 1] + arr[n / 2]);
}

float measureDistanceCm() {
  float buf[SAMPLES];
  int k = 0;
  for (int i = 0; i < SAMPLES; i++) {
    float d = measureOnceCm();
    if (!isnan(d)) buf[k++] = d;
    delay(30);
  }
  if (k == 0) return NAN;
  return medianOf(buf, k);
}

/* ===== Convert Distance → Level ===== */
void distanceToLevel(float dist_cm, float& level_cm, float& percent) {
  float dist_full = SENSOR_TO_MAX_CM;
  float dist_empty = SENSOR_TO_MAX_CM + TANK_DEPTH_CM;
  if (dist_cm < dist_full) dist_cm = dist_full;
  if (dist_cm > dist_empty) dist_cm = dist_empty;
  level_cm = TANK_DEPTH_CM - (dist_cm - dist_full);
  percent = (level_cm / TANK_DEPTH_CM) * 100.0f;
}

/* ===== Time Format ===== */
String millisToClock(unsigned long ms) {
  unsigned long s = ms / 1000;
  unsigned int h = s / 3600;
  unsigned int m = (s % 3600) / 60;
  unsigned int ss = s % 60;
  char buf[16];
  snprintf(buf, sizeof(buf), "%02u:%02u:%02u", h, m, ss);
  return String(buf);
}

/* ===== Non-blocking Buzzer ===== */
void updateBuzzerNonBlocking() {
  bool activeState = BUZZER_ACTIVE_LOW ? LOW : HIGH;
  bool idleState   = BUZZER_ACTIVE_LOW ? HIGH : LOW;

  if (!buzzerShouldBeep) {
    if (buzzerIsOn) {
      digitalWrite(BUZZER_PIN, idleState);
      buzzerIsOn = false;
    }
    return;
  }

  unsigned long now = millis();
  if (buzzerIsOn) {
    if (now - lastBeepToggle >= BEEP_ON_MS) {
      digitalWrite(BUZZER_PIN, idleState);
      buzzerIsOn = false;
      lastBeepToggle = now;
    }
  } else {
    if (now - lastBeepToggle >= BEEP_OFF_MS) {
      digitalWrite(BUZZER_PIN, activeState);
      buzzerIsOn = true;
      lastBeepToggle = now;
    }
  }
}

/* ===== Setup ===== */
void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  if (BUZZER_ACTIVE_LOW) digitalWrite(BUZZER_PIN, HIGH);
  else digitalWrite(BUZZER_PIN, LOW);

  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  reconnect();

  Serial.println("เริ่มวัดระดับน้ำด้วย JSN-SR04T...");
  state = SAVE_DATA;  // เริ่มที่การอ่านค่า
}

/* ===== Main Loop ===== */
void loop() {
  switch (state) {

    /* ===== ตรวจสอบการเชื่อมต่อ ===== */
    case CONNECT_STATUS:
      // ถ้า WiFi หลุด ให้ต่อใหม่
      if (WiFi.status() != WL_CONNECTED) {
        Serial.println("🔄 กำลังเชื่อมต่อ WiFi...");
        setup_wifi();
      }

      // ถ้า MQTT หลุด ให้ต่อใหม่
      if (!client.connected()) {
        Serial.println("🔄 กำลังเชื่อมต่อ MQTT...");
        reconnect();
      }

      // เมื่อทั้ง WiFi และ MQTT เชื่อมต่อแล้ว → ไปอ่านค่าเซนเซอร์
      if (WiFi.status() == WL_CONNECTED && client.connected()) {
        Serial.println("✅ WiFi และ MQTT พร้อมใช้งาน");
        state = SAVE_DATA;
      }
      break;

    /* ===== อ่านค่าเซนเซอร์ ===== */
    case SAVE_DATA:
      dist = measureDistanceCm();
      if (isnan(dist)) {
        Serial.println("อ่านระยะไม่ติด (timeout)");
        client.publish(topic_pub, "{\"error\":\"timeout\"}");
        state = CONNECT_STATUS;  // ถ้าอ่านไม่ติด กลับไปตรวจการเชื่อมต่อ
        return;
      }
      state = CHECK_DATA;
      break;

    /* ===== ตรวจสอบระดับน้ำ ===== */
    case CHECK_DATA:
      distanceToLevel(dist, level_cm, percent);
      buzzerShouldBeep = (percent < LOW_PERCENT || percent > HIGH_PERCENT);
      Serial.printf("distance=%.1f cm, level=%.1f cm (%.1f%%)\n",
                    dist, level_cm, percent);
      state = SEND_DATA;
      break;

    /* ===== ส่งข้อมูลผ่าน MQTT ===== */
    case SEND_DATA:
      if (millis() - lastSend >= 2000) {
        lastSend = millis();
        char payload[160];
        String ts = millisToClock(millis());
        snprintf(payload, sizeof(payload),
                 "{\"distance_cm\":%.1f,\"level_cm\":%.1f,\"percent\":%.1f,\"ts\":\"%s\"}",
                 dist, level_cm, percent, ts.c_str());
        client.publish(topic_pub, payload);

        // หลังส่งเสร็จ กลับไปอ่านใหม่ แต่เช็คการเชื่อมต่อก่อน
        state = CONNECT_STATUS;
      }
      break;
  }

  client.loop();
  updateBuzzerNonBlocking();
}
