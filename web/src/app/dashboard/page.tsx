import React from 'react';
import { RealTimePanel } from '../../components/dashboard/RealTimePanel';
import { SensorChart } from '../../components/dashboard/SensorChart';

// 모니터링할 기준 디바이스 ID (topics.md 및 DB 스키마에 정의된 기기명)
const DEVICE_ID = 'sim-uno-r4'; // 실제 기기 연결 시 'uno-r4-main' 으로 변경

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gray-50/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">스마트팜 관제 대시보드</h1>
          <p className="text-gray-500 mt-2 font-medium">현재 모니터링 중인 기기: <span className="text-primary font-bold">{DEVICE_ID}</span></p>
        </header>

        {/* 실시간 MQTT 모니터링 및 액추에이터 제어 패널 */}
        <RealTimePanel deviceId={DEVICE_ID} />

        {/* DB 기반 과거 데이터(온습도) 차트 패널 */}
        <SensorChart deviceId={DEVICE_ID} />
      </div>
    </main>
  );
}