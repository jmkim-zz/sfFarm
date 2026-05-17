import { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import { SensorData } from '../../types/sensor';

export function useSensors(deviceId: string, limit: number = 20) {
  const [data, setData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchSensors() {
      try {
        setLoading(true);
        // Supabase에서 특정 기기의 최신 센서 데이터를 limit 개수만큼 조회합니다.
        const { data: sensorData, error: dbError } = await supabase
          .from('sensor_data')
          .select('*')
          .eq('device_id', deviceId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (dbError) throw dbError;
        
        // 차트 출력을 위해 과거 데이터가 배열 앞쪽으로 오도록 순서를 뒤집어 줍니다.
        setData((sensorData as SensorData[]).reverse());
      } catch (err: any) {
        setError(err);
        console.error('[useSensors] Fetch error:', err.message);
      } finally {
        setLoading(false);
      }
    }

    if (deviceId) {
      fetchSensors();
    }
  }, [deviceId, limit]);

  return { data, loading, error };
}