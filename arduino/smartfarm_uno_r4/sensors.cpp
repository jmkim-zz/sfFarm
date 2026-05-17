#include "sensors.h"
#include <Arduino.h>
#include <DHT.h>

// hardware.md에 정의된 핀 번호 할당
#define DHT_PIN 2
#define DHT_TYPE DHT22 // DHT11 사용 시 DHT11로 변경
#define SOIL_PIN A0
#define LDR_PIN A1

DHT dht(DHT_PIN, DHT_TYPE);

void initSensors()
{
    dht.begin();
    pinMode(SOIL_PIN, INPUT);
    pinMode(LDR_PIN, INPUT);
    Serial.println("[Sensors] Initialized DHT22, Soil, and LDR sensors.");
}

SensorData readSensors()
{
    SensorData data;

    // DHT 센서 온습도 읽기
    data.temperature = dht.readTemperature();
    data.humidity = dht.readHumidity();

    // 읽기 실패 시 NaN(Not a Number) 처리
    if (isnan(data.temperature))
        data.temperature = 0.0;
    if (isnan(data.humidity))
        data.humidity = 0.0;

    // 토양 수분 값 읽기 (0~1023 -> 0~100% 매핑)
    // 주의: 실제 센서 특성에 따라 역방향 매핑(1023 -> 0%)이 필요할 수 있습니다.
    int soilRaw = analogRead(SOIL_PIN);
    data.soil_moisture = map(soilRaw, 1023, 0, 0, 100);

    // 조도 센서 값 읽기 (직관적인 0~1000 단위로 사용)
    int ldrRaw = analogRead(LDR_PIN);
    data.light_intensity = (float)ldrRaw;

    return data;
}