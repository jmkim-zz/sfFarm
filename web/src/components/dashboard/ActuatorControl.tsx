'use client';

import React from 'react';
import { useActuators } from '../../lib/hooks/useActuators';
import { ActuatorState } from '../../types/actuator';
import { Lightbulb, Fan, Droplets } from 'lucide-react';

interface ActuatorControlProps {
  deviceId: string;
  currentState: Partial<ActuatorState>;
}

export function ActuatorControl({ deviceId, currentState }: ActuatorControlProps) {
  // Step 4에서 작성한 제어 명령 발행 훅을 가져옵니다.
  const { toggleActuator } = useActuators(deviceId);

  const actuators = [
    { id: 'led', label: '생장 LED', icon: Lightbulb, state: currentState.led_on, color: 'text-yellow-500' },
    { id: 'fan', label: '환기 팬', icon: Fan, state: currentState.fan_on, color: 'text-green-500' },
    { id: 'pump', label: '워터 펌프', icon: Droplets, state: currentState.pump_on, color: 'text-blue-500' },
  ] as const;

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 mt-6">
      <h3 className="text-lg font-bold text-gray-800 mb-6">기기 수동 제어 (Actuators)</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {actuators.map(({ id, label, icon: Icon, state, color }) => (
          <div key={id} className="flex flex-col items-center justify-center p-6 border rounded-xl bg-gray-50 transition-colors">
            <Icon className={`w-12 h-12 mb-4 ${state ? color : 'text-gray-300'}`} />
            <span className="text-sm font-semibold text-gray-700 mb-4">{label}</span>
            <button
              onClick={() => toggleActuator(id, !state)}
              className={`w-full py-3 rounded-xl text-sm font-bold shadow-sm transition-all ${
                state 
                  ? 'bg-primary text-white hover:bg-primary/90' 
                  : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
            >
              {state ? '켜짐 (ON)' : '꺼짐 (OFF)'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}