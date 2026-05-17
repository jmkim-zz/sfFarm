/**
 * @file actuator.ts
 * @description Supabase 'actuator_states' 테이블과 동기화되는 액추에이터 상태 타입 정의
 */

export interface ActuatorState {
  device_id: string;
  updated_at: string;
  led_on: boolean;
  fan_on: boolean;
  pump_on: boolean;
}