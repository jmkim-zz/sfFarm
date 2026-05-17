import { startMqttClient } from './mqttClient';
import { startSimulator } from './simulator';
import dotenv from 'dotenv';

dotenv.config();

console.log('==================================================');
console.log('   SmartFarm MQTT to Supabase Bridge Starting...  ');
console.log('==================================================');

const client = startMqttClient();

// 환경 변수에 따라 시뮬레이터 구동 여부 결정
if (process.env.USE_SIMULATOR === 'true') {
  // MQTT 클라이언트가 브로커에 정상적으로 연결된 후 시뮬레이터 시작
  client.on('connect', () => {
    startSimulator(client);
  });
} else {
  console.log('[App] Simulator is disabled. Waiting for real hardware data.');
}

process.on('SIGINT', () => {
  console.log('Shutting down MQTT Bridge Service...');
  process.exit(0);
});