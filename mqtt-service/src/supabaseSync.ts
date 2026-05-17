import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // RLS 우회를 위해 Service Role Key 사용

if (!supabaseUrl || !supabaseKey) {
  console.error('[Supabase] Missing environment variables. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 센서 데이터를 Supabase DB에 Insert 합니다.
 * @param deviceId 하드웨어 고유 ID
 * @param payload MQTT로부터 수신한 센서 JSON 데이터
 */
export async function insertSensorData(deviceId: string, payload: any) {
  try {
    const { error } = await supabase.from('sensor_data').insert([
      {
        device_id: deviceId,
        temperature: payload.temperature,
        humidity: payload.humidity,
        soil_moisture: payload.soil_moisture,
        light_intensity: payload.light_intensity,
      },
    ]);

    if (error) throw error;
    console.log(`[Supabase] Inserted sensor data for device: ${deviceId}`);
  } catch (error) {
    console.error(`[Supabase] Error inserting sensor data:`, error);
  }
}

/**
 * 액추에이터의 최신 상태를 Supabase DB에 Upsert 합니다.
 * @param deviceId 하드웨어 고유 ID
 * @param payload MQTT로부터 수신한 액추에이터 상태 JSON 데이터
 */
export async function upsertActuatorState(deviceId: string, payload: any) {
  try {
    const { error } = await supabase.from('actuator_states').upsert({
      device_id: deviceId,
      updated_at: new Date().toISOString(),
      ...payload, // led_on, fan_on, pump_on 등 포함
    });

    if (error) throw error;
    console.log(`[Supabase] Upserted actuator state for device: ${deviceId}`);
  } catch (error) {
    console.error(`[Supabase] Error upserting actuator state:`, error);
  }
}