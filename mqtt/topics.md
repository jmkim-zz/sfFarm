# MQTT Topic Structure

이 문서는 스마트팜 프로젝트의 모든 구성 요소 간 통신에 사용되는 MQTT 토픽 구조를 정의합니다.

`{device_id}`는 각 하드웨어 장치를 식별하는 고유한 ID입니다. (예: `uno-r4-main`)

## 1. 센서 데이터 발행 (Device → Broker)

- **Topic:** `smartfarm/{device_id}/sensors`
- **Direction:** Arduino → MQTT Broker → MQTT Service
- **Payload:** `SensorData` 구조체에 해당하는 JSON 객체. (예: `{"temperature": 25.5, "humidity": 60.1, ...}`)
- **Description:** 아두이노가 주기적으로 센서 데이터를 측정하여 이 토픽으로 발행합니다.

## 2. 액추에이터 제어 명령 (Web → Device)

- **Topic:** `smartfarm/{device_id}/actuators/control`
- **Direction:** Next.js Web App → MQTT Broker → Arduino
- **Payload:** 제어할 액추에이터와 상태를 담은 JSON 객체. (예: `{"actuator": "pump", "state": true}`)
- **Description:** 사용자가 웹 대시보드에서 액추에이터를 제어할 때 사용됩니다.
