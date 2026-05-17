#include "mqtt_client.h"
#include <WiFiS3.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// --- 사용자 설정 ---
const char *ssid = "YOUR_WIFI_SSID";
const char *password = "YOUR_WIFI_PASSWORD";

const char *mqtt_server = "your-hivemq-cluster-url.hivemq.cloud";
const int mqtt_port = 8883; // HiveMQ Cloud 사용 시 8883, 로컬이면 1883
const char *mqtt_user = "your-hivemq-username";
const char *mqtt_pass = "your-hivemq-password";

const char *device_id = "uno-r4-main";
// ------------------

WiFiSSLClient espClient; // 8883 포트 통신을 위한 SSL 클라이언트 (로컬이면 WiFiClient)
PubSubClient client(espClient);

ActuatorState currentActuatorState;

// MQTT 메시지 수신 콜백 함수 (웹 -> 기기)
void mqttCallback(char *topic, byte *payload, unsigned int length)
{
    Serial.print("[MQTT] Message arrived [");
    Serial.print(topic);
    Serial.print("] ");

    // Payload를 문자열로 변환
    char msg[length + 1];
    for (unsigned int i = 0; i < length; i++)
    {
        msg[i] = (char)payload[i];
    }
    msg[length] = '\0';
    Serial.println(msg);

    // JSON 파싱 (예: {"actuator": "pump", "state": true})
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, msg);

    if (error)
    {
        Serial.print("[MQTT] JSON parse failed: ");
        Serial.println(error.c_str());
        return;
    }

    const char *actuator = doc["actuator"];
    bool state = doc["state"];

    if (strcmp(actuator, "led") == 0)
        currentActuatorState.led_on = state;
    else if (strcmp(actuator, "fan") == 0)
        currentActuatorState.fan_on = state;
    else if (strcmp(actuator, "pump") == 0)
        currentActuatorState.pump_on = state;

    // 실제 하드웨어 제어 업데이트
    updateActuators(currentActuatorState);

    // 제어 후 변경된 상태를 Broker에 다시 퍼블리시
    publishActuatorState();
}

void setupWiFi()
{
    Serial.print("[WiFi] Connecting to ");
    Serial.println(ssid);
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED)
    {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\n[WiFi] Connected. IP: ");
    Serial.println(WiFi.localIP());
}

void reconnectMQTT()
{
    while (!client.connected())
    {
        Serial.print("[MQTT] Attempting connection...");
        String clientId = "ArduinoClient-" + String(random(0xffff), HEX);

        if (client.connect(clientId.c_str(), mqtt_user, mqtt_pass))
        {
            Serial.println("connected!");
            // 제어 명령 토픽 구독 (topics.md 기준)
            String controlTopic = String("smartfarm/") + device_id + "/actuators/control";
            client.subscribe(controlTopic.c_str());
        }
        else
        {
            Serial.print("failed, rc=");
            Serial.print(client.state());
            Serial.println(" try again in 5 seconds");
            delay(5000);
        }
    }
}

void setupMQTT()
{
    client.setServer(mqtt_server, mqtt_port);
    client.setCallback(mqttCallback);
}

void loopMQTT()
{
    if (!client.connected())
        reconnectMQTT();
    client.loop();
}

void publishSensorData(SensorData data)
{
    StaticJsonDocument<200> doc;
    doc["temperature"] = data.temperature;
    doc["humidity"] = data.humidity;
    doc["soil_moisture"] = data.soil_moisture;
    doc["light_intensity"] = data.light_intensity;

    char buffer[256];
    serializeJson(doc, buffer);
    String topic = String("smartfarm/") + device_id + "/sensors";
    client.publish(topic.c_str(), buffer);
}

void publishActuatorState()
{
    StaticJsonDocument<200> doc;
    doc["led_on"] = currentActuatorState.led_on;
    doc["fan_on"] = currentActuatorState.fan_on;
    doc["pump_on"] = currentActuatorState.pump_on;

    char buffer[256];
    serializeJson(doc, buffer);
    String topic = String("smartfarm/") + device_id + "/actuators/state";
    client.publish(topic.c_str(), buffer);
}