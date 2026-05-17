'use client';

import React from 'react';
import { useSensors } from '../../lib/hooks/useSensors';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function SensorChart({ deviceId }: { deviceId: string }) {
  // Supabase에서 특정 기기의 최근 30건 센서 데이터를 가져옵니다.
  const { data, loading, error } = useSensors(deviceId, 30);

  if (loading) {
    return <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 h-80 flex items-center justify-center text-gray-500 font-medium">데이터를 불러오는 중...</div>;
  }

  if (error) {
    return <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 h-80 flex items-center justify-center text-red-500 font-medium">데이터 로드 실패: {error.message}</div>;
  }

  // 차트 X축 출력을 위해 ISO 날짜 포맷을 '오후 2:30:15' 형식으로 변환합니다.
  const chartData = data.map(d => ({
    ...d,
    time: new Date(d.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }));

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 mt-6">
      <h3 className="text-lg font-bold text-gray-800 mb-6">온습도 변화 추이 (최근 30건 누적 데이터)</h3>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            {/* X축: 시간 */}
            <XAxis dataKey="time" tick={{ fontSize: 12 }} tickMargin={10} stroke="#888888" />
            {/* 왼쪽 Y축: 온도 */}
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} stroke="#888888" />
            {/* 오른쪽 Y축: 습도 (스케일이 다르므로 축을 분리) */}
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} stroke="#888888" />
            
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            
            <Line yAxisId="left" type="monotone" dataKey="temperature" name="온도 (°C)" stroke="#ef4444" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
            <Line yAxisId="right" type="monotone" dataKey="humidity" name="습도 (%)" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}