/**
 * @file sensor.ts
 * @description Supabase 'sensor_data' 테이블과 동기화되는 센서 데이터 타입 정의
 */

export interface SensorData {
  id: number;
  created_at: string; // ISO 8601 형식의 날짜 문자열 (e.g., "2024-05-21T10:00:00Z")
  device_id: string;
  temperature: number | null;
  humidity: number | null;
  soil_moisture: number | null;
  light_intensity: number | null;
}