import { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import { SensorData } from '../../types/sensor';

export function useSensors(deviceId: string, limit: number = 20) {
  const [data, setData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // isBackground 플래그가 true이면 백그라운드 갱신이므로 화면 깜빡임(Loading)을 발생시키지 않습니다.
    async function fetchSensors(isBackground = false) {
      try {
        if (!isBackground) setLoading(true);
        
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
        if (!isBackground) setError(err);
        console.error('[useSensors] Fetch error:', err.message);
      } finally {
        if (!isBackground) setLoading(false);
      }
    }

    if (deviceId) {
      // 1. 화면에 들어오자마자 최초 1회 실행 (로딩 스피너 표시)
      fetchSensors();

      // 2. 10초(10000ms)마다 백그라운드에서 조용히 최신 데이터 갱신
      const intervalId = setInterval(() => {
        fetchSensors(true);
      }, 10000);

      // 3. 화면을 벗어날 때 타이머를 깔끔하게 지워줍니다 (메모리 누수 방지)
      return () => clearInterval(intervalId);
    }
  }, [deviceId, limit]);

  return { data, loading, error };
}