import { useState, useEffect } from 'react';
import { getMqttClient } from '../mqtt/client';
import { SensorData } from '../../types/sensor';
import { ActuatorState } from '../../types/actuator';

export function useRealtime(deviceId: string) {
  const [latestSensor, setLatestSensor] = useState<Partial<SensorData>>({});
  const [actuatorState, setActuatorState] = useState<Partial<ActuatorState>>({});
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // 브라우저 환경에서 MQTT 웹소켓 클라이언트 생성 및 연결
    const client = getMqttClient();

    client.on('connect', () => {
      setIsConnected(true);
      // 하드웨어 문서(topics.md)에 정의된 해당 기기의 토픽들을 구독
      client.subscribe(`smartfarm/${deviceId}/sensors`);
      client.subscribe(`smartfarm/${deviceId}/actuators/state`);
    });

    client.on('message', (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        
        // 수신된 토픽 경로에 따라 알맞은 상태(State) 업데이트
        if (topic.endsWith('/sensors')) {
          setLatestSensor(payload);
        } else if (topic.endsWith('/actuators/state')) {
          setActuatorState(payload);
        }
      } catch (err) {
        console.error('[useRealtime] Failed to parse message:', err);
      }
    });

    client.on('offline', () => setIsConnected(false));

    // 컴포넌트 언마운트 시(화면을 벗어날 때) 반드시 실행되는 Cleanup 함수
    return () => {
      if (client) {
        console.log('[useRealtime] Disconnecting MQTT Client to prevent memory leak...');
        client.end(); // 메모리 누수 및 브로커 리소스 낭비 방지를 위한 연결 종료
      }
    };
  }, [deviceId]);

  return { latestSensor, actuatorState, isConnected };
}