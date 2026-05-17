#include "sensors.h"
#include "actuators.h"
#include "mqtt_client.h"

unsigned long lastMsgTime = 0;
const long publishInterval = 10000; // 10초 주기

void setup()
{
    Serial.begin(115200);
    while (!Serial)
    {
        ;
    } // 시리얼 포트 대기

    initSensors();
    initActuators();

    setupWiFi();
    setupMQTT();
}

void loop()
{
    loopMQTT(); // MQTT 수신 및 연결 유지

    unsigned long now = millis();
    if (now - lastMsgTime > publishInterval)
    {
        lastMsgTime = now;
        SensorData data = readSensors();
        publishSensorData(data); // 10초마다 센서 데이터 발행
    }
}