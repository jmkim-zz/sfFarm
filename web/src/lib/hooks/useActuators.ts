import { getMqttClient } from '../mqtt/client';

export function useActuators(deviceId: string) {

  /**
   * 액추에이터(LED, 펌프, 팬)의 상태를 변경하기 위해 제어 명령을 발행합니다.
   * @param actuator 제어할 기기 ('led', 'fan', 'pump')
   * @param targetState 켜기(true) 또는 끄기(false)
   */
  const toggleActuator = (actuator: 'led' | 'fan' | 'pump', targetState: boolean) => {
    // 제어 명령 전송을 위한 단발성 클라이언트 생성
    const client = getMqttClient();
    
    client.on('connect', () => {
      const topic = `smartfarm/${deviceId}/actuators/control`;
      const payload = JSON.stringify({ actuator, state: targetState });
      
      client.publish(topic, payload, (err) => {
        if (err) {
          console.error('[useActuators] Publish error:', err);
        } else {
          console.log(`[useActuators] Sent command -> ${actuator}: ${targetState}`);
        }
        // 명령 전송이 완료되면 리소스 확보를 위해 연결 즉시 해제
        client.end();
      });
    });
  };

  return { toggleActuator };
}