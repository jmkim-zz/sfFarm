import mqtt from 'mqtt';
import dotenv from 'dotenv';
import { insertSensorData, upsertActuatorState } from './supabaseSync';

dotenv.config();

const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const MQTT_OPTIONS: mqtt.IClientOptions = {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  clientId: `mqtt-bridge-worker-${Math.random().toString(16).slice(2, 10)}`, // 클라우드 브로커 충돌 방지를 위한 고유 ID
  reconnectPeriod: 5000, // 연결 끊김 시 5초마다 재연결 시도
  keepalive: 60,
};

export function startMqttClient() {
  console.log(`[MQTT] Connecting to broker at ${MQTT_BROKER_URL}...`);
  
  const client = mqtt.connect(MQTT_BROKER_URL, MQTT_OPTIONS);

  client.on('connect', () => {
    console.log('[MQTT] Successfully connected to broker.');
    
    // 토픽 구조 문서(topics.md)에 기반하여 센서 및 액추에이터 상태 토픽 구독
    client.subscribe('smartfarm/+/sensors', (err) => {
      if (!err) console.log('[MQTT] Subscribed to topic: smartfarm/+/sensors');
    });
    
    client.subscribe('smartfarm/+/actuators/state', (err) => {
      if (!err) console.log('[MQTT] Subscribed to topic: smartfarm/+/actuators/state');
    });
  });

  client.on('message', async (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      const topicParts = topic.split('/');
      const deviceId = topicParts[1];
      const messageType = topicParts[2]; // 'sensors' 또는 'actuators'

      // 수신한 토픽 종류에 따라 적절한 DB 동기화 함수 호출
      if (messageType === 'sensors') {
        await insertSensorData(deviceId, payload);
      } else if (messageType === 'actuators') {
        await upsertActuatorState(deviceId, payload);
      }
    } catch (error) {
      console.error(`[MQTT] Failed to process message from topic ${topic}:`, error);
    }
  });

  // 네트워크 예외 처리 (서버 중단 없이 지속 실행되도록 보장)
  client.on('error', (err) => {
    console.error('[MQTT] Connection error:', err);
  });

  client.on('offline', () => {
    console.warn('[MQTT] Client is offline. Waiting for network recovery...');
  });
  
  return client;
}