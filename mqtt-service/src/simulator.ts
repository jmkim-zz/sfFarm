import mqtt from 'mqtt';

const DEVICE_ID = process.env.SIMULATOR_DEVICE_ID || 'sim-uno-r4';
const INTERVAL = parseInt(process.env.SIMULATOR_INTERVAL || '10000', 10);

/**
 * 지정된 범위 내의 랜덤 실수값을 생성합니다.
 */
function getRandomFloat(min: number, max: number): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

/**
 * 가상 센서 데이터를 생성하고 MQTT 브로커로 발행합니다.
 * @param client 연결된 MQTT 클라이언트 인스턴스
 */
export function startSimulator(client: mqtt.MqttClient) {
  console.log(`[Simulator] Starting simulator for device '${DEVICE_ID}' with interval ${INTERVAL}ms`);

  setInterval(() => {
    // 1. 현실적인 범위 내의 센서 데이터 랜덤 생성
    const sensorData = {
      temperature: getRandomFloat(15.0, 35.0),     // 15~35 도
      humidity: getRandomFloat(30.0, 80.0),        // 30~80 %
      soil_moisture: getRandomFloat(20.0, 60.0),   // 20~60 %
      light_intensity: getRandomFloat(100.0, 1000.0) // 100~1000 lux
    };

    // 2. 생성된 센서 데이터를 MQTT 브로커로 발행
    const sensorTopic = `smartfarm/${DEVICE_ID}/sensors`;
    client.publish(sensorTopic, JSON.stringify(sensorData));
    console.log(`[Simulator] Published sensor data:`, sensorData);

    // 3. 센서 값에 기반한 가상 액추에이터 상태 결정 (자동 제어 시뮬레이션)
    // - 조도가 300 미만이면 LED 켜기
    // - 온도가 28도를 넘으면 팬 켜기
    // - 토양 습도가 30% 미만이면 워터 펌프 켜기
    const actuatorState = {
      led_on: sensorData.light_intensity < 300,
      fan_on: sensorData.temperature > 28.0,
      pump_on: sensorData.soil_moisture < 30.0
    };

    // 4. 액추에이터 상태를 MQTT 브로커로 발행 (하드웨어가 상태를 보고하는 것을 모사)
    const actuatorTopic = `smartfarm/${DEVICE_ID}/actuators/state`;
    client.publish(actuatorTopic, JSON.stringify(actuatorState));
    console.log(`[Simulator] Published actuator state:`, actuatorState);

  }, INTERVAL);
}