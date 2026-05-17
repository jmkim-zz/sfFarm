'use client';

import React from 'react';
import { useRealtime } from '../../lib/hooks/useRealtime';
import { SensorCard } from './SensorCard';
import { ActuatorControl } from './ActuatorControl';
import { Thermometer, Droplets, Sun, Sprout, Wifi, WifiOff } from 'lucide-react';

export function RealTimePanel({ deviceId }: { deviceId: string }) {
  // 컴포넌트가 마운트되면 MQTT WebSocket에 연결하고, 언마운트 시 자동 해제합니다.
  const { latestSensor, actuatorState, isConnected } = useRealtime(deviceId);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-extrabold text-gray-800">실시간 모니터링</h2>
        <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-bold ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          <span>{isConnected ? 'Broker Connected' : 'Disconnected'}</span>
        </div>
      </div>

      {/* 센서 카드 그리드 배치 (반응형: 모바일 1열, 태블릿 2열, 데스크탑 4열) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <SensorCard title="현재 온도" value={latestSensor.temperature} unit="°C" Icon={Thermometer} color="text-red-500" />
        <SensorCard title="현재 습도" value={latestSensor.humidity} unit="%" Icon={Droplets} color="text-blue-500" />
        <SensorCard title="토양 수분" value={latestSensor.soil_moisture} unit="%" Icon={Sprout} color="text-green-600" />
        <SensorCard title="조도 (빛 밝기)" value={latestSensor.light_intensity} unit="Lux" Icon={Sun} color="text-amber-500" />
      </div>

      {/* 액추에이터 제어부 */}
      <ActuatorControl 
        deviceId={deviceId} 
        currentState={actuatorState} 
      />
    </div>
  );
}