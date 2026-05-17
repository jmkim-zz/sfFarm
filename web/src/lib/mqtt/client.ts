import mqtt from 'mqtt';

const MQTT_BROKER_URL = process.env.NEXT_PUBLIC_MQTT_BROKER_URL || 'ws://localhost:8000/mqtt';

/**
 * 브라우저 환경에서 MQTT 브로커에 WebSocket으로 연결하는 클라이언트를 생성합니다.
 * Next.js React 컴포넌트의 useEffect 내부에서 호출되도록 설계되었습니다.
 */
export const getMqttClient = () => {
  // 브라우저 탭을 여러 개 열었을 때 Client ID 충돌을 방지하기 위해 랜덤 ID를 생성합니다.
  const clientId = `web-client-${Math.random().toString(16).slice(2, 10)}`;
  
  console.log(`[Web MQTT] Connecting to ${MQTT_BROKER_URL} via WebSockets...`);

  const client = mqtt.connect(MQTT_BROKER_URL, {
    username: process.env.NEXT_PUBLIC_MQTT_USERNAME,
    password: process.env.NEXT_PUBLIC_MQTT_PASSWORD,
    clientId,
    keepalive: 60,
    reconnectPeriod: 5000,
  });

  client.on('error', (err) => {
    console.error('[Web MQTT] Connection error:', err);
  });

  return client;
};