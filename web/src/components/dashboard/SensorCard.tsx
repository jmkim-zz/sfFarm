import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SensorCardProps {
  title: string;
  value: number | null | undefined;
  unit: string;
  Icon: LucideIcon;
  color?: string;
}

export function SensorCard({ title, value, unit, Icon, color = 'text-blue-500' }: SensorCardProps) {
  return (
    <div className="flex items-center p-6 bg-white rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
      <div className={`p-4 rounded-full bg-gray-50 ${color}`}>
        <Icon className="w-8 h-8" />
      </div>
      <div className="ml-4">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <div className="flex items-baseline mt-1">
          <span className="text-3xl font-bold text-gray-900">
            {/* 데이터가 아직 수신되지 않았을 경우 '--' 로 표시합니다. */}
            {value !== null && value !== undefined ? value.toFixed(1) : '--'}
          </span>
          <span className="ml-1 text-sm text-gray-500 font-medium">{unit}</span>
        </div>
      </div>
    </div>
  );
}