#ifndef SENSORS_H
#define SENSORS_H

// MQTT를 통해 JSON으로 전송될 센서 데이터 구조체
// 이 구조체의 필드 이름(예: "temperature")은 JSON의 키 값과 일치해야 합니다.
struct SensorData
{
    float temperature;
    float humidity;
    float soil_moisture;
    float light_intensity;
};

// 센서 초기화 및 데이터 읽기 함수 선언
void initSensors();
SensorData readSensors();

#endif // SENSORS_H