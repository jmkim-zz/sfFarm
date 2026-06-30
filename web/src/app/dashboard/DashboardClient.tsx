'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { LayoutGrid, Play, ChevronRight, Square, FolderOpen, SlidersHorizontal, CheckCircle, AlertTriangle, XCircle, Info, X, Cpu, Settings2, Users, CircuitBoard, Wifi, Copy, Download, Code, Server, Terminal, Database, Key, Cloud, FileCode2, Tractor, Thermometer, Droplets, Sun, Activity, Settings, Maximize2, Plus, Trash2, Shield, Leaf, LayoutDashboard, Calendar, RefreshCw, Smartphone, MapPin, Save, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';
import FacilitiesSettings from '../../components/settings/FacilitiesSettings';
import FarmingJournal from '../../components/dashboard/FarmingJournal';
import FacilityOverviewCard from '../../components/dashboard/FacilityOverviewCard';
import MaintenanceSchedule from '../../components/dashboard/MaintenanceSchedule';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

// 알림(Notification) 타입을 정의하고 관리하는 커스텀 훅
type NotificationType = 'success' | 'warning' | 'error' | 'info';
interface NotificationItem { id: number; message: string; type: NotificationType; }

function useNotification() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  
  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const showNotification = (message: string, type: NotificationType = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    
    // 에러(error) 타입인 경우 자동 삭제를 하지 않고 사용자가 직접 닫도록 유지합니다.
    if (type !== 'error') {
      setTimeout(() => removeNotification(id), 5000);
    }
  };
  return { notifications, showNotification, removeNotification };
}

// 장비 개별 항목을 렌더링하는 재사용 컴포넌트
function EquipmentItem({ 
  name, icon, details, description, isOn, onToggle, isActive = true, schedule
}: { 
  name: string, icon: string, details: string, description: string, isOn: boolean, onToggle: (state: boolean) => void, isActive?: boolean, schedule?: any
}) {
  return (
    <div className={`flex justify-between items-center p-5 bg-light rounded-xl transition-all ${isActive ? 'hover:bg-gray-200' : 'opacity-40 grayscale pointer-events-none'}`}>
      <div className="flex flex-col text-left">
        <h4 className="flex items-center gap-2 mb-1 text-primary font-semibold text-lg">
          {name} <i className={`mdi ${icon} text-secondary text-xl`}></i>
        </h4>
        <p className="text-gray-500 text-sm mb-1">{details}</p>
        <p className="text-gray-500 text-sm">{description}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-4">
          <span className={`px-3 py-1 rounded-full text-xs font-medium text-white transition-colors duration-300 ${!isActive ? 'bg-gray-400' : isOn ? 'bg-state-on' : 'bg-state-off'}`}>
            {!isActive ? 'Disabled' : isOn ? 'On' : 'Off'}
          </span>
          {/* Tailwind 기반 토글 스위치 디자인 */}
          <label className="relative inline-block w-[50px] h-[24px]">
            <input type="checkbox" className="opacity-0 w-0 h-0 peer" checked={isOn && isActive} disabled={!isActive} onChange={(e) => onToggle(e.target.checked)} />
            <span className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 transition-[0.4s] rounded-[24px] ${!isActive ? 'bg-gray-300' : 'bg-[#ccc] peer-checked:bg-success'}
              before:absolute before:content-[''] before:h-[16px] before:w-[16px] before:left-[4px] before:bottom-[4px] before:bg-white before:transition-[0.4s] before:rounded-full peer-checked:before:translate-x-[26px]`}>
            </span>
          </label>
        </div>
        {schedule && (
          <div className="text-xs text-gray-500 font-medium text-right mt-1.5 flex flex-col items-end gap-1">
            {/* Active Window */}
            {(schedule.activeWindow || schedule.start || schedule.isContinuous) && (
              <div className="text-primary flex items-center gap-1">
                <i className="mdi mdi-clock-outline"></i>
                {(schedule.activeWindow?.isContinuous ?? schedule.isContinuous) 
                  ? '24-Hour Continuous' 
                  : `${schedule.activeWindow?.start ?? schedule.start} - ${schedule.activeWindow?.stop ?? schedule.stop}`
                }
              </div>
            )}
            
            {/* Operation Mode */}
            {schedule.operationMode && (
              <div className="text-secondary flex flex-col items-end">
                <div className="flex items-center gap-1">
                  <i className="mdi mdi-cog-outline"></i>
                  Mode: {schedule.operationMode.type === 'alwaysOn' ? 'Always ON' : schedule.operationMode.type === 'sensor' ? 'Sensor Control' : 'Duty Cycle Timer'}
                </div>
                {schedule.operationMode.type === 'sensor' && schedule.operationMode.sensorConfig && (
                  <span className="text-[10px] text-gray-400 mt-0.5">
                    Target: {schedule.operationMode.sensorConfig.targetSensor} ({schedule.operationMode.sensorConfig.behavior} {schedule.operationMode.sensorConfig.targetValue} ±{schedule.operationMode.sensorConfig.deadband})
                  </span>
                )}
                {schedule.operationMode.type === 'timer' && schedule.operationMode.timerConfig && (
                  <span className="text-[10px] text-gray-400 mt-0.5">
                    ({schedule.operationMode.timerConfig.onDurationMinutes}m ON / {schedule.operationMode.timerConfig.offDurationMinutes}m OFF)
                  </span>
                )}
              </div>
            )}

            {/* Safety Override */}
            {schedule.safetyOverride && schedule.safetyOverride.enabled && (
              <div className="text-danger flex items-center gap-1">
                <i className="mdi mdi-shield-alert-outline"></i>
                Safety: {schedule.safetyOverride.sensor} {schedule.safetyOverride.condition === 'above' ? '>' : '<'} {schedule.safetyOverride.thresholdValue}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 커스텀 다중 선택(Multi-select) 드롭다운 컴포넌트
function MultiSelectDropdown({ options, selected, onChange }: { 
  options: { group: string; items: { label: string; value: string }[] }[], 
  selected: string[], 
  onChange: (values: string[]) => void 
}) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleItem = (val: string) => {
    if (val === 'none') onChange(['none']);
    else {
      const newSelected = selected.includes(val) 
        ? selected.filter(v => v !== val) 
        : [...selected.filter(v => v !== 'none'), val];
      onChange(newSelected.length ? newSelected : ['none']);
    }
  };

  return (
    <div className="relative w-full text-sm" tabIndex={0} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsOpen(false); }}>
      <div className="w-full p-2 border border-gray-300 rounded-lg cursor-pointer bg-white flex justify-between items-center hover:border-secondary transition-colors" onClick={() => setIsOpen(!isOpen)}>
        <span className="truncate mr-2 text-gray-700 font-medium">
          {selected.includes('none') ? 'None' : selected.map(val => {
            for (const group of options) {
              const found = group.items.find(i => i.value === val);
              if (found) return found.label;
            }
            return val;
          }).join(', ')}
        </span>
        <span className="text-gray-400 text-xs">▼</span>
      </div>
      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-[250px] overflow-y-auto top-full left-0">
          <label className="flex items-center px-3 py-2.5 hover:bg-gray-50 cursor-pointer text-gray-700 border-b border-gray-100 transition-colors">
            <input type="checkbox" checked={selected.includes('none')} onChange={() => toggleItem('none')} className="mr-3 w-4 h-4 accent-secondary" /> None
          </label>
          {options.map((optGroup) => (
            <div key={optGroup.group}>
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold text-gray-500 bg-gray-100">{optGroup.group}</div>
              {optGroup.items.map((item) => (
                <label key={item.value} className="flex items-center px-3 py-2.5 hover:bg-light cursor-pointer text-gray-700 transition-colors">
                  <input type="checkbox" checked={selected.includes(item.value)} onChange={() => toggleItem(item.value)} className="mr-3 w-4 h-4 accent-secondary" /> {item.label}
                </label>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// data-logger.py가 Supabase에 저장한 데이터를 실시간으로 가져오는 훅
export function useSupabaseSensors(deviceId: string | null) {
  const [sensors, setSensors] = useState({
    temperature: 0, humidity: 0, light: 0, co2: 0, ph: 0, ec: 0, do: 0
  });

  useEffect(() => {
    // Helper function to extract all sensor values from a list of rows
    const updateSensorsFromRows = (rows: any[]) => {
      setSensors(prev => {
        const next = { ...prev };
        const found = {
          temperature: false,
          humidity: false,
          light: false,
          co2: false,
          ph: false,
          ec: false,
          do: false
        };

        for (const row of rows) {
          const payload = row.payload;
          if (!payload) continue;

          for (const key of Object.keys(found) as Array<keyof typeof found>) {
            if (!found[key]) {
              const val = extractSensorValue(payload, key);
              if (val !== null) {
                next[key] = val;
                found[key] = true;
              }
            }
          }
          
          if (Object.values(found).every(v => v)) break;
        }
        return next;
      });
    };

    // 1. 페이지 로드 시 최신 데이터 20건 가져오기
    const fetchLatest = async () => {
      const { data, error } = await supabase
        .from('dynamic_telemetry')
        .select('*')
        .eq('device_id', deviceId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (data && !error) {
        updateSensorsFromRows(data);
      }
    };
    fetchLatest();

    // 2. 새로운 데이터가 INSERT 될 때마다 실시간 수신
    const channel = supabase
      .channel(`realtime-dynamic-telemetry-sensors-${deviceId}-${Date.now()}-${Math.random()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dynamic_telemetry', filter: `device_id=eq.${deviceId}` },
        (payload) => {
          const newData = payload.new;
          if (newData && newData.payload) {
            setSensors(prev => {
              const next = { ...prev };
              (Object.keys(prev) as Array<keyof typeof prev>).forEach(key => {
                const val = extractSensorValue(newData.payload, key);
                if (val !== null) {
                  next[key] = val;
                }
              });
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deviceId]);

  return sensors;
}

// 시스템 설정(센서/기기 사용 여부)을 관리하는 커스텀 훅
export function useSystemSettings(deviceId: string | null, updateTrigger: number = 0) {
  const [activeSensors, setActiveSensors] = useState<Record<string, boolean>>({
    temperature: true, humidity: true, light: true, co2: true, ph: true, ec: true, do: true
  });
  const [activeEquipment, setActiveEquipment] = useState<Record<string, boolean>>({
    circulationFan: true, growLight: true, hvac: true, humidifier: true, co2Generator: true, waterPump: true, solenoidValve: true, dosingPump: true, airPump: true
  });

  useEffect(() => {
    const loadSettings = async () => {
      const { data: sensorData } = await supabase.from('app_settings').select('value').eq('key', `sf_active_sensors_${deviceId}`).single();
      const { data: equipData } = await supabase.from('app_settings').select('value').eq('key', `sf_active_equipment_${deviceId}`).single();
      
      if (sensorData?.value) setActiveSensors(sensorData.value);
      else {
        const savedS = localStorage.getItem(`sf_active_sensors_${deviceId}`);
        if (savedS) setActiveSensors(JSON.parse(savedS));
      }
      
      if (equipData?.value) setActiveEquipment(equipData.value);
      else {
        const savedE = localStorage.getItem(`sf_active_equipment_${deviceId}`);
        if (savedE) setActiveEquipment(JSON.parse(savedE));
      }
      };
      loadSettings();
    }, [deviceId, updateTrigger]);

  const toggleSensor = (key: string) => {
    setActiveSensors(prev => {
      const currentVal = prev[key] !== false; // 하위 호환 및 커스텀 지원
      const next = { ...prev, [key]: !currentVal };
      localStorage.setItem(`sf_active_sensors_${deviceId}`, JSON.stringify(next));
      supabase.from('app_settings').upsert({ key: `sf_active_sensors_${deviceId}`, value: next }).then();
      return next;
    });
  };

  const toggleEquipmentSetting = (key: string) => {
    setActiveEquipment(prev => {
      const currentVal = prev[key] !== false; // 값이 없으면(새 커스텀 기기) 기본 활성(true) 처리
      const next = { ...prev, [key]: !currentVal };
      localStorage.setItem(`sf_active_equipment_${deviceId}`, JSON.stringify(next));
      supabase.from('app_settings').upsert({ key: `sf_active_equipment_${deviceId}`, value: next }).then();
      return next;
    });
  };

  return { activeSensors, activeEquipment, toggleSensor, toggleEquipmentSetting };
}

// 장비 상태를 관리하는 커스텀 훅
export function useEquipmentControl(deviceId: string | null, showNotification: (msg: string, type: NotificationType) => void) {
  const [equipment, setEquipment] = useState({
    circulationFan: true,
    growLight: true,
    hvac: false,
    humidifier: true,
    co2Generator: false,
    waterPump: false,
    solenoidValve: false,
    dosingPump: false,
    airPump: true
  });

  const [customEquipmentStates, setCustomEquipmentStates] = useState<Record<string, boolean>>({});

  // 기기별 표시 이름 매핑 (대소문자 및 띄어쓰기 적용)
  const equipmentNames: Record<keyof typeof equipment, string> = {
    circulationFan: 'Circulation Fan',
    growLight: 'Grow Light',
    hvac: 'HVAC',
    humidifier: 'Humidifier',
    co2Generator: 'CO2 Generator',
    waterPump: 'Water Pump',
    solenoidValve: 'Solenoid Valve',
    dosingPump: 'Dosing Pump',
    airPump: 'Air Pump'
  };

  // 컴포넌트 마운트 시 기기 온/오프 상태 로드
  useEffect(() => {
    const loadEquipmentStates = async () => {
      if (!deviceId) return;
      try {
        const { data: equipStatus } = await supabase.from('app_settings').select('value').eq('key', `sf_equipment_status_${deviceId}`).single();
        const { data: customEquipStatus } = await supabase.from('app_settings').select('value').eq('key', `sf_custom_equipment_status_${deviceId}`).single();

        if (equipStatus?.value) {
          setEquipment(prev => ({ ...prev, ...equipStatus.value }));
        } else {
          const saved = localStorage.getItem(`sf_equipment_status_${deviceId}`);
          if (saved) setEquipment(prev => ({ ...prev, ...JSON.parse(saved) }));
        }

        if (customEquipStatus?.value) {
          setCustomEquipmentStates(prev => ({ ...prev, ...customEquipStatus.value }));
        } else {
          const savedCustom = localStorage.getItem(`sf_custom_equipment_status_${deviceId}`);
          if (savedCustom) setCustomEquipmentStates(prev => ({ ...prev, ...JSON.parse(savedCustom) }));
        }
      } catch (err) {
        console.error('Failed to load equipment status:', err);
      }
    };
    loadEquipmentStates();

    // Python Edge Server가 자율 제어로 DB를 업데이트할 때 UI에 즉시 반영하기 위한 Polling
    const intervalId = setInterval(loadEquipmentStates, 3000);
    
    // Realtime 구독 (Supabase에 app_settings가 Realtime 활성화되어 있는 경우)
    const channel = supabase
      .channel(`equipment_status_updates_${deviceId}_${Date.now()}_${Math.random()}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'app_settings', filter: `key=eq.sf_equipment_status_${deviceId}` },
        (payload) => {
          if (payload.new && payload.new.value) {
            setEquipment(prev => ({ ...prev, ...payload.new.value }));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'app_settings', filter: `key=eq.sf_custom_equipment_status_${deviceId}` },
        (payload) => {
          if (payload.new && payload.new.value) {
            setCustomEquipmentStates(prev => ({ ...prev, ...payload.new.value }));
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [deviceId]);

  const toggleEquipment = (key: string, state: boolean, isCustom: boolean = false, customName: string = '') => {
    if (isCustom) {
      setCustomEquipmentStates(prev => {
        const next = { ...prev, [key]: state };
        localStorage.setItem(`sf_custom_equipment_status_${deviceId}`, JSON.stringify(next));
        supabase.from('app_settings').upsert({ key: `sf_custom_equipment_status_${deviceId}`, value: next }).then();
        return next;
      });
      showNotification(`${customName} ${state ? 'activated' : 'deactivated'}`, 'success');
    } else {
      setEquipment(prev => {
        const next = { ...prev, [key as keyof typeof equipment]: state };
        localStorage.setItem(`sf_equipment_status_${deviceId}`, JSON.stringify(next));
        supabase.from('app_settings').upsert({ key: `sf_equipment_status_${deviceId}`, value: next }).then();
        return next;
      });
      showNotification(`${equipmentNames[key as keyof typeof equipment]} ${state ? 'activated' : 'deactivated'}`, 'success');
    }
  };

  const startAll = () => {
    const allOn = Object.keys(equipment).reduce((acc, key) => ({ ...acc, [key]: true }), {} as typeof equipment);
    setEquipment(allOn);
    localStorage.setItem(`sf_equipment_status_${deviceId}`, JSON.stringify(allOn));
    supabase.from('app_settings').upsert({ key: `sf_equipment_status_${deviceId}`, value: allOn }).then();

    const allCustomOn = Object.keys(customEquipmentStates).reduce((acc, key) => ({ ...acc, [key]: true }), {});
    setCustomEquipmentStates(allCustomOn);
    localStorage.setItem(`sf_custom_equipment_status_${deviceId}`, JSON.stringify(allCustomOn));
    supabase.from('app_settings').upsert({ key: `sf_custom_equipment_status_${deviceId}`, value: allCustomOn }).then();

    showNotification('Starting all equipment...', 'success');
  };

  const stopAll = () => {
    const allOff = Object.keys(equipment).reduce((acc, key) => ({ ...acc, [key]: false }), {} as typeof equipment);
    setEquipment(allOff);
    localStorage.setItem(`sf_equipment_status_${deviceId}`, JSON.stringify(allOff));
    supabase.from('app_settings').upsert({ key: `sf_equipment_status_${deviceId}`, value: allOff }).then();

    const allCustomOff = Object.keys(customEquipmentStates).reduce((acc, key) => ({ ...acc, [key]: false }), {});
    setCustomEquipmentStates(allCustomOff);
    localStorage.setItem(`sf_custom_equipment_status_${deviceId}`, JSON.stringify(allCustomOff));
    supabase.from('app_settings').upsert({ key: `sf_custom_equipment_status_${deviceId}`, value: allCustomOff }).then();

    showNotification('Stopping all equipment...', 'warning');
  };

  return { equipment, customEquipmentStates, setCustomEquipmentStates, toggleEquipment, startAll, stopAll };
}

// 아두이노 핀 맵 데이터 정의 (UNO R3 vs UNO R4 WiFi)
const ARDUINO_PINS = [
  { id: 'A0', name: 'A0', r3: 'Analog In (10-bit)', r4: 'Analog In (14-bit) / True DAC' },
  { id: 'A1', name: 'A1', r3: 'Analog In (10-bit)', r4: 'Analog In (14-bit) / OPAMP' },
  { id: 'A2', name: 'A2', r3: 'Analog In (10-bit)', r4: 'Analog In (14-bit) / OPAMP' },
  { id: 'A3', name: 'A3', r3: 'Analog In (10-bit)', r4: 'Analog In (14-bit)' },
  { id: 'A4', name: 'A4', r3: 'Analog In (10-bit) / SDA', r4: 'Analog In (14-bit) / SDA' },
  { id: 'A5', name: 'A5', r3: 'Analog In (10-bit) / SCL', r4: 'Analog In (14-bit) / SCL' },
  { id: 'I2C', name: 'I2C Bus (SDA / SCL)', r3: 'I2C Data & Clock Lines', r4: 'I2C Data & Clock Lines / Qwiic', isBus: true },
  { id: 'SPI', name: 'SPI Bus (D13/D12/D11)', r3: 'Hardware SPI (SCK/MISO/MOSI)', r4: 'Hardware SPI (SCK/MISO/MOSI)', isBus: true },
  { id: 'D10', name: 'D10', r3: 'Digital I/O / PWM / SPI SS', r4: 'Digital I/O / PWM / SPI SS' },
  { id: 'D9', name: 'D9', r3: 'Digital I/O / PWM', r4: 'Digital I/O / PWM' },
  { id: 'D8', name: 'D8', r3: 'Digital I/O', r4: 'Digital I/O' },
  { id: 'D7', name: 'D7', r3: 'Digital I/O', r4: 'Digital I/O' },
  { id: 'D6', name: 'D6', r3: 'Digital I/O / PWM', r4: 'Digital I/O / PWM' },
  { id: 'D5', name: 'D5', r3: 'Digital I/O / PWM', r4: 'Digital I/O / PWM' },
  { id: 'D4', name: 'D4', r3: 'Digital I/O', r4: 'Digital I/O' },
  { id: 'D3', name: 'D3', r3: 'Digital I/O / PWM / Interrupt', r4: 'Digital I/O / PWM / Interrupt' },
  { id: 'D2', name: 'D2', r3: 'Digital I/O / Interrupt', r4: 'Digital I/O / Interrupt' },
  { id: 'UART', name: 'UART Bus (D1/D0)', r3: 'Hardware Serial (TX/RX)', r4: 'Hardware Serial1 (TX/RX)' },
];

const SQL_SCHEMA_TEXT = `-- 1. 기기 및 구독(Subscribe) 설정 테이블 생성
CREATE TABLE IF NOT EXISTS device_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT UNIQUE NOT NULL,       -- 기기 식별자 (예: 'uno-r4-001')
    mqtt_topic TEXT NOT NULL,             -- 구독할 토픽 (예: 'smartfarm/uno-r4-001/sensors')
    is_active BOOLEAN DEFAULT true,       -- 데이터 수집 활성화 여부
    description TEXT,                     -- 기기 설명
    crops JSONB DEFAULT '[]'::jsonb,      -- 재배 작물 목록 (아이콘 포함 JSON 배열)
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 동적 센서 데이터(JSONB) 적재 테이블 생성
CREATE TABLE IF NOT EXISTS dynamic_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT REFERENCES device_configs(device_id) ON DELETE CASCADE,
    payload JSONB NOT NULL,               -- 센서 데이터를 통째로 저장하는 JSONB 컬럼
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- (선택) 보안을 위한 RLS(Row Level Security) 설정 및 조회 권한
ALTER TABLE device_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dynamic_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for configs" ON device_configs FOR SELECT USING (true);
CREATE POLICY "Allow public read for telemetry" ON dynamic_telemetry FOR SELECT USING (true);

-- 설정 데이터를 저장할 테이블 생성
CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 누구나 쉽게 읽고 쓸 수 있도록 RLS(Row Level Security) 권한 개방
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read and write" ON app_settings FOR ALL USING (true) WITH CHECK (true);

-- 3. 실시간 차트 및 상태 업데이트를 위한 설정
-- dynamic_telemetry 및 device_configs 테이블을 supabase_realtime 복제 목록에 추가
ALTER PUBLICATION supabase_realtime ADD TABLE dynamic_telemetry;
ALTER PUBLICATION supabase_realtime ADD TABLE device_configs;
ALTER PUBLICATION supabase_realtime ADD TABLE app_settings;`;

export const SENSOR_METADATA: Record<string, { label: string; unit: string; color: string; keys: string[] }> = {
  temperature: { label: 'Temperature', unit: '°C', color: '#e74c3c', keys: ['temp', 'temperature'] },
  humidity: { label: 'Humidity', unit: '%', color: '#3498db', keys: ['humid', 'humidity'] },
  light: { label: 'Light Intensity', unit: 'µmol/m²s', color: '#f1c40f', keys: ['ppfd', 'light_intensity', 'light'] },
  co2: { label: 'Carbon Dioxide', unit: 'ppm', color: '#1abc9c', keys: ['co2', 'carbon_dioxide'] },
  ph: { label: 'Hydrogen Ion Concentration', unit: 'pH', color: '#9b59b6', keys: ['ph', 'hydrogen_ion_concentration'] },
  ec: { label: 'Electrical Conductivity', unit: 'dS/m', color: '#e67e22', keys: ['ec', 'electrical_conductivity'] },
  do: { label: 'Dissolved Oxygen', unit: 'mg/L', color: '#2ecc71', keys: ['do', 'dissolved_oxygen'] }
};

function extractSensorValue(payload: any, sensorKey: string): number | null {
  if (!payload || typeof payload !== 'object') return null;
  const meta = SENSOR_METADATA[sensorKey];
  if (!meta) return null;
  for (const dbKey of meta.keys) {
    if (payload[dbKey] !== undefined && payload[dbKey] !== null) {
      const val = Number(payload[dbKey]);
      if (!isNaN(val)) return val;
    }
  }
  return null;
}

function getWeatherIcon(code: number | undefined): string {
  if (code === undefined || code === null) return 'mdi-weather-partly-cloudy text-gray-300';
  if (code === 0) return 'mdi-weather-sunny text-amber-400';
  if ([1, 2, 3].includes(code)) return 'mdi-weather-partly-cloudy text-sky-200';
  if ([45, 48].includes(code)) return 'mdi-weather-fog text-gray-400';
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return 'mdi-weather-pouring text-blue-300 animate-pulse';
  if ([71, 73, 75, 85, 86].includes(code)) return 'mdi-weather-snowy text-blue-100';
  if ([95, 96, 99].includes(code)) return 'mdi-weather-lightning-rainy text-yellow-300';
  return 'mdi-weather-partly-cloudy text-gray-300';
}

const createXAxisTick = (dataPoints: any[]) => {
  const renderedDates = new Set<string>();
  return (props: any) => {
    const { x, y, payload, index } = props;
    if (!payload || !payload.value) return null;

    const parts = payload.value.split('|');
    const timeStr = parts[0] || '';
    const dateStr = parts[1] || '';
    
    if (index === 0) {
      renderedDates.clear();
    }

    let showDate = false;
    if (dateStr && !renderedDates.has(dateStr)) {
      showDate = true;
      renderedDates.add(dateStr);
    }

    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={16} textAnchor="middle" fill="#666" fontSize={10}>
          <tspan x={0} dy="0">{timeStr}</tspan>
          {showDate && dateStr && (
            <tspan x={0} dy="13" fontWeight="600" fill="#2c3e50">
              {dateStr}
            </tspan>
          )}
        </text>
      </g>
    );
  };
};

export default function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'home';

  const currentDeviceId = searchParams.get('deviceId');
  const [facilities, setFacilities] = useState<any[]>([]);
  const [settingsUpdateTrigger, setSettingsUpdateTrigger] = useState(0);
  
  const fetchFacilities = async () => {
    setSettingsUpdateTrigger(prev => prev + 1);
    const { data } = await supabase.from('device_configs').select('*').order('device_id', { ascending: true });
    
    const { data: orderData } = await supabase.from('app_settings').select('value').eq('key', 'sf_facilities_order').single();
    const orderArr: string[] = orderData?.value || [];

    if (data) {
      let fetched = [...data];
      fetched.sort((a, b) => {
        const idxA = orderArr.indexOf(a.device_id);
        const idxB = orderArr.indexOf(b.device_id);
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
      setFacilities(fetched);
    }
  };

  useEffect(() => {
    fetchFacilities();

    // Subscribe to changes in device_configs so facilities list updates immediately
    const channel = supabase.channel(`realtime-device-configs-dashboard-${Date.now()}-${Math.random()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'device_configs' }, () => {
        fetchFacilities();
      }).subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, []);

  const selectedFacility = facilities.find(f => f.device_id === currentDeviceId) || facilities[0];
  const resolvedDeviceId = selectedFacility?.device_id;
  const selectedFacilityName = selectedFacility ? (selectedFacility.description || selectedFacility.device_id) : 'Facility';
  const { notifications, showNotification, removeNotification } = useNotification();
  const { equipment, customEquipmentStates, setCustomEquipmentStates, toggleEquipment, startAll, stopAll } = useEquipmentControl(resolvedDeviceId, showNotification);

  // 💡 여기서 설정한 값들을 꺼내옵니다. 이 코드가 누락되어서 에러가 발생했었습니다!
  const { activeSensors, activeEquipment, toggleSensor, toggleEquipmentSetting } = useSystemSettings(resolvedDeviceId);
  const equipmentNamesList = { circulationFan: 'Circulation Fan', growLight: 'Grow Light', hvac: 'HVAC', humidifier: 'Humidifier', co2Generator: 'CO2 Generator', waterPump: 'Water Pump', solenoidValve: 'Solenoid Valve', dosingPump: 'Dosing Pump', airPump: 'Air Pump' };

  // Home tab states
  const [weatherData, setWeatherData] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [dbConnected, setDbConnected] = useState<boolean>(true);
  const [locationName, setLocationName] = useState<string>('Detecting location...');

  const fetchWeather = async (lat: number, lon: number, locationLabel: string) => {
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,dew_point_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m&daily=sunrise,sunset&timezone=auto`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch weather data.');
      const data = await response.json();
      
      const current = data.current;
      const daily = data.daily;
      
      setWeatherData({
        temp: current.temperature_2m,
        humidity: current.relative_humidity_2m,
        dewPoint: current.dew_point_2m,
        precipitation: current.precipitation,
        weatherCode: current.weather_code,
        windSpeed: current.wind_speed_10m,
        windDir: current.wind_direction_10m,
        sunrise: daily?.sunrise?.[0] ? new Date(daily.sunrise[0]).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '--:--',
        sunset: daily?.sunset?.[0] ? new Date(daily.sunset[0]).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '--:--'
      });
      setLocationName(locationLabel);
    } catch (err: any) {
      console.error(err);
      setWeatherError('Failed to load weather data');
      showNotification('Failed to retrieve weather information.', 'warning');
    } finally {
      setWeatherLoading(false);
    }
  };

  const getAndFetchLocation = async () => {
    let resolvedCity = 'Seoul, South Korea';
    let lat = 37.5665;
    let lon = 126.9780;
    let isDefault = true;

    // 1. Try to get city name & rough coordinates from IP lookup first
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (response.ok) {
        const data = await response.json();
        if (data.latitude && data.longitude) {
          resolvedCity = data.city ? `${data.city}, ${data.country_name}` : 'Estimated Location';
          lat = data.latitude;
          lon = data.longitude;
          isDefault = false;
        }
      }
    } catch (e) {
      console.warn('IP lookup failed:', e);
    }

    // 2. Try to get precise GPS coordinates from browser Geolocation if supported
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const gpsLat = position.coords.latitude;
          const gpsLon = position.coords.longitude;
          const label = `${resolvedCity} (경도: ${gpsLon.toFixed(4)}, 위도: ${gpsLat.toFixed(4)})`;
          fetchWeather(gpsLat, gpsLon, label);
        },
        (error) => {
          console.warn('GPS location failed/denied:', error.message);
          const label = `${resolvedCity} (경도: ${lon.toFixed(4)}, 위도: ${lat.toFixed(4)})${isDefault ? ' (Default)' : ''}`;
          fetchWeather(lat, lon, label);
        },
        { timeout: 5000 }
      );
    } else {
      const label = `${resolvedCity} (경도: ${lon.toFixed(4)}, 위도: ${lat.toFixed(4)})${isDefault ? ' (Default)' : ''}`;
      fetchWeather(lat, lon, label);
    }
  };

  const checkDbConnection = async () => {
    try {
      const { error } = await supabase.from('app_settings').select('key').limit(1);
      if (error) throw error;
      setDbConnected(true);
    } catch (err) {
      console.error('Supabase connection check failed:', err);
      setDbConnected(false);
    }
  };

  useEffect(() => {
    if (currentTab === 'home') {
      getAndFetchLocation();
      checkDbConnection();
      
      const interval = setInterval(() => {
        checkDbConnection();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [currentTab]);

  // 💡 Dashboard Charts states
  const [dashboardMode, setDashboardMode] = useState<'realtime' | 'custom'>('realtime');
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toLocaleDateString('en-CA');
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toLocaleDateString('en-CA');
  });
  const [chartData, setChartData] = useState<Record<string, { time: string; timestamp: number; value: number }[]>>({
    temperature: [],
    humidity: [],
    light: [],
    co2: [],
    ph: [],
    ec: [],
    do: []
  });
  const [isChartLoading, setIsChartLoading] = useState(false);

  const fetchDashboardData = async (mode: 'realtime' | 'custom', startStr?: string, endStr?: string) => {
    setIsChartLoading(true);
    try {
      let query = supabase
        .from('dynamic_telemetry')
        .select('created_at, payload')
        .eq('device_id', resolvedDeviceId)
        .order('created_at', { ascending: true });

      if (mode === 'realtime') {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', oneDayAgo);
      } else if (startStr && endStr) {
        const startLocal = new Date(`${startStr}T00:00:00`);
        const endLocal = new Date(`${endStr}T23:59:59.999`);
        
        query = query
          .gte('created_at', startLocal.toISOString())
          .lte('created_at', endLocal.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const processed: Record<string, { time: string; timestamp: number; value: number }[]> = {
        temperature: [], humidity: [], light: [], co2: [], ph: [], ec: [], do: []
      };

      if (data) {
        data.forEach((row: any) => {
          const date = new Date(row.created_at);
          const timestamp = date.getTime();
          const timeStr = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });

          Object.keys(processed).forEach(sensorKey => {
            const val = extractSensorValue(row.payload, sensorKey);
            if (val !== null) {
              let displayTime = '';
              if (mode === 'realtime') {
                displayTime = `${timeStr}|`;
              } else {
                const formattedDateStr = `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
                displayTime = `${timeStr}|${formattedDateStr}`;
              }

              processed[sensorKey].push({
                time: displayTime,
                timestamp,
                value: val
              });
            }
          });
        });
      }

      setChartData(processed);
    } catch (err: any) {
      console.error('Error fetching dashboard chart data:', err);
      showNotification(`Failed to load chart data: ${err.message}`, 'error');
    } finally {
      setIsChartLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(dashboardMode, startDate, endDate);

    if (dashboardMode !== 'realtime') return;

    const channel = supabase
      .channel(`realtime-telemetry-${Date.now()}-${Math.random()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dynamic_telemetry', filter: `device_id=eq.${resolvedDeviceId}` },
        (payload) => {
          console.log('Realtime telemetry event received:', payload);
          const newRow = payload.new;
          if (!newRow) return;

          const date = new Date(newRow.created_at);
          const timestamp = date.getTime();
          const timeStr = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });

          setChartData(prev => {
            const updated = { ...prev };
            const limitTime = Date.now() - 24 * 60 * 60 * 1000;

            Object.keys(updated).forEach(sensorKey => {
              const val = extractSensorValue(newRow.payload, sensorKey);
              if (val !== null) {
                const filtered = updated[sensorKey].filter(item => item.timestamp >= limitTime);
                const displayTime = `${timeStr}|`;
                updated[sensorKey] = [...filtered, { time: displayTime, timestamp, value: val }];
              }
            });

            return updated;
          });
        }
      )
      .subscribe((status) => {
        console.log('Realtime telemetry subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dashboardMode, resolvedDeviceId]);

  // Auth Status (Supabase)
  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user || null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // System-level Global Settings (For New Deployments / Local Overrides)
  const [sysSupabaseUrl, setSysSupabaseUrl] = useState('');
  const [sysSupabaseAnonKey, setSysSupabaseAnonKey] = useState('');
  const [sysSupabaseServiceKey, setSysSupabaseServiceKey] = useState('');
  const [sysMqttUrl, setSysMqttUrl] = useState('');
  const [sysMqttUser, setSysMqttUser] = useState('');
  const [sysMqttPass, setSysMqttPass] = useState('');
  const [sysGeminiKey, setSysGeminiKey] = useState('');
  const [sysWifiSsid, setSysWifiSsid] = useState('');
  const [sysWifiPass, setSysWifiPass] = useState('');

  // WiFi Scan & Setup 관련 상태 변수
  const [scannedWifiList, setScannedWifiList] = useState<Array<{ ssid: string; signal: string; security: string }>>([]);
  const [isWifiScanning, setIsWifiScanning] = useState(false);
  const [isWifiConnecting, setIsWifiConnecting] = useState(false);
  const [selectedWifiSsid, setSelectedWifiSsid] = useState('');
  const [wifiScanPassword, setWifiScanPassword] = useState('');
  const [scanWarningMessage, setScanWarningMessage] = useState('');

  useEffect(() => {
    setSysSupabaseUrl(localStorage.getItem('sf_sys_supabase_url') || '');
    setSysSupabaseAnonKey(localStorage.getItem('sf_sys_supabase_anon_key') || '');
    setSysSupabaseServiceKey(localStorage.getItem('sf_sys_supabase_service_key') || '');
    setSysMqttUrl(localStorage.getItem('sf_sys_mqtt_url') || '');
    setSysMqttUser(localStorage.getItem('sf_sys_mqtt_user') || '');
    setSysMqttPass(localStorage.getItem('sf_sys_mqtt_pass') || '');
    setSysGeminiKey(localStorage.getItem('sf_sys_gemini_key') || '');
    setSysWifiSsid(localStorage.getItem('sf_sys_wifi_ssid') || '');
    setSysWifiPass(localStorage.getItem('sf_sys_wifi_pass') || '');
  }, []);

  // Python Edge Logger Setup
  const [dbSyncInterval, setDbSyncInterval] = useState<Record<string, number>>({});

  // 모달 상태 관리
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [configSensor, setConfigSensor] = useState('Temperature');
  const [configRateValue, setConfigRateValue] = useState('10');
  const [configRateUnit, setConfigRateUnit] = useState('second');
  const [configLower, setConfigLower] = useState('');
  const [configUpper, setConfigUpper] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [loadedConfigs, setLoadedConfigs] = useState<any[]>([]);
  const [selectedArduinoBoard, setSelectedArduinoBoard] = useState<string>('Arduino UNO R4 WiFi');

  // 커스텀 장비 추가 관련 상태
  const [isAddEqModalOpen, setIsAddEqModalOpen] = useState(false);
  const [newEqName, setNewEqName] = useState('');
  const [newEqDesc, setNewEqDesc] = useState('');
  const [customEquipments, setCustomEquipments] = useState<{id: string, name: string, description: string}[]>([]);

  // 커스텀 센서 추가 관련 상태
  interface CustomSensor {
    id: string;
    name: string;
    samplingRateValue: number;
    samplingRateUnit: string;
    lowerLimit: number;
    upperLimit: number;
  }
  const [isAddSensorModalOpen, setIsAddSensorModalOpen] = useState(false);
  const [newSensorName, setNewSensorName] = useState('');
  const [newSensorRateValue, setNewSensorRateValue] = useState('10');
  const [newSensorRateUnit, setNewSensorRateUnit] = useState('second');
  const [newSensorLower, setNewSensorLower] = useState('');
  const [newSensorUpper, setNewSensorUpper] = useState('');
  const [customSensors, setCustomSensors] = useState<CustomSensor[]>([]);

  // 커스텀 장비 설정 로드
  useEffect(() => {
    const loadCustomEq = async () => {
      const { data } = await supabase.from('app_settings').select('value').eq('key', `sf_custom_equipment_${resolvedDeviceId}`).single();
      let parsed = data?.value;
      if (!parsed) {
        const saved = localStorage.getItem(`sf_custom_equipment_${resolvedDeviceId}`);
        if (saved) parsed = JSON.parse(saved);
      }
      if (parsed) {
        setCustomEquipments(parsed);
        const initialStates: Record<string, boolean> = {};
        parsed.forEach((eq: any) => { initialStates[eq.id] = false; });
        setCustomEquipmentStates(initialStates);
      }
    };
    loadCustomEq();
    }, [resolvedDeviceId]);

  // 커스텀 센서 설정 로드
  useEffect(() => {
    const loadCustomSensors = async () => {
      const { data } = await supabase.from('app_settings').select('value').eq('key', `sf_custom_sensors_${resolvedDeviceId}`).single();
      let parsed = data?.value;
      if (!parsed) {
        const saved = localStorage.getItem(`sf_custom_sensors_${resolvedDeviceId}`);
        if (saved) parsed = JSON.parse(saved);
      }
      if (parsed) {
        setCustomSensors(parsed);
      }
    };
    loadCustomSensors();
    }, [resolvedDeviceId]);

  const handleSaveCustomEquipment = async () => {
    if (!newEqName.trim()) return showNotification('Please enter the equipment name.', 'warning');
    const newEq = { id: `custom_${Date.now()}`, name: newEqName, description: newEqDesc };
    const updatedList = [...customEquipments, newEq];
    setCustomEquipments(updatedList);
    setCustomEquipmentStates(prev => ({ ...prev, [newEq.id]: false }));
    await supabase.from('app_settings').upsert({ key: `sf_custom_equipment_${resolvedDeviceId}`, value: updatedList });
    localStorage.setItem(`sf_custom_equipment_${resolvedDeviceId}`, JSON.stringify(updatedList));
    showNotification(`${newEqName} added successfully!`, 'success');
    setIsAddEqModalOpen(false);
    setNewEqName('');
    setNewEqDesc('');
  };

  const handleSaveCustomSensor = async () => {
    if (!newSensorName.trim()) return showNotification('Please enter the sensor name.', 'warning');
    if (!newSensorLower.trim() || !newSensorUpper.trim()) return showNotification('Please enter both lower and upper limits.', 'warning');
    
    const lower = parseFloat(newSensorLower);
    const upper = parseFloat(newSensorUpper);
    if (isNaN(lower) || isNaN(upper)) return showNotification('Limits must be numbers.', 'error');
    if (lower >= upper) return showNotification('Lower limit must be less than upper limit.', 'error');

    const newSensor: CustomSensor = {
      id: `custom_sensor_${Date.now()}`,
      name: newSensorName,
      samplingRateValue: parseFloat(newSensorRateValue) || 10,
      samplingRateUnit: newSensorRateUnit,
      lowerLimit: lower,
      upperLimit: upper
    };

    const configKey = `sf_sensor_config_${resolvedDeviceId}_${newSensorName.replace(/\s+/g, '_')}`;
    const initialConfig = {
      samplingRateValue: parseFloat(newSensorRateValue) || 10,
      samplingRateUnit: newSensorRateUnit,
      samplingRate: (parseFloat(newSensorRateValue) || 10) * (newSensorRateUnit === 'minute' ? 60 : newSensorRateUnit === 'hour' ? 3600 : 1),
      lowerThreshold: lower,
      upperThreshold: upper,
      lastUpdated: new Date().toISOString()
    };
    await supabase.from('app_settings').upsert({ key: configKey, value: initialConfig });
    localStorage.setItem(configKey, JSON.stringify(initialConfig));

    const updatedList = [...customSensors, newSensor];
    setCustomSensors(updatedList);
    await supabase.from('app_settings').upsert({ key: `sf_custom_sensors_${resolvedDeviceId}`, value: updatedList });
    localStorage.setItem(`sf_custom_sensors_${resolvedDeviceId}`, JSON.stringify(updatedList));
    showNotification(`${newSensorName} added successfully!`, 'success');
    
    setIsAddSensorModalOpen(false);
    setNewSensorName('');
    setNewSensorRateValue('10');
    setNewSensorRateUnit('second');
    setNewSensorLower('');
    setNewSensorUpper('');
  };

  // 장비 스케줄 설정 관련 상태
  const [isEquipConfigModalOpen, setIsEquipConfigModalOpen] = useState(false);
  const [configEquip, setConfigEquip] = useState('circulationFan');
  const [equipStartAmPm, setEquipStartAmPm] = useState('AM');
  const [equipStartHour, setEquipStartHour] = useState('08');
  const [equipStartMinute, setEquipStartMinute] = useState('00');
  const [equipStopAmPm, setEquipStopAmPm] = useState('PM');
  const [equipStopHour, setEquipStopHour] = useState('06');
  const [equipStopMinute, setEquipStopMinute] = useState('00');
  const [equipIsContinuous, setEquipIsContinuous] = useState(false);
  const [equipSchedules, setEquipSchedules] = useState<Record<string, { start: string, stop: string, isContinuous?: boolean }>>({});

  const loadAllEquipSchedules = async () => {
    const equipList = [...Object.keys(equipmentNamesList), ...customEquipments.map(eq => eq.id)];
    const newSchedules: Record<string, any> = {};
    
    const keys = equipList.map(e => `sf_equip_schedule_${resolvedDeviceId}_${e}`);
    const { data } = await supabase.from('app_settings').select('key, value').in('key', keys);
    
    equipList.forEach(e => {
      const key = `sf_equip_schedule_${resolvedDeviceId}_${e}`;
      const dbItem = data?.find(d => d.key === key);
      if (dbItem?.value) {
        newSchedules[e] = dbItem.value;
      } else {
        const saved = localStorage.getItem(key);
        if (saved) newSchedules[e] = JSON.parse(saved);
      }
    });
    setEquipSchedules(newSchedules);
  };

  useEffect(() => {
    loadAllEquipSchedules();
    }, [customEquipments, resolvedDeviceId]);

  useEffect(() => {
    if (isEquipConfigModalOpen) {
      const schedule = equipSchedules[configEquip];
      if (schedule) {
        setEquipIsContinuous(schedule.isContinuous === true);
        const [sAmPm, sTime] = schedule.start.split(' ');
        const [sHr, sMin] = sTime.split(':');
        setEquipStartAmPm(sAmPm);
        setEquipStartHour(sHr);
        setEquipStartMinute(sMin);

        const [stAmPm, stTime] = schedule.stop.split(' ');
        const [stHr, stMin] = stTime.split(':');
        setEquipStopAmPm(stAmPm);
        setEquipStopHour(stHr);
        setEquipStopMinute(stMin);
      } else {
        setEquipIsContinuous(false);
        setEquipStartAmPm('AM');
        setEquipStartHour('08');
        setEquipStartMinute('00');
        setEquipStopAmPm('PM');
        setEquipStopHour('06');
        setEquipStopMinute('00');
      }
    }
  }, [isEquipConfigModalOpen, configEquip, equipSchedules]);

  const handleSaveEquipSchedule = async () => {
    const startStr = `${equipStartAmPm} ${equipStartHour.padStart(2, '0')}:${equipStartMinute.padStart(2, '0')}`;
    const stopStr = `${equipStopAmPm} ${equipStopHour.padStart(2, '0')}:${equipStopMinute.padStart(2, '0')}`;
    const scheduleData = { start: startStr, stop: stopStr, isContinuous: equipIsContinuous };

    const key = `sf_equip_schedule_${resolvedDeviceId}_${configEquip}`;
    await supabase.from('app_settings').upsert({ key, value: scheduleData });
    localStorage.setItem(key, JSON.stringify(scheduleData));
    
    const equipName = equipmentNamesList[configEquip as keyof typeof equipmentNamesList] || customEquipments.find(e => e.id === configEquip)?.name || 'Equipment';
    showNotification(`${equipName} schedule saved successfully!`, 'success');
    
    loadAllEquipSchedules();
    setIsEquipConfigModalOpen(false);
  };

  const handleSaveSysSupabase = () => {
    localStorage.setItem('sf_sys_supabase_url', sysSupabaseUrl);
    localStorage.setItem('sf_sys_supabase_anon_key', sysSupabaseAnonKey);
    localStorage.setItem('sf_sys_supabase_service_key', sysSupabaseServiceKey);
    showNotification('Supabase settings saved. (Requires client restart to apply)', 'success');
  };
  const handleSaveSysMqtt = () => {
    localStorage.setItem('sf_sys_mqtt_url', sysMqttUrl);
    localStorage.setItem('sf_sys_mqtt_user', sysMqttUser);
    localStorage.setItem('sf_sys_mqtt_pass', sysMqttPass);
    showNotification('MQTT configuration saved.', 'success');
  };
  const handleSaveSysGemini = () => {
    localStorage.setItem('sf_sys_gemini_key', sysGeminiKey);
    showNotification('Gemini API Key saved locally.', 'success');
  };
  const handleSaveSysWifi = () => {
    localStorage.setItem('sf_sys_wifi_ssid', sysWifiSsid);
    localStorage.setItem('sf_sys_wifi_pass', sysWifiPass);
    showNotification('WiFi Network settings saved.', 'success');
  };

  // Wi-Fi 스캔 핸들러
  const handleScanWifi = async () => {
    setIsWifiScanning(true);
    setScanWarningMessage('');
    showNotification('Scanning surrounding Wi-Fi networks...', 'info');
    try {
      const response = await fetch('/api/wifi/scan');
      const data = await response.json();
      if (data.success) {
        setScannedWifiList(data.networks || []);
        if (data.isMock) {
          setScanWarningMessage(data.warning);
          showNotification('Scanned networks loaded (Using simulated data).', 'info');
        } else {
          showNotification(`Scan complete. Found ${data.networks.length} networks.`, 'success');
        }
      } else {
        showNotification(data.error || 'Failed to scan Wi-Fi networks.', 'error');
      }
    } catch (error: any) {
      console.error(error);
      showNotification('Error contacting Wi-Fi scan service.', 'error');
    } finally {
      setIsWifiScanning(false);
    }
  };

  // Wi-Fi 연결 핸들러
  const handleConnectWifi = async () => {
    if (!selectedWifiSsid) return showNotification('Please select a Wi-Fi network.', 'warning');
    
    setIsWifiConnecting(true);
    showNotification(`Connecting to ${selectedWifiSsid}...`, 'info');
    try {
      const response = await fetch('/api/wifi/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ssid: selectedWifiSsid, password: wifiScanPassword })
      });
      const data = await response.json();
      if (data.success) {
        showNotification(data.message || `Successfully connected to ${selectedWifiSsid}!`, 'success');
        
        // 연결 성공 시 기기 폼 설정값 및 로컬스토리지에도 반영
        localStorage.setItem('sf_wifi_ssid', selectedWifiSsid);
        localStorage.setItem('sf_wifi_password', wifiScanPassword);
        setWifiSsid(selectedWifiSsid);
        setWifiPassword(wifiScanPassword);
        
        // Form 초기화
        setWifiScanPassword('');
        setSelectedWifiSsid('');
      } else {
        showNotification(data.error || 'Failed to connect to Wi-Fi.', 'error');
      }
    } catch (error: any) {
      console.error(error);
      showNotification('Error contacting Wi-Fi connection service.', 'error');
    } finally {
      setIsWifiConnecting(false);
    }
  };

  // 센서 설정 모달이 열리거나 센서 종류(configSensor)를 변경할 때, 기존에 저장된 값을 폼에 불러오기
  useEffect(() => {
    const loadConfig = async () => {
      if (isConfigModalOpen) {
        const key = `sf_sensor_config_${resolvedDeviceId}_${configSensor.replace(/\s+/g, '_')}`;
        const { data } = await supabase.from('app_settings').select('value').eq('key', key).single();
        let parsed = data?.value;
        
        if (!parsed) {
          const saved = localStorage.getItem(key);
          if (saved) parsed = JSON.parse(saved);
        }
        
        if (parsed) {
          if (parsed.samplingRateValue) {
            setConfigRateValue(parsed.samplingRateValue.toString());
            setConfigRateUnit(parsed.samplingRateUnit || 'second');
          } else {
            setConfigRateValue(parsed.samplingRate?.toString() || '10');
            setConfigRateUnit('second');
          }
          setConfigLower(parsed.lowerThreshold !== undefined ? parsed.lowerThreshold.toString() : '');
          setConfigUpper(parsed.upperThreshold !== undefined ? parsed.upperThreshold.toString() : '');
        } else {
          const customSensor = customSensors.find(cs => cs.name === configSensor);
          if (customSensor) {
            setConfigRateValue(customSensor.samplingRateValue.toString());
            setConfigRateUnit(customSensor.samplingRateUnit || 'second');
            setConfigLower(customSensor.lowerLimit.toString());
            setConfigUpper(customSensor.upperLimit.toString());
          } else {
            setConfigRateValue('10');
            setConfigRateUnit('second');
            setConfigLower('');
            setConfigUpper('');
          }
        }
      }
    };
    loadConfig();
  }, [isConfigModalOpen, configSensor, customSensors]);

  // 센서 설정값을 화면에 바로 표시하기 위한 상태 관리
  const [sensorConfigs, setSensorConfigs] = useState<Record<string, { lowerThreshold: number, upperThreshold: number, samplingRate: string | number, samplingRateValue?: number, samplingRateUnit?: string }>>({});

  const loadAllSensorConfigs = async () => {
    const customNames = customSensors.map((s: any) => s.name);

    const sensorsList = [
      "Temperature",
      "Light Intensity",
      "Humidity",
      "Hydrogen Ion Concentration",
      "Electrical Conductivity",
      "Dissolved Oxygen",
      "Carbon Dioxide",
      ...customNames
    ];
    const newConfigs: Record<string, any> = {};
    
    const keys = sensorsList.map(s => `sf_sensor_config_${resolvedDeviceId}_${s.replace(/\s+/g, '_')}`);
    const { data } = await supabase.from('app_settings').select('key, value').in('key', keys);
    
    sensorsList.forEach(s => {
      const key = `sf_sensor_config_${resolvedDeviceId}_${s.replace(/\s+/g, '_')}`;
      const dbItem = data?.find(d => d.key === key);
      if (dbItem?.value) {
        newConfigs[s] = dbItem.value;
      } else {
        const saved = localStorage.getItem(key);
        if (saved) {
          newConfigs[s] = JSON.parse(saved);
        } else {
          const customSensor = customSensors.find((cs: any) => cs.name === s);
          if (customSensor) {
            newConfigs[s] = {
              samplingRateValue: customSensor.samplingRateValue,
              samplingRateUnit: customSensor.samplingRateUnit,
              lowerThreshold: customSensor.lowerLimit,
              upperThreshold: customSensor.upperLimit
            };
          }
        }
      }
    });
    setSensorConfigs(newConfigs);
  };

  useEffect(() => {
    loadAllSensorConfigs();
    }, [customSensors, resolvedDeviceId]);
  
  // 아두이노 핀 연결 상태 관리
  // 사용자가 쉽게 테스트할 수 있도록 자주 쓰이는 센서/기기를 기본값으로 세팅
  const [pinConfigs, setPinConfigs] = useState<Record<string, string[]>>({
    D2: ['DHT22 Temp/Humid Sensor'],
    A0: ['Soil Moisture Sensor'],
    A1: ['LDR Light Sensor'],
    D3: ['Relay CH1 (Grow Light)'],
    D4: ['Relay CH2 (Ventilation Fan)'],
    D5: ['Relay CH3 (Water Pump)'],
    I2C: ['LCD 16x2 I2C', 'BME280 Temp/Humid Sensor']
  });
  const [pinMappings, setPinMappings] = useState<Record<string, string[][]>>({
    D2: [['Temperature', 'Humidity']],
    A0: [['none']],
    A1: [['Light Intensity']],
    D3: [['growLight']],
    D4: [['circulationFan']],
    D5: [['waterPump']],
    I2C: [['none'], ['Temperature', 'Humidity']]
  });
  const [pinMqttTopics, setPinMqttTopics] = useState<Record<string, string[][]>>({
    D2: [['smartfarm/uno-r4/sensors']],
    A0: [['smartfarm/uno-r4/sensors']],
    A1: [['smartfarm/uno-r4/sensors']],
    D3: [['smartfarm/uno-r4/actuators/control']],
    D4: [['smartfarm/uno-r4/actuators/control']],
    D5: [['smartfarm/uno-r4/actuators/control']],
    I2C: [['smartfarm/uno-r4/actuators/control'], ['smartfarm/uno-r4/sensors', 'smartfarm/uno-r4/sensors']]
  });
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [mqttServer, setMqttServer] = useState('');
  const [mqttUsername, setMqttUsername] = useState('');
  const [mqttPassword, setMqttPassword] = useState('');
  const [pinCounts, setPinCounts] = useState<Record<string, number>>({ I2C: 2 });
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [generatedPythonCode, setGeneratedPythonCode] = useState<string>('');
  const [isPythonModalOpen, setIsPythonModalOpen] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [remoteLoggerRunning, setRemoteLoggerRunning] = useState<boolean>(false);

  // Supabase 실시간 센서 데이터 연동
  const sensors = useSupabaseSensors(resolvedDeviceId);

  // Network & MQTT Configuration 로드
  useEffect(() => {
    const loadNetworkSettings = async () => {
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'sf_network_mqtt').single();
      if (data?.value) {
        setWifiSsid(data.value.wifiSsid || '');
        setWifiPassword(data.value.wifiPassword || '');
        setMqttServer(data.value.mqttServer || '');
        setMqttUsername(data.value.mqttUsername || '');
        setMqttPassword(data.value.mqttPassword || '');
      } else {
        const savedWifiSsid = localStorage.getItem('sf_wifi_ssid');
        const savedWifiPass = localStorage.getItem('sf_wifi_password');
        const savedMqttServer = localStorage.getItem('sf_mqtt_server');
        const savedMqttUser = localStorage.getItem('sf_mqtt_username');
        const savedMqttPass = localStorage.getItem('sf_mqtt_password');
        
        if (savedWifiSsid) setWifiSsid(savedWifiSsid);
        if (savedWifiPass) setWifiPassword(savedWifiPass);
        if (savedMqttServer) setMqttServer(savedMqttServer);
        if (savedMqttUser) setMqttUsername(savedMqttUser);
        if (savedMqttPass) setMqttPassword(savedMqttPass);
      }

      // Edge Logger Settings 로드
      const { data: edgeLoggerData } = await supabase.from('app_settings').select('value').eq('key', 'sf_edge_logger_config').single();
      if (edgeLoggerData?.value?.syncInterval) {
        setDbSyncInterval(edgeLoggerData.value.syncInterval);
      } else {
        const savedSyncInterval = localStorage.getItem('sf_edge_logger_sync_interval');
        if (savedSyncInterval) {
          try {
            setDbSyncInterval(JSON.parse(savedSyncInterval));
          } catch(e) {
            setDbSyncInterval({});
          }
        }
      }
    };
    loadNetworkSettings();
  }, []);

  // 라즈베리파이 원격 로거 상태 로드
  useEffect(() => {
    const loadLoggerStatus = async () => {
      if (!resolvedDeviceId) return;
      const { data: loggerData } = await supabase.from('app_settings').select('value').eq('key', `sf_logger_status_${resolvedDeviceId}`).single();
      if (loggerData?.value) {
        setRemoteLoggerRunning(loggerData.value.running || false);
      } else {
        setRemoteLoggerRunning(false);
      }
    };
    loadLoggerStatus();
  }, [resolvedDeviceId]);

  // Network & MQTT Configuration 저장
  const handleSaveNetworkConfig = async () => {
    const networkData = { wifiSsid, wifiPassword, mqttServer, mqttUsername, mqttPassword };
    await supabase.from('app_settings').upsert({ key: 'sf_network_mqtt', value: networkData });
    
    localStorage.setItem('sf_wifi_ssid', wifiSsid);
    localStorage.setItem('sf_wifi_password', wifiPassword);
    localStorage.setItem('sf_mqtt_server', mqttServer);
    localStorage.setItem('sf_mqtt_username', mqttUsername);
    localStorage.setItem('sf_mqtt_password', mqttPassword);
    showNotification('Network & MQTT configuration saved!', 'success');
  };

  // Hardware Pin Configuration 로드
  useEffect(() => {
    const loadHardwareSettings = async () => {
      if (!resolvedDeviceId) return;
      
      let { data } = await supabase.from('app_settings').select('value').eq('key', `sf_hardware_pins_${resolvedDeviceId}`).single();
      let parsed = data?.value;
      if (!parsed) {
        const saved = localStorage.getItem(`sf_hardware_pins_${resolvedDeviceId}`);
        if (saved) parsed = JSON.parse(saved);
      }
      
      // 기기 변경 시 초기화
      if (!parsed) {
        setPinConfigs({});
        setPinMappings({});
        setPinMqttTopics({});
        setPinCounts({});
        return;
      }
      if (parsed) {
        if (parsed.pinConfigs) setPinConfigs(parsed.pinConfigs);
        if (parsed.pinMappings) setPinMappings(parsed.pinMappings);
        if (parsed.pinMqttTopics) setPinMqttTopics(parsed.pinMqttTopics);
        if (parsed.pinCounts) setPinCounts(parsed.pinCounts);
        // SCL/SDA 분리 구조를 I2C 하나로 합치는 하위 호환성 마이그레이션 함수
        const migrateI2C = (obj: any) => {
          if (!obj) return obj;
          const newObj = { ...obj };
          if (newObj.SCL) { newObj.I2C = newObj.SCL; delete newObj.SCL; }
          if (newObj.SDA) delete newObj.SDA;
          return newObj;
        };
        
        const migratedConfigs = migrateI2C(parsed.pinConfigs);
        const migratedCounts = migrateI2C(parsed.pinCounts);
        
        // 기존 단일 선택(String) 구조를 다중 선택(Array) 구조로 자동 변환
        const migratedMappings: Record<string, string[][]> = {};
        const oldMappings = migrateI2C(parsed.pinMappings);
        if (oldMappings) {
          Object.entries(oldMappings).forEach(([k, v]) => { 
            migratedMappings[k] = Array.isArray(v) 
              ? v.map((item: any) => {
                  const arr = Array.isArray(item) ? item : [item];
                  return arr.map(i => i === 'custom' ? 'none' : i);
                }) 
              : [['none']]; 
          });
        }

        // 동일하게 topics도 다중 배열 구조로 마이그레이션
        const migratedTopics: Record<string, string[][]> = {};
        const oldTopics = migrateI2C(parsed.pinMqttTopics);
        if (oldTopics) {
          Object.entries(oldTopics).forEach(([k, v]) => { migratedTopics[k] = Array.isArray(v) ? v.map((item: any) => Array.isArray(item) ? item : [item]) : [['']]; });
        }

        if (migratedConfigs) setPinConfigs(migratedConfigs);
        if (migratedMappings && Object.keys(migratedMappings).length > 0) setPinMappings(migratedMappings);
        if (migratedTopics && Object.keys(migratedTopics).length > 0) setPinMqttTopics(migratedTopics);
        if (migratedCounts) setPinCounts(migratedCounts);
      }
    };
    loadHardwareSettings();
  }, [resolvedDeviceId]);

  // Hardware Pin Configuration 저장
  const handleSaveHardwareConfig = async () => {
    if (!resolvedDeviceId) return;
    const hardwareData = { pinConfigs, pinMappings, pinMqttTopics, pinCounts };
    await supabase.from('app_settings').upsert({ key: `sf_hardware_pins_${resolvedDeviceId}`, value: hardwareData });
    localStorage.setItem(`sf_hardware_pins_${resolvedDeviceId}`, JSON.stringify(hardwareData));
    showNotification(`Hardware pin configuration saved for ${resolvedDeviceId}!`, 'success');
  };

  // 라즈베리파이 원격 로거 시작/정지 토글 함수
  const handleToggleRemoteLogger = async (state: boolean) => {
    setRemoteLoggerRunning(state);
    await supabase.from('app_settings').upsert({ key: `sf_logger_status_${resolvedDeviceId}`, value: { running: state } });
    showNotification(state ? 'Start command sent to Raspberry Pi Data Logger!' : 'Stop command sent to Raspberry Pi Data Logger.', state ? 'success' : 'warning');
  };

  const handlePinDeviceChange = (pinId: string, index: number, value: string) => {
    setPinConfigs(prev => {
      const current = prev[pinId] || [];
      const next = [...current];
      next[index] = value;
      return { ...prev, [pinId]: next };
    });
  };

  const handleRemoveBusDevice = (pinId: string, index: number) => {
    setPinCounts(prev => ({ ...prev, [pinId]: Math.max(1, (prev[pinId] || 1) - 1) }));
    setPinConfigs(prev => { const next = [...(prev[pinId] || [])]; next.splice(index, 1); return { ...prev, [pinId]: next }; });
    setPinMappings(prev => { const next = [...(prev[pinId] || [])]; next.splice(index, 1); return { ...prev, [pinId]: next }; });
    setPinMqttTopics(prev => { const next = [...(prev[pinId] || [])]; next.splice(index, 1); return { ...prev, [pinId]: next }; });
  };

  const handlePinMappingChange = (pinId: string, index: number, value: string[]) => {
    setPinMappings(prev => {
      const current = prev[pinId] || [];
      const next = [...current];
      next[index] = value;
      return { ...prev, [pinId]: next };
    });
    
    if (value.includes('none')) {
      // None 선택 시 기기 이름과 토픽을 비움(Clear)
      setPinConfigs(prev => {
        const current = prev[pinId] || [];
        const next = [...current];
        next[index] = '';
        return { ...prev, [pinId]: next };
      });
      setPinMqttTopics(prev => {
        const current = prev[pinId] || [];
        const next = [...current];
        next[index] = [];
        return { ...prev, [pinId]: next };
      });
    } else {
      // 매핑 항목 수에 맞게 MQTT Topic 배열 개수도 동기화 (자동 생성)
      setPinMqttTopics(prev => {
        const current = prev[pinId] || [];
        const next = [...current];
        const newTopics = value.map(mappingVal => {
          if (mappingVal === 'none') return '';
          
          // Check if mappingVal is an equipment
          const isEquipment = Object.keys(equipmentNamesList).includes(mappingVal) || customEquipments.some(eq => eq.id === mappingVal);
          
          // Auto-generate topic based on type
          if (isEquipment) {
            return `smartfarm/${resolvedDeviceId || 'pooh'}/equipment/${mappingVal}`;
          } else {
            return `smartfarm/${resolvedDeviceId || 'pooh'}/${mappingVal}`;
          }
        });
        next[index] = newTopics;
        return { ...prev, [pinId]: next };
      });
    }
  };

  const handlePinMqttTopicChange = (pinId: string, index: number, topicIndex: number, value: string) => {
    setPinMqttTopics(prev => {
      const current = prev[pinId] || [];
      const next = [...current];
      const nextTopics = [...(next[index] || [])];
      nextTopics[topicIndex] = value;
      next[index] = nextTopics;
      return { ...prev, [pinId]: next };
    });
  };

  // 센서별 단위(Unit) 반환 함수
  const getUnit = (sensor: string) => {
    switch(sensor) {
      case 'Temperature': return '(°C)';
      case 'Light Intensity': return '(µmol/m²s)';
      case 'Humidity': return '(%)';
      case 'Hydrogen Ion Concentration': return '(pH)';
      case 'Electrical Conductivity': return '(dS/m)';
      case 'Dissolved Oxygen': return '(mg/L)';
      case 'Carbon Dioxide': return '(ppm)';
      default: return '';
    }
  };

  // 카드 화면에 표시할 샘플링 주기 포맷 함수
  const formatSamplingRate = (config: any) => {
    if (config.samplingRateValue && config.samplingRateUnit) {
      const unitMap: Record<string, string> = { second: 'sec', minute: 'min', hour: 'hr' };
      return `${config.samplingRateValue} ${unitMap[config.samplingRateUnit] || 'sec'}`;
    }
    return `${config.samplingRate} sec`;
  };

  // 백엔드 Gemini API를 호출하여 C++ 아두이노 코드를 자동 생성하는 함수
  const handleGenerateCode = async () => {
    setIsGeneratingCode(true);
    showNotification('Sending hardware configurations to Gemini AI...', 'info');
    
    try {
      const payload = {
        boardInfo: { model: selectedArduinoBoard },
        networkInfo: { 
          wifiSsid, 
          wifiPassword, 
          mqttServer: mqttServer.replace(/^(mqtts?:\/\/)/, ''), 
          mqttUsername, 
          mqttPassword 
        },
        hardwarePins: {
          configs: pinConfigs,
          mappings: pinMappings,
          topics: pinMqttTopics
        },
      sensorSettings: sensorConfigs,
      geminiApiKey: sysGeminiKey
      };

      const response = await fetch('/api/generate-sketch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        // 응답이 'ok'가 아닐 경우, 본문을 텍스트로 먼저 읽어 JSON 파싱 에러를 방지합니다.
        const errorText = await response.text();
        try {
          // 서버가 JSON 형식의 에러 메시지를 보냈을 경우를 대비해 파싱을 시도합니다.
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || `Server error: ${response.status}`);
        } catch (e) {
          // 파싱에 실패하면, 응답은 HTML일 가능성이 높습니다. 디버깅을 위해 내용을 에러 메시지에 포함합니다.
          const shortError = errorText.substring(0, 500); // 너무 긴 HTML을 자릅니다.
          throw new Error(`An unexpected server error occurred (Status: ${response.status}). Response: ${shortError}...`);
        }
      }

      const data = await response.json();
      setGeneratedCode(data.code);
      setIsCodeModalOpen(true);
      showNotification('Arduino Sketch generated successfully by AI!', 'success');
      
    } catch (error: any) {
      console.error(error);
      showNotification(error.message, 'error');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const activeSensorsList = useMemo(() => {
    const list: { id: string, label: string }[] = [];
    Object.keys(SENSOR_METADATA).forEach(key => {
      if (activeSensors[key] !== false) {
        list.push({ id: key, label: SENSOR_METADATA[key].label });
      }
    });
    customSensors.forEach(cs => {
      if (activeSensors[cs.id] !== false) {
        list.push({ id: cs.id, label: cs.name });
      }
    });
    return list;
  }, [activeSensors, customSensors]);

  const handleIntervalChange = (sensorId: string, val: number) => {
    const newVal = val || 5;
    setDbSyncInterval(prev => {
      const updated = { ...prev, [sensorId]: newVal };
      localStorage.setItem('sf_edge_logger_sync_interval', JSON.stringify(updated));
      supabase.from('app_settings').upsert({ key: `sf_edge_logger_config_${resolvedDeviceId}`, value: { syncInterval: updated } }).then();
      return updated;
    });
  };

  // Raspberry Pi (Python) 코드 자동 생성 함수
  const handleGeneratePythonCode = async () => {
    // 설정값 저장 (app_settings 및 localStorage)
    await supabase.from('app_settings').upsert({ key: 'sf_edge_logger_config', value: { syncInterval: dbSyncInterval } });
    localStorage.setItem('sf_edge_logger_sync_interval', JSON.stringify(dbSyncInterval));

    setIsGeneratingCode(true); // 로딩 상태 공유
    showNotification('Loading Python logger script...', 'info');
    try {
      const response = await fetch(`/api/get-python-logger?intervalMap=${encodeURIComponent(JSON.stringify(dbSyncInterval))}`);
      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || `Server error: ${response.status}`);
        } catch (e) {
          const shortError = errorText.substring(0, 500);
          throw new Error(
            `An unexpected server error occurred (Status: ${response.status}). Response: ${shortError}...`
          );
        }
      }
      const data = await response.json();
      setGeneratedPythonCode(data.code);
      setIsPythonModalOpen(true);
      showNotification('Python script loaded successfully!', 'success');
    } catch (error: any) {
      console.error(error);
      showNotification(error.message, 'error');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  // 설정 리뷰 및 검증 로직
  const reviewConfig = () => {
    if (!configRateValue || parseFloat(configRateValue) <= 0) return showNotification('Please enter a valid sampling rate.', 'warning');
    if (!configLower || !configUpper) return showNotification('Please enter both lower and upper thresholds.', 'warning');
    if (parseFloat(configLower) >= parseFloat(configUpper)) return showNotification('Lower threshold must be less than upper threshold.', 'error');
    setIsReviewing(true);
  };

  // 설정 저장 로직 (localStorage 활용)
  const saveConfig = async () => {
    const configData = {
      samplingRateValue: parseFloat(configRateValue) || 10,
      samplingRateUnit: configRateUnit,
      samplingRate: (parseFloat(configRateValue) || 10) * (configRateUnit === 'minute' ? 60 : configRateUnit === 'hour' ? 3600 : 1), // 하위 호환성용 초단위 변환
      lowerThreshold: parseFloat(configLower),
      upperThreshold: parseFloat(configUpper),
      lastUpdated: new Date().toISOString()
    };
    
    const key = `sf_sensor_config_${resolvedDeviceId}_${configSensor.replace(/\s+/g, '_')}`;
    await supabase.from('app_settings').upsert({ key, value: configData });
    localStorage.setItem(key, JSON.stringify(configData));
    
    showNotification(`${configSensor} configuration saved successfully!`, 'success');
    
    loadAllSensorConfigs(); // 저장 후 상태 갱신

    setConfigLower('');
    setConfigUpper('');
    setIsReviewing(false);
    setIsConfigModalOpen(false);
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        scopes: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/spreadsheets',
        queryParams: {
          prompt: 'consent',
        }
      }
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // 센서의 측정값과 임계값(Threshold)을 비교하여 상태(정상/경고)를 반환하는 함수
  const getSensorStatus = (sensorName: string, value: number, isActive: boolean, defaultText: string) => {
    if (!isActive) return { text: 'Disabled', bg: 'bg-gray-400' };
    const config = sensorConfigs[sensorName];
    if (config && (value < config.lowerThreshold || value > config.upperThreshold)) {
      return { text: 'Out of Range', bg: 'bg-danger' };
    }
    return { text: defaultText, bg: 'bg-success' };
  };

  const tempStatus = getSensorStatus('Temperature', sensors.temperature, activeSensors.temperature, 'Normal');
  const humStatus = getSensorStatus('Humidity', sensors.humidity, activeSensors.humidity, 'Normal');
  const lightStatus = getSensorStatus('Light Intensity', sensors.light, activeSensors.light, 'Normal');
  const co2Status = getSensorStatus('Carbon Dioxide', sensors.co2, activeSensors.co2, 'Normal');
  const phStatus = getSensorStatus('Hydrogen Ion Concentration', sensors.ph, activeSensors.ph, 'Normal');
  const ecStatus = getSensorStatus('Electrical Conductivity', sensors.ec, activeSensors.ec, 'Normal');
  const doStatus = getSensorStatus('Dissolved Oxygen', sensors.do, activeSensors.do, 'Normal');

  // 다중 선택 드롭다운 옵션 정의
  const mappingOptions = [
    { group: 'Sensors', items: [
      { label: 'Temperature', value: 'Temperature' }, { label: 'Humidity', value: 'Humidity' }, { label: 'Light Intensity', value: 'Light Intensity' },
      { label: 'pH', value: 'Hydrogen Ion Concentration' }, { label: 'EC', value: 'Electrical Conductivity' }, { label: 'DO', value: 'Dissolved Oxygen' }, { label: 'Carbon Dioxide', value: 'Carbon Dioxide' }
    ]},
    { group: 'Equipment', items: [
      ...Object.entries(equipmentNamesList).map(([k, v]) => ({ label: v, value: k })),
      ...customEquipments.map(eq => ({ label: eq.name, value: eq.id }))
    ]}
  ];

  // MQTT Topic Placeholder 동적 생성 (이전 입력값 기반)
  let commonTopicPrefix = 'smartfarm/uno-r4';
  for (const pinId in pinMqttTopics) {
    const found = pinMqttTopics[pinId]?.flat().find(t => t && t.includes('/'));
    if (found) {
      const parts = found.split('/');
      parts.pop(); // 마지막 depth 제거 (예: temp, ppfd 등)
      commonTopicPrefix = parts.join('/');
      break;
    }
  }
  const topicPlaceholder = `e.g. ${commonTopicPrefix}/**`;

  return (
    <div className="animate-[fadeIn_0.5s_ease-in-out] w-full">
      {currentTab === 'home' && (
        <div className="animate-[fadeIn_0.5s_ease-in-out] w-full space-y-6">
          {/* Welcome User Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white font-bold text-xl shadow-md">
                {user ? user.email[0].toUpperCase() : 'G'}
              </div>
              <div>
                <h2 className="text-xl font-bold text-primary">Pooh's Smart Farm</h2>
                <p className="text-sm text-gray-500 font-medium">
                  {user ? `Logged in as: ${user.email}` : 'Guest User (Login Recommended)'}
                </p>
              </div>
            </div>
            {user ? (
              <button onClick={handleLogout} className="bg-light hover:bg-gray-200 text-danger border border-danger/30 hover:border-danger px-5 py-2.5 rounded-full text-sm font-semibold transition-all">
                Sign Out
              </button>
            ) : (
              <button onClick={handleGoogleLogin} className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-md">
                Sign in with Google
              </button>
            )}
          </div>

          {/* Quick Setup Banner */}
          <div className="bg-gradient-to-r from-secondary/10 to-primary/5 rounded-2xl p-6 border border-secondary/20 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
            <div>
              <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                <Tractor size={20} className="text-secondary" />
                Facility Configuration Required
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                시스템을 사용하기 전에 가장 먼저 시설(온실/베드)을 등록하고 센서 및 장비를 설정해주세요.
              </p>
            </div>
            <button
              onClick={() => router.push('?tab=facilities')}
              className="whitespace-nowrap px-6 py-3 bg-secondary hover:bg-secondary-dark text-white rounded-xl font-semibold shadow-md transition-all flex items-center gap-2"
            >
              Go to Facilities Settings <ChevronRight size={18} />
            </button>
          </div>

          {/* Grid Layout: Weather and System connections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Weather Card - Glassmorphism style */}
            <div className={`lg:col-span-2 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden transition-all duration-500 hover:shadow-2xl flex flex-col justify-between min-h-[320px] bg-gradient-to-br from-indigo-900/75 to-indigo-950/75 backdrop-blur-md`}>
              {/* Background abstract graphic elements */}
              <div className="absolute right-[-40px] top-[-40px] w-48 h-48 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
              <div className="absolute left-[-20px] bottom-[-20px] w-36 h-36 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <i className="mdi mdi-map-marker text-xl text-secondary"></i>
                    <span className="font-semibold text-sm tracking-wide">{locationName}</span>
                  </div>
                  <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-md">Local Weather</span>
                </div>

                {weatherLoading ? (
                  <div className="py-12 text-center flex flex-col items-center justify-center">
                    <div className="animate-spin inline-block w-8 h-8 border-4 border-white border-t-transparent rounded-full mb-3" />
                    <p className="text-white/80 text-sm">Synchronizing live climate data...</p>
                  </div>
                ) : weatherError ? (
                  <div className="py-12 text-center text-white/70 text-sm font-medium">
                    <i className="mdi mdi-cloud-alert text-4xl mb-2 block"></i>
                    {weatherError}
                  </div>
                ) : weatherData ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div>
                      <div className="flex items-center gap-4 mb-2">
                        <div className="flex items-baseline gap-1">
                          <span className="text-6xl font-black tracking-tight">{weatherData.temp.toFixed(1)}</span>
                          <span className="text-3xl font-light">°C</span>
                        </div>
                        <i className={`mdi ${getWeatherIcon(weatherData.weatherCode)} text-5xl ml-2`}></i>
                      </div>
                      <p className="text-white/80 text-sm font-medium">
                        Precipitation: <span className="text-white font-bold">{weatherData.precipitation} mm</span>
                      </p>
                      
                      {/* Severe Weather Alert check */}
                      {weatherData.precipitation > 10 ? (
                        <div className="mt-4 bg-danger/25 border border-danger/40 text-white rounded-lg p-2.5 text-xs flex items-center gap-2 animate-[pulse_2s_infinite]">
                          <i className="mdi mdi-alert-circle text-lg"></i>
                          <span className="font-semibold">Heavy Rain Alert! Protect facilities.</span>
                        </div>
                      ) : weatherData.windSpeed > 10 ? (
                        <div className="mt-4 bg-warning/20 border border-warning/40 text-white rounded-lg p-2.5 text-xs flex items-center gap-2 animate-[pulse_2s_infinite]">
                          <i className="mdi mdi-weather-windy text-lg"></i>
                          <span className="font-semibold">Strong Wind Alert! Check ventilation doors.</span>
                        </div>
                      ) : weatherData.temp > 35 ? (
                        <div className="mt-4 bg-danger/25 border border-danger/40 text-white rounded-lg p-2.5 text-xs flex items-center gap-2">
                          <i className="mdi mdi-thermometer-alert text-lg"></i>
                          <span className="font-semibold">Extreme Heat Warning! Optimize HVAC systems.</span>
                        </div>
                      ) : weatherData.temp < 0 ? (
                        <div className="mt-4 bg-info/20 border border-info/40 text-white rounded-lg p-2.5 text-xs flex items-center gap-2">
                          <i className="mdi mdi-snowflake text-lg"></i>
                          <span className="font-semibold">Frost Warning! Turn on internal heaters.</span>
                        </div>
                      ) : (
                        <div className="mt-4 bg-success/20 border border-success/45 text-white rounded-lg p-2.5 text-xs flex items-center gap-2">
                          <i className="mdi mdi-check-circle text-base text-success"></i>
                          <span className="font-semibold text-white/95">Weather conditions are safe. Normal operation.</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-y-4 gap-x-2 bg-white/5 p-4 rounded-xl backdrop-blur-md border border-white/10 text-xs">
                      <div className="flex items-center gap-2">
                        <i className="mdi mdi-water text-base text-sky-400"></i>
                        <div>
                          <div className="text-white/60 font-medium">Humidity</div>
                          <div className="font-bold text-white">{weatherData.humidity} %</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <i className="mdi mdi-weather-windy text-base text-teal-300"></i>
                        <div>
                          <div className="text-white/60 font-medium">Wind Speed</div>
                          <div className="font-bold text-white">{weatherData.windSpeed} m/s</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <i className="mdi mdi-thermometer-water text-base text-purple-300"></i>
                        <div>
                          <div className="text-white/60 font-medium">Dew Point</div>
                          <div className="font-bold text-white">{weatherData.dewPoint} °C</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <i className="mdi mdi-weather-sunset-up text-base text-amber-400"></i>
                        <div>
                          <div className="text-white/60 font-medium">Sun Rise/Set</div>
                          <div className="font-bold text-white">{weatherData.sunrise} / {weatherData.sunset}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-white/50 text-xs">Awaiting geographical lookup...</div>
                )}
              </div>
              <p className="text-[10px] text-white/40 mt-4 text-right">Data provided by Open-Meteo API (No Key)</p>
            </div>

            {/* Global Infrastructure */}
            <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col justify-between space-y-4">
              <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                <span className="w-1.5 h-4 bg-secondary rounded-full"></span>
                Global Infrastructure
              </h3>
              
              <div className="space-y-3.5">
                {/* MQTT Broker Card */}
                <div className="flex justify-between items-center p-3.5 bg-light rounded-xl hover:bg-gray-200 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center text-info">
                      <i className="mdi mdi-server-network text-lg"></i>
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider">MQTT Broker</span>
                      <span className="text-sm font-bold text-primary truncate max-w-[120px] block">
                        {mqttServer ? (mqttServer.includes('hivemq') ? 'HiveMQ Cloud' : mqttServer.split(':')[0]) : 'Not configured'}
                      </span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${mqttServer ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                    {mqttServer ? 'Connected' : 'Offline'}
                  </span>
                </div>

                {/* Supabase Connection */}
                <div className="flex justify-between items-center p-3.5 bg-light rounded-xl hover:bg-gray-200 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <i className="mdi mdi-database text-lg"></i>
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Supabase DB</span>
                      <span className="text-sm font-bold text-primary">Data Warehouse</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full inline-block ${dbConnected ? 'bg-success animate-pulse' : 'bg-danger'}`}></span>
                    <span className={`text-[10px] font-bold ${dbConnected ? 'text-success' : 'text-danger'}`}>
                      {dbConnected ? 'Healthy' : 'Disconnected'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Facility Overview Cards */}
          <div className="mt-8 space-y-12">
            {facilities.map((facility, idx) => (
              <FacilityOverviewCard 
                key={facility.device_id}
                deviceId={facility.device_id} 
                facilityName={facility.description || facility.device_id}
                showNotification={showNotification}
                SENSOR_METADATA={SENSOR_METADATA}
                crops={facility.crops || []}
                colorIndex={idx}
              />
            ))}
            {facilities.length === 0 && (
              <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                <p>No facilities configured.</p>
                <button onClick={() => router.push('?tab=facilities')} className="mt-4 text-primary font-semibold underline">Go to Settings to add one</button>
              </div>
            )}
          </div>
        </div>
      )}

      {currentTab === 'dashboard' && (
        <div className="animate-[fadeIn_0.5s_ease-in-out]">
          {/* Facility Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6 hide-scrollbar">
            {facilities.map(f => {
              const isSelected = (currentDeviceId === f.device_id) || (!currentDeviceId && f === facilities[0]);
              return (
                <button 
                  key={f.device_id}
                  onClick={() => router.push(`?tab=${currentTab}&deviceId=${f.device_id}`)}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap border flex items-center gap-2 ${
                    isSelected 
                      ? 'bg-secondary text-white border-secondary shadow-md' 
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  {f.description || f.device_id}
                  {isSelected && <span className="w-2 h-2 rounded-full bg-white ml-1"></span>}
                </button>
              )
            })}
          </div>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
            <h2 className="text-2xl font-semibold text-primary">Dashboard Overview</h2>
          </div>

          {/* Search Controls Card */}
          <div className="bg-white rounded-xl p-5 mb-6 shadow-sm border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setDashboardMode('realtime');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  dashboardMode === 'realtime'
                    ? 'bg-secondary text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Real-time (Last 24h)
              </button>
              <button
                onClick={() => {
                  setDashboardMode('custom');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  dashboardMode === 'custom'
                    ? 'bg-secondary text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Custom Range
              </button>
            </div>

            {dashboardMode === 'custom' && (
              <div className="flex flex-wrap items-center gap-2 animate-[fadeIn_0.2s_ease-in-out]">
                <div className="flex items-center gap-1.5 font-medium text-gray-700 text-sm">
                  <span>Start Date:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="p-2 border border-gray-300 rounded-lg text-sm focus:border-secondary outline-none bg-white font-normal"
                  />
                </div>
                <div className="flex items-center gap-1.5 font-medium text-gray-700 text-sm">
                  <span>End Date:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="p-2 border border-gray-300 rounded-lg text-sm focus:border-secondary outline-none bg-white font-normal"
                  />
                </div>
                <button
                  onClick={() => fetchDashboardData('custom', startDate, endDate)}
                  className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm"
                  disabled={isChartLoading}
                >
                  {isChartLoading ? 'Searching...' : 'Search'}
                </button>
              </div>
            )}
            
            {dashboardMode === 'realtime' && (
              <div className="flex items-center gap-2 text-xs font-semibold text-secondary animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary inline-block"></span>
                <span>Subscribed to Live Telemetry Updates</span>
              </div>
            )}
          </div>

          {/* Loading Indicator or Chart Data */}
          {isChartLoading ? (
            <div className="py-20 text-center">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-secondary border-t-transparent rounded-full mb-3" />
              <p className="text-gray-500 text-sm font-medium">Fetching sensor history from database...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Active Sensors Section */}
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                  <span className="w-2 h-5 bg-secondary rounded-full inline-block"></span>
                  Active Sensors
                </h3>
                {Object.keys(SENSOR_METADATA).filter(key => activeSensors[key as keyof typeof activeSensors] !== false).length === 0 ? (
                  <div className="bg-white p-8 text-center text-gray-400 rounded-xl border border-gray-200">
                    No active sensors configured in system settings.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {Object.entries(SENSOR_METADATA)
                      .filter(([key]) => activeSensors[key as keyof typeof activeSensors] !== false)
                      .map(([key, meta]) => {
                        const dataPoints = chartData[key] || [];
                        const latestVal = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].value : null;

                        return (
                          <div key={key} className="bg-white rounded-xl p-5 shadow-sm border border-gray-150 transition-all hover:shadow-md">
                            <div className="flex justify-between items-center mb-4">
                              <div>
                                <h4 className="font-bold text-gray-800 text-lg">{meta.label}</h4>
                                <p className="text-xs text-gray-400">Total data points: {dataPoints.length}</p>
                              </div>
                              <div className="text-right">
                                <span className="text-2xl font-black text-primary">
                                  {latestVal !== null ? `${latestVal.toFixed(1)}` : '--'}
                                </span>
                                <span className="text-xs font-semibold text-gray-500 ml-1">{meta.unit}</span>
                              </div>
                            </div>
                            
                            <div className="h-[250px] w-full mt-2">
                              {dataPoints.length === 0 ? (
                                <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border border-dashed text-sm text-gray-400">
                                  No data recorded in the selected period.
                                </div>
                              ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={dataPoints} margin={{ top: 10, right: 10, left: -20, bottom: 50 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
                                    <XAxis dataKey="time" tick={createXAxisTick(dataPoints)} />
                                    <YAxis tick={{ fontSize: 10, fill: '#888' }} domain={['auto', 'auto']} />
                                    <Tooltip 
                                      contentStyle={{ backgroundColor: '#2c3e50', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
                                      labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                                      labelFormatter={(label) => {
                                        if (!label) return '';
                                        const [timeStr, dateStr] = label.split('|');
                                        return dateStr ? `${dateStr} ${timeStr}` : timeStr;
                                      }}
                                    />
                                    <Line type="monotone" dataKey="value" stroke={meta.color} strokeWidth={2.5} dot={dataPoints.length < 50} activeDot={{ r: 6 }} />
                                  </LineChart>
                                </ResponsiveContainer>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Disabled Sensors Section */}
              <div className="pt-4">
                <h3 className="text-lg font-semibold text-gray-500 mb-4 flex items-center gap-2">
                  <span className="w-2 h-5 bg-gray-300 rounded-full inline-block"></span>
                  Disabled Sensors
                </h3>
                {Object.keys(SENSOR_METADATA).filter(key => activeSensors[key as keyof typeof activeSensors] === false).length === 0 ? (
                  <div className="bg-white p-6 text-center text-gray-400 rounded-xl border border-gray-200 text-sm">
                    No disabled sensors.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 opacity-60">
                    {Object.entries(SENSOR_METADATA)
                      .filter(([key]) => activeSensors[key as keyof typeof activeSensors] === false)
                      .map(([key, meta]) => {
                        return (
                          <div key={key} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 bg-gray-50/50">
                            <div className="flex justify-between items-center mb-4">
                              <div>
                                <h4 className="font-bold text-gray-500 text-lg">{meta.label} <span className="text-xs font-normal text-danger border border-danger/30 rounded px-1.5 py-0.5 ml-1 bg-danger/5">Disabled</span></h4>
                                <p className="text-xs text-gray-400">Sensor monitoring is currently disabled in system settings.</p>
                              </div>
                            </div>
                            
                            <div className="h-[200px] w-full mt-2">
                              {/* Draw an empty chart framework to display basic chart structure */}
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={[]} margin={{ top: 10, right: 10, left: -20, bottom: 50 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                                  <XAxis dataKey="time" tick={createXAxisTick([])} />
                                  <YAxis tick={{ fontSize: 9, fill: '#aaa' }} domain={[0, 100]} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {currentTab === 'sensors' && (
        <div>
            {/* Facility Selector */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 hide-scrollbar">
              {facilities.map(f => {
                const isSelected = (currentDeviceId === f.device_id) || (!currentDeviceId && f === facilities[0]);
                return (
                  <button 
                    key={f.device_id}
                    onClick={() => router.push(`?tab=${currentTab}&deviceId=${f.device_id}`)}
                    className={`px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap border flex items-center gap-2 ${
                      isSelected 
                        ? 'bg-secondary text-white border-secondary shadow-md' 
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    {f.description || f.device_id}
                    {isSelected && <span className="w-2 h-2 rounded-full bg-white ml-1"></span>}
                  </button>
                )
              })}
            </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h2 className="text-2xl font-semibold text-primary">Sensor Settings</h2>
            <div className="flex flex-wrap gap-2 md:gap-4">
              <button 
                onClick={async () => {
                  const defaultSensors = ["Temperature", "Light Intensity", "Humidity", "Hydrogen Ion Concentration", "Electrical Conductivity", "Dissolved Oxygen", "Carbon Dioxide"];
                  const customNames = customSensors.map(cs => cs.name);
                  const sensorsList = [...defaultSensors, ...customNames];
                  const keys = sensorsList.map(s => `sf_sensor_config_${resolvedDeviceId}_${s.replace(/\s+/g, '_')}`);
                  const { data } = await supabase.from('app_settings').select('key, value').in('key', keys);

                  const configs = sensorsList.map(s => {
                    const key = `sf_sensor_config_${resolvedDeviceId}_${s.replace(/\s+/g, '_')}`;
                    const dbItem = data?.find(d => d.key === key);
                    if (dbItem?.value) return { sensor: s, ...dbItem.value };
                    
                    const saved = localStorage.getItem(key);
                    if (saved) return { sensor: s, ...JSON.parse(saved) };

                    const customSensor = customSensors.find(cs => cs.name === s);
                    if (customSensor) {
                      return {
                        sensor: s,
                        samplingRateValue: customSensor.samplingRateValue,
                        samplingRateUnit: customSensor.samplingRateUnit,
                        lowerThreshold: customSensor.lowerLimit,
                        upperThreshold: customSensor.upperLimit,
                        lastUpdated: new Date().toISOString()
                      };
                    }
                    
                    return { sensor: s, empty: true };
                  });
                  setLoadedConfigs(configs);
                  setIsLoadModalOpen(true);
                }} 
                className="flex items-center gap-2 bg-info hover:bg-info/90 text-white px-4 py-2 rounded-lg transition-all"
              >
                <FolderOpen size={18} /> Load Configures
              </button>
              <button 
                onClick={() => { setIsConfigModalOpen(true); setIsReviewing(false); }} 
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition-all"
              >
                <SlidersHorizontal size={18} /> Configure Sensors
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.05)] border-l-4 border-secondary transition-all hover:shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-primary">Smart Farm Monitoring Sensors</h3>
            </div>

            {/* 대형 센서 그리드 (온도, 습도, 광량) */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5 mt-4">
              <div className={`bg-light p-8 rounded-xl text-center transition-colors ${activeSensors.temperature ? 'hover:bg-gray-200' : 'opacity-40 grayscale pointer-events-none'}`}>
                <div className="text-secondary mb-4"><i className="mdi mdi-thermometer text-5xl"></i></div>
                <div className="text-lg font-semibold text-primary">Temperature</div>
                {sensorConfigs['Temperature'] && (
                  <div className="text-xs text-gray-500 font-medium mt-1">
                    Limit: {sensorConfigs['Temperature'].lowerThreshold}°C ~ {sensorConfigs['Temperature'].upperThreshold}°C ({formatSamplingRate(sensorConfigs['Temperature'])})
                  </div>
                )}
                <div className="text-4xl font-bold my-5 text-primary">{activeSensors.temperature ? `${sensors.temperature.toFixed(1)}°C` : '-'}</div>
                <span className={`px-4 py-1.5 rounded-full text-xs font-medium text-white tracking-wide ${tempStatus.bg}`}>{tempStatus.text}</span>
              </div>
              <div className={`bg-light p-8 rounded-xl text-center transition-colors ${activeSensors.humidity ? 'hover:bg-gray-200' : 'opacity-40 grayscale pointer-events-none'}`}>
                <div className="text-secondary mb-4"><i className="mdi mdi-water-percent text-5xl"></i></div>
                <div className="text-lg font-semibold text-primary">Humidity</div>
                {sensorConfigs['Humidity'] && (
                  <div className="text-xs text-gray-500 font-medium mt-1">
                    Limit: {sensorConfigs['Humidity'].lowerThreshold}% ~ {sensorConfigs['Humidity'].upperThreshold}% ({formatSamplingRate(sensorConfigs['Humidity'])})
                  </div>
                )}
                <div className="text-4xl font-bold my-5 text-primary">{activeSensors.humidity ? `${sensors.humidity}%` : '-'}</div>
                <span className={`px-4 py-1.5 rounded-full text-xs font-medium text-white tracking-wide ${humStatus.bg}`}>{humStatus.text}</span>
              </div>
              <div className={`bg-light p-8 rounded-xl text-center transition-colors ${activeSensors.light ? 'hover:bg-gray-200' : 'opacity-40 grayscale pointer-events-none'}`}>
                <div className="text-secondary mb-4"><i className="mdi mdi-white-balance-sunny text-5xl"></i></div>
                <div className="text-lg font-semibold text-primary">Light Intensity</div>
                {sensorConfigs['Light Intensity'] && (
                  <div className="text-xs text-gray-500 font-medium mt-1">
                    Limit: {sensorConfigs['Light Intensity'].lowerThreshold} ~ {sensorConfigs['Light Intensity'].upperThreshold} µmol/m²s ({formatSamplingRate(sensorConfigs['Light Intensity'])})
                  </div>
                )}
                <div className="text-4xl font-bold my-5 text-primary">{activeSensors.light ? `${sensors.light} µmol/m²s` : '-'}</div>
                <span className={`px-4 py-1.5 rounded-full text-xs font-medium text-white tracking-wide ${lightStatus.bg}`}>{lightStatus.text}</span>
              </div>
            </div>

            <hr className="border-0 border-t border-gray-200 my-8" />

            {/* 소형 센서 그리드 (CO2, pH, EC, DO) */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
              <div className={`bg-light p-5 rounded-lg text-center transition-colors ${activeSensors.co2 ? 'hover:bg-gray-200' : 'opacity-40 grayscale pointer-events-none'}`}>
                <div className="text-secondary mb-2"><i className="mdi mdi-molecule-co2 text-4xl"></i></div>
                <div className="text-sm font-semibold text-gray-700">Carbon Dioxide</div>
                {sensorConfigs['Carbon Dioxide'] && (
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    Limit: {sensorConfigs['Carbon Dioxide'].lowerThreshold} ~ {sensorConfigs['Carbon Dioxide'].upperThreshold} ppm ({formatSamplingRate(sensorConfigs['Carbon Dioxide'])})
                  </div>
                )}
                <div className="text-2xl font-bold my-3 text-primary">{activeSensors.co2 ? `${sensors.co2} ppm` : '-'}</div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${co2Status.bg}`}>{co2Status.text}</span>
              </div>
              <div className={`bg-light p-5 rounded-lg text-center transition-colors ${activeSensors.ph ? 'hover:bg-gray-200' : 'opacity-40 grayscale pointer-events-none'}`}>
                <div className="text-secondary mb-2"><i className="mdi mdi-flask text-4xl"></i></div>
                <div className="text-sm font-semibold text-gray-700">Hydrogen Ion Concentration</div>
                {sensorConfigs['Hydrogen Ion Concentration'] && (
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    Limit: {sensorConfigs['Hydrogen Ion Concentration'].lowerThreshold} ~ {sensorConfigs['Hydrogen Ion Concentration'].upperThreshold} pH ({formatSamplingRate(sensorConfigs['Hydrogen Ion Concentration'])})
                  </div>
                )}
                <div className="text-2xl font-bold my-3 text-primary">{activeSensors.ph ? sensors.ph.toFixed(1) : '-'}</div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${phStatus.bg}`}>{phStatus.text}</span>
              </div>
              <div className={`bg-light p-5 rounded-lg text-center transition-colors ${activeSensors.ec ? 'hover:bg-gray-200' : 'opacity-40 grayscale pointer-events-none'}`}>
                <div className="text-secondary mb-2"><i className="mdi mdi-lightning-bolt text-4xl"></i></div>
                <div className="text-sm font-semibold text-gray-700">Electrical Conductivity</div>
                {sensorConfigs['Electrical Conductivity'] && (
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    Limit: {sensorConfigs['Electrical Conductivity'].lowerThreshold} ~ {sensorConfigs['Electrical Conductivity'].upperThreshold} dS/m ({formatSamplingRate(sensorConfigs['Electrical Conductivity'])})
                  </div>
                )}
                <div className="text-2xl font-bold my-3 text-primary">{activeSensors.ec ? `${sensors.ec.toFixed(1)} dS/m` : '-'}</div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${ecStatus.bg}`}>{ecStatus.text}</span>
              </div>
              <div className={`bg-light p-5 rounded-lg text-center transition-colors ${activeSensors.do ? 'hover:bg-gray-200' : 'opacity-40 grayscale pointer-events-none'}`}>
                <div className="text-secondary mb-2"><i className="mdi mdi-chart-bubble text-4xl"></i></div>
                <div className="text-sm font-semibold text-gray-700">Dissolved Oxygen</div>
                {sensorConfigs['Dissolved Oxygen'] && (
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    Limit: {sensorConfigs['Dissolved Oxygen'].lowerThreshold} ~ {sensorConfigs['Dissolved Oxygen'].upperThreshold} mg/L ({formatSamplingRate(sensorConfigs['Dissolved Oxygen'])})
                  </div>
                )}
                <div className="text-2xl font-bold my-3 text-primary">{activeSensors.do ? `${sensors.do.toFixed(1)} mg/L` : '-'}</div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${doStatus.bg}`}>{doStatus.text}</span>
              </div>
            </div>
          </div>

          {/* Custom Sensors Section */}
          {customSensors.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.05)] border-l-4 border-info mt-6 transition-all hover:shadow-md animate-[fadeIn_0.3s_ease-in-out]">
              <h3 className="text-lg font-semibold text-primary mb-4">Custom Sensors</h3>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
                {customSensors.map((sensor) => {
                  const isActive = activeSensors[sensor.id] !== false;
                  const config = sensorConfigs[sensor.name] || {
                    lowerThreshold: sensor.lowerLimit,
                    upperThreshold: sensor.upperLimit,
                    samplingRateValue: sensor.samplingRateValue,
                    samplingRateUnit: sensor.samplingRateUnit
                  };
                  const unitMap: Record<string, string> = { second: 'sec', minute: 'min', hour: 'hr' };
                  const rateStr = `${config.samplingRateValue} ${unitMap[config.samplingRateUnit] || 'sec'}`;
                  return (
                    <div key={sensor.id} className={`bg-light p-5 rounded-lg text-center transition-colors ${isActive ? 'hover:bg-gray-200' : 'opacity-40 grayscale pointer-events-none'}`}>
                      <div className="text-secondary mb-2"><i className="mdi mdi-cube text-4xl"></i></div>
                      <div className="text-sm font-semibold text-gray-700">{sensor.name}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        Limit: {config.lowerThreshold} ~ {config.upperThreshold} ({rateStr})
                      </div>
                      <div className="text-2xl font-bold my-3 text-primary">-</div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${isActive ? 'bg-success' : 'bg-gray-400'}`}>
                        {isActive ? 'Normal' : 'Disabled'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add Sensor Button */}
          <div className="flex justify-end mt-4 mb-8">
            <button onClick={() => setIsAddSensorModalOpen(true)} className="flex items-center gap-2 bg-light hover:bg-gray-200 text-gray-800 px-6 py-3 rounded-full font-medium transition-all shadow-sm border border-gray-300">
              <span className="text-xl">+</span> Add Sensor
            </button>
          </div>
        </div>
      )}

      {currentTab === 'equipment' && (
        <div>
            {/* Facility Selector */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 hide-scrollbar">
              {facilities.map(f => {
                const isSelected = (currentDeviceId === f.device_id) || (!currentDeviceId && f === facilities[0]);
                return (
                  <button 
                    key={f.device_id}
                    onClick={() => router.push(`?tab=${currentTab}&deviceId=${f.device_id}`)}
                    className={`px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap border flex items-center gap-2 ${
                      isSelected 
                        ? 'bg-secondary text-white border-secondary shadow-md' 
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    {f.description || f.device_id}
                    {isSelected && <span className="w-2 h-2 rounded-full bg-white ml-1"></span>}
                  </button>
                )
              })}
            </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h2 className="text-2xl font-semibold text-primary">Equipment Control</h2>
            <div className="flex flex-wrap gap-2 md:gap-4">
              <button onClick={() => setIsEquipConfigModalOpen(true)} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-3 md:px-4 py-2 rounded-full transition-all text-sm md:text-base">
                <SlidersHorizontal size={18} /> Configure
              </button>
              <button onClick={startAll} className="flex items-center gap-2 bg-state-on hover:bg-state-on/90 text-white px-3 md:px-4 py-2 rounded-full transition-all text-sm md:text-base">
                <Play size={18} /> Start All
              </button>
              <button onClick={stopAll} className="flex items-center gap-2 bg-state-off hover:bg-state-off/90 text-white px-3 md:px-4 py-2 rounded-full transition-all text-sm md:text-base">
                <Square size={18} /> Stop All
              </button>
            </div>
          </div>

          {/* Climate Control Section */}
          <div className="bg-white rounded-xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.05)] border-l-4 border-secondary mb-6 transition-all hover:shadow-md">
            <h3 className="text-lg font-semibold text-primary mb-4">Climate Control (Aerial Environment)</h3>
            <div className="flex flex-col gap-4">
              <EquipmentItem 
                name="Circulation Fan" icon="mdi-fan" 
                details="Power: ON / OFF | Speed (RPM): 0~100%" description="내부 공기 순환, 온도 하강 및 수분 부족분(VPD) 조절"
                isOn={equipment.circulationFan} onToggle={(state) => toggleEquipment('circulationFan', state)} isActive={activeEquipment.circulationFan}
                schedule={equipSchedules['circulationFan']}
              />
              <EquipmentItem 
                name="Grow Light" icon="mdi-lightbulb-on" 
                details="Power: ON / OFF | Dimming: 0 ~ 100%" description="광합성에 필요한 유효 광량(PPFD) 공급"
                isOn={equipment.growLight} onToggle={(state) => toggleEquipment('growLight', state)} isActive={activeEquipment.growLight}
                schedule={equipSchedules['growLight']}
              />
              <EquipmentItem 
                name="HVAC" icon="mdi-air-conditioner" 
                details="Power: ON / OFF | Target Temp(°C)" description="목표 온도(DIF) 유지를 위한 강력한 온도 제어"
                isOn={equipment.hvac} onToggle={(state) => toggleEquipment('hvac', state)} isActive={activeEquipment.hvac}
                schedule={equipSchedules['hvac']}
              />
              <EquipmentItem 
                name="Humidifier" icon="mdi-air-humidifier" 
                details="Power: ON / OFF | Target Hum(%)" description="적정 상대습도(RH) 유지 및 곰팡이병 방지"
                isOn={equipment.humidifier} onToggle={(state) => toggleEquipment('humidifier', state)} isActive={activeEquipment.humidifier}
                schedule={equipSchedules['humidifier']}
              />
              <EquipmentItem 
                name="CO2 Generator" icon="mdi-gas-cylinder" 
                details="Valve State: Open / Close | Target CO2(ppm)" description="광합성 촉진을 위한 탄산가스 시비"
                isOn={equipment.co2Generator} onToggle={(state) => toggleEquipment('co2Generator', state)} isActive={activeEquipment.co2Generator}
                schedule={equipSchedules['co2Generator']}
              />
            </div>
          </div>

          {/* Nutrient System Section */}
          <div className="bg-white rounded-xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.05)] border-l-4 border-secondary transition-all hover:shadow-md">
            <h3 className="text-lg font-semibold text-primary mb-4">Nutrient System (Root Zone Management)</h3>
            <div className="flex flex-col gap-4">
              <EquipmentItem 
                name="Water Pump" icon="mdi-water-pump" 
                details="Power: ON / OFF | Duty Cycle: Running(Sec) / Stopped(Sec)" description="NFT/DFT 배드로 양액을 순환시켜 뿌리에 수분/양분 공급"
                isOn={equipment.waterPump} onToggle={(state) => toggleEquipment('waterPump', state)} isActive={activeEquipment.waterPump}
                schedule={equipSchedules['waterPump']}
              />
              <EquipmentItem 
                name="Solenoid Valve" icon="mdi-pipe-valve" 
                details="Valve State: Open / Close" description="특정 구역(Zone)으로 가는 관수 라인 개폐"
                isOn={equipment.solenoidValve} onToggle={(state) => toggleEquipment('solenoidValve', state)} isActive={activeEquipment.solenoidValve}
                schedule={equipSchedules['solenoidValve']}
              />
              <EquipmentItem 
                name="Dosing Pump" icon="mdi-eyedropper" 
                details="Injection(mL) | Pulse" description="A액, B액, 산, 알칼리를 튜브로 미세 주입하여 EC/pH 맞춤"
                isOn={equipment.dosingPump} onToggle={(state) => toggleEquipment('dosingPump', state)} isActive={activeEquipment.dosingPump}
                schedule={equipSchedules['dosingPump']}
              />
              <EquipmentItem 
                name="Air Pump" icon="mdi-weather-windy" 
                details="Power: ON / OFF" description="양액 탱크 내 용존 산소(DO) 농도 증가"
                isOn={equipment.airPump} onToggle={(state) => toggleEquipment('airPump', state)} isActive={activeEquipment.airPump}
                schedule={equipSchedules['airPump']}
              />
            </div>
          </div>

          {/* Custom Equipment Section */}
          {customEquipments.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.05)] border-l-4 border-info mb-6 transition-all hover:shadow-md">
              <h3 className="text-lg font-semibold text-primary mb-4">Custom Equipments</h3>
              <div className="flex flex-col gap-4">
                {customEquipments.map((eq) => (
                  <EquipmentItem 
                    key={eq.id}
                    name={eq.name} icon="mdi-expansion-port" 
                    details="Power: ON / OFF" description={eq.description || 'Custom added equipment'}
                    isOn={customEquipmentStates[eq.id] || false} onToggle={(state) => toggleEquipment(eq.id, state, true, eq.name)} isActive={activeEquipment[eq.id] !== false}
                    schedule={equipSchedules[eq.id]}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Add Equipment Button */}
          <div className="flex justify-end mt-4 mb-8">
            <button onClick={() => setIsAddEqModalOpen(true)} className="flex items-center gap-2 bg-light hover:bg-gray-200 text-gray-800 px-6 py-3 rounded-full font-medium transition-all shadow-sm border border-gray-300">
              <span className="text-xl">+</span> Add Equipment
            </button>
          </div>
        </div>
      )}

      {/* Maintenance Schedule Tab */}
      {currentTab === 'maintenance' && (
        <MaintenanceSchedule />
      )}

      {/* Farming Journal Tab */}
      {currentTab === 'reports' && (
        <FarmingJournal />
      )}

      {/* System Settings Tab */}
      {currentTab === 'settings' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-primary">System Settings</h2>
          </div>
          
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-primary">Global Environment Configurations</h2>
            <span className="text-sm text-gray-500">For new deployments and system overrides</span>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-10">
            {/* Supabase Config */}
            <div className="bg-white rounded-xl p-6 shadow-sm border-t-4 border-info">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-primary flex items-center gap-2"><Database size={20}/> Supabase Configuration</h3>
                <button onClick={handleSaveSysSupabase} className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors">Save</button>
              </div>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Project URL</label>
                  <input type="text" placeholder="https://[your-project].supabase.co" value={sysSupabaseUrl} onChange={e => setSysSupabaseUrl(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:border-secondary outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Anon Key (Public)</label>
                  <input type="password" placeholder="eyJh..." value={sysSupabaseAnonKey} onChange={e => setSysSupabaseAnonKey(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:border-secondary outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Service Role Key (Secret, for Data Logger)</label>
                  <input type="password" placeholder="eyJh..." value={sysSupabaseServiceKey} onChange={e => setSysSupabaseServiceKey(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:border-secondary outline-none text-sm" />
                </div>
                <div className="mt-2">
                  <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-1">
                    <span>Initial SQL Schema (SQL Editor)</span>
                    <button onClick={() => { navigator.clipboard.writeText(SQL_SCHEMA_TEXT); showNotification('SQL copied!', 'success'); }} className="text-secondary hover:underline flex items-center gap-1"><Copy size={12}/> Copy SQL</button>
                  </label>
                  <textarea readOnly value={SQL_SCHEMA_TEXT} className="w-full p-2 border border-gray-300 rounded bg-gray-50 text-gray-600 outline-none text-xs resize-y overflow-y-auto font-mono" rows={12} />
                </div>
              </div>
            </div>

            {/* MQTT Config */}
            <div className="bg-white rounded-xl p-6 shadow-sm border-t-4 border-warning">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-primary flex items-center gap-2"><Cloud size={20}/> MQTT Configuration</h3>
                <button onClick={handleSaveSysMqtt} className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors">Save</button>
              </div>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Broker URL</label>
                  <input type="text" placeholder="mqtts://[cluster].hivemq.cloud:8883" value={sysMqttUrl} onChange={e => setSysMqttUrl(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:border-secondary outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Username</label>
                  <input type="text" placeholder="Username" value={sysMqttUser} onChange={e => setSysMqttUser(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:border-secondary outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                  <input type="password" placeholder="Password" value={sysMqttPass} onChange={e => setSysMqttPass(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:border-secondary outline-none text-sm" />
                </div>
              </div>
            </div>

            {/* Gemini API Config */}
            <div className="bg-white rounded-xl p-6 shadow-sm border-t-4 border-purple-500">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-primary flex items-center gap-2"><FileCode2 size={20}/> Gemini API Configuration</h3>
                <button onClick={handleSaveSysGemini} className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors">Save</button>
              </div>
              <div className="flex flex-col gap-3">
                <p className="text-xs text-gray-500 leading-relaxed">
                  Overrides the server's default GEMINI_API_KEY environment variable. Used for generating Arduino & Python code.
                </p>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">API Key</label>
                  <input type="password" placeholder="AIza..." value={sysGeminiKey} onChange={e => setSysGeminiKey(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:border-secondary outline-none text-sm" />
                </div>
              </div>
            </div>
            {/* WiFi Scan & Setup Config */}
            <div className="bg-white rounded-xl p-6 shadow-sm border-t-4 border-emerald-500">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-primary flex items-center gap-2"><Wifi size={20}/> WiFi Scan & Setup</h3>
                <button 
                  onClick={handleScanWifi} 
                  disabled={isWifiScanning}
                  className="bg-secondary hover:bg-secondary/90 disabled:bg-gray-300 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1"
                >
                  {isWifiScanning ? 'Scanning...' : 'Scan Networks'}
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <div className="bg-emerald-50 text-emerald-700 p-2 rounded text-[11px] border border-emerald-200">
                  <strong>Network bridging enabled:</strong> You can scan real networks around this host and request connection directly.
                </div>
                
                {scanWarningMessage && (
                  <div className="bg-amber-50 text-amber-700 p-2 rounded text-[10px] border border-amber-200 leading-relaxed">
                    ⚠️ {scanWarningMessage}
                  </div>
                )}

                {/* Scanned networks list */}
                {scannedWifiList.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg max-h-[220px] overflow-y-auto divide-y divide-gray-100 bg-gray-50">
                    {scannedWifiList.map((net) => {
                      const signalVal = parseInt(net.signal) || 0;
                      return (
                        <div 
                          key={net.ssid} 
                          onClick={() => {
                            setSelectedWifiSsid(net.ssid);
                            setWifiScanPassword('');
                          }}
                          className={`p-3 flex justify-between items-center cursor-pointer transition-colors ${selectedWifiSsid === net.ssid ? 'bg-secondary/10 hover:bg-secondary/15' : 'hover:bg-gray-100'}`}
                        >
                          <div>
                            <p className="font-semibold text-sm text-gray-800 flex items-center gap-1.5">
                              {net.ssid}
                              {selectedWifiSsid === net.ssid && <span className="text-[10px] bg-secondary text-white px-1.5 py-0.5 rounded-full font-bold">Selected</span>}
                            </p>
                            <p className="text-[10px] text-gray-500">{net.security}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold ${signalVal >= 70 ? 'text-success' : signalVal >= 40 ? 'text-warning' : 'text-danger'}`}>
                              {net.signal}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400 text-xs border border-dashed border-gray-200 rounded-lg bg-gray-50">
                    No networks scanned yet. Click 'Scan Networks' above.
                  </div>
                )}

                {/* Connection Form when SSID is selected */}
                {selectedWifiSsid && (
                  <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg animate-in slide-in-from-top-2 duration-200">
                    <p className="text-xs font-semibold text-gray-700 mb-2">
                      Connect to: <span className="text-primary">{selectedWifiSsid}</span>
                    </p>
                    <div className="flex flex-col gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 mb-1">Wi-Fi Password</label>
                        <input 
                          type="password" 
                          placeholder="Enter Password" 
                          value={wifiScanPassword} 
                          onChange={e => setWifiScanPassword(e.target.value)} 
                          className="w-full p-2 border border-gray-300 rounded focus:border-secondary outline-none text-xs" 
                        />
                      </div>
                      <div className="flex gap-2 justify-end mt-1">
                        <button 
                          onClick={() => setSelectedWifiSsid('')} 
                          className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleConnectWifi} 
                          disabled={isWifiConnecting}
                          className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                        >
                          {isWifiConnecting ? 'Connecting...' : 'Connect'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Arduino Setting Tab */}
      {currentTab === 'arduino' && (
        <div className="animate-[fadeIn_0.5s_ease-in-out]">
            {/* Facility Selector */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 hide-scrollbar">
              {facilities.map(f => {
                const isSelected = (currentDeviceId === f.device_id) || (!currentDeviceId && f === facilities[0]);
                return (
                  <button 
                    key={f.device_id}
                    onClick={() => router.push(`?tab=${currentTab}&deviceId=${f.device_id}`)}
                    className={`px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap border flex items-center gap-2 ${
                      isSelected 
                        ? 'bg-secondary text-white border-secondary shadow-md' 
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    {f.description || f.device_id}
                    {isSelected && <span className="w-2 h-2 rounded-full bg-white ml-1"></span>}
                  </button>
                )
              })}
            </div>

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-primary">Arduino Setting</h2>
          </div>
          
          <div className="bg-white rounded-xl p-8 shadow-[0_4px_12px_rgba(0,0,0,0.05)] border-t-4 border-primary">
            <h3 className="text-lg font-semibold text-primary mb-6 flex items-center gap-2"><CircuitBoard size={24} /> Select Arduino Board</h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Arduino UNO R3 */}
              <label className={`relative flex flex-col p-6 cursor-pointer rounded-xl border-2 transition-all duration-300 ${selectedArduinoBoard === 'Arduino UNO R3' ? 'border-secondary bg-secondary/5' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                <input type="radio" name="arduino_board" value="Arduino UNO R3" className="absolute opacity-0" checked={selectedArduinoBoard === 'Arduino UNO R3'} onChange={(e) => setSelectedArduinoBoard(e.target.value)} />
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedArduinoBoard === 'Arduino UNO R3' ? 'border-secondary' : 'border-gray-300'}`}>
                      {selectedArduinoBoard === 'Arduino UNO R3' && <div className="w-2.5 h-2.5 rounded-full bg-secondary"></div>}
                    </div>
                    <span className="font-bold text-lg text-gray-800">Arduino UNO R3</span>
                  </div>
                  <CircuitBoard className={`w-8 h-8 ${selectedArduinoBoard === 'Arduino UNO R3' ? 'text-secondary' : 'text-gray-400'}`} />
                </div>
                <p className="text-gray-600 text-sm pl-8">Standard Arduino board without built-in WiFi. Requires external modules for network connectivity.</p>
              </label>

              {/* Arduino UNO R4 WiFi */}
              <label className={`relative flex flex-col p-6 cursor-pointer rounded-xl border-2 transition-all duration-300 ${selectedArduinoBoard === 'Arduino UNO R4 WiFi' ? 'border-secondary bg-secondary/5' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                <input type="radio" name="arduino_board" value="Arduino UNO R4 WiFi" className="absolute opacity-0" checked={selectedArduinoBoard === 'Arduino UNO R4 WiFi'} onChange={(e) => setSelectedArduinoBoard(e.target.value)} />
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedArduinoBoard === 'Arduino UNO R4 WiFi' ? 'border-secondary' : 'border-gray-300'}`}>
                      {selectedArduinoBoard === 'Arduino UNO R4 WiFi' && <div className="w-2.5 h-2.5 rounded-full bg-secondary"></div>}
                    </div>
                    <span className="font-bold text-lg text-gray-800">Arduino UNO R4 WiFi</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wifi className={`w-5 h-5 ${selectedArduinoBoard === 'Arduino UNO R4 WiFi' ? 'text-secondary' : 'text-gray-400'}`} />
                    <CircuitBoard className={`w-8 h-8 ${selectedArduinoBoard === 'Arduino UNO R4 WiFi' ? 'text-secondary' : 'text-gray-400'}`} />
                  </div>
                </div>
                <p className="text-gray-600 text-sm pl-8">Next-generation board with 32-bit ARM Cortex-M4 and built-in ESP32-S3 for WiFi/Bluetooth connectivity.</p>
              </label>
            </div>

            {/* Network & MQTT Configuration */}
            {selectedArduinoBoard === 'Arduino UNO R4 WiFi' && (
              <div className="mt-8 bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-primary flex items-center gap-2"><Wifi size={20} /> Network & MQTT Configuration</h3>
                  <button onClick={handleSaveNetworkConfig} className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                    Save Config
                  </button>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">WiFi SSID</label>
                    <input type="text" placeholder="Enter WiFi SSID" value={wifiSsid} onChange={e => setWifiSsid(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg focus:border-secondary outline-none transition-colors bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">WiFi Password</label>
                    <input type="password" placeholder="Enter WiFi Password" value={wifiPassword} onChange={e => setWifiPassword(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg focus:border-secondary outline-none transition-colors bg-white" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">MQTT Server URL</label>
                    <input type="text" placeholder="e.g. mqtts://[your-cluster].hivemq.cloud:8883" value={mqttServer} onChange={e => setMqttServer(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg focus:border-secondary outline-none transition-colors bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">MQTT Username</label>
                    <input type="text" placeholder="Enter MQTT Username" value={mqttUsername} onChange={e => setMqttUsername(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg focus:border-secondary outline-none transition-colors bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">MQTT Password</label>
                    <input type="password" placeholder="Enter MQTT Password" value={mqttPassword} onChange={e => setMqttPassword(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg focus:border-secondary outline-none transition-colors bg-white" />
                  </div>
                </div>
              </div>
            )}

            {/* Pin Configuration Table */}
            <div className="mt-10">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-lg font-semibold text-primary">Hardware Pin Configuration</h3>
                <button onClick={handleSaveHardwareConfig} className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                  Save Config
                </button>
              </div>
              {/* 드롭다운 메뉴가 잘리지 않도록 하단 여백(pb-20) 추가 */}
              <div className="overflow-x-auto rounded-xl border border-gray-200 pb-20">
                <table className="w-full text-left border-collapse bg-white">
                  <thead>
                    <tr className="bg-light text-primary border-b border-gray-200">
                      <th className="p-4 font-semibold w-[120px]">Pin</th>
                      <th className="p-4 font-semibold w-[25%]">Function Description</th>
                      <th className="p-4 font-semibold w-[20%]">Sensors & Equipments</th>
                      <th className="p-4 font-semibold">Connected Device(s)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ARDUINO_PINS.map(pin => {
                      const count = pin.isBus ? (pinCounts[pin.id] || 1) : 1;
                      return (
                        <React.Fragment key={pin.id}>
                          {Array.from({ length: count }).map((_, i) => (
                            <tr key={`${pin.id}-${i}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              {i === 0 && (
                                <td rowSpan={count} className="p-4 font-bold text-gray-700 bg-gray-50/50 align-top">
                                  {pin.name}
                                </td>
                              )}
                              {i === 0 && (
                                <td rowSpan={count} className="p-4 text-sm text-gray-600 align-top">
                                  {selectedArduinoBoard === 'Arduino UNO R3' ? pin.r3 : pin.r4}
                                {pin.isBus && (
                                    <div className="mt-3 flex flex-col gap-1">
                                      <span className="text-xs text-gray-500 font-medium">Number of Devices:</span>
                                      <select className="border border-gray-300 rounded px-2 py-1.5 text-sm outline-none focus:border-secondary transition-colors w-[80px] bg-white" value={count} onChange={(e) => setPinCounts(prev => ({ ...prev, [pin.id]: parseInt(e.target.value) }))}>
                                        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                                      </select>
                                    </div>
                                  )}
                                </td>
                              )}
                              <td className="p-4 align-top">
                                <MultiSelectDropdown options={mappingOptions} selected={pinMappings[pin.id]?.[i] || ['none']} onChange={(vals) => handlePinMappingChange(pin.id, i, vals)} />
                              </td>
                              <td className="p-4 align-top">
                                <div className="flex items-center gap-2">
                                  <input type="text" placeholder={pin.isBus ? `Bus Device ${i + 1} (e.g. Module)` : pin.id === 'UART' ? 'e.g. RS485, MH-Z19' : `e.g. DHT22 Sensor`} value={pinConfigs[pin.id]?.[i] || ''} onChange={(e) => handlePinDeviceChange(pin.id, i, e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary outline-none text-sm transition-all" />
                                  {pin.isBus && count > 1 && (
                                    <button onClick={() => handleRemoveBusDevice(pin.id, i)} title="Remove Device" className="text-gray-400 hover:text-danger transition-colors p-1">
                                      <X size={20} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Code Generation Button */}
              <div className="mt-6 flex justify-end">
                <button onClick={handleGenerateCode} disabled={isGeneratingCode} className={`flex items-center gap-2 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-md ${isGeneratingCode ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-primary/90'}`}>
                  {isGeneratingCode ? (
                    <><div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> Generating AI Code...</>
                  ) : (
                    <><Code size={20} /> Generate Arduino Sketch with AI</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Raspberry Setting Tab */}

      {currentTab === 'facilities' && (
        <div className="animate-[fadeIn_0.5s_ease-in-out]">
          <FacilitiesSettings showNotification={showNotification} onFacilitiesChange={fetchFacilities} />
        </div>
      )}
      {currentTab === 'raspberry' && (
        <div className="animate-[fadeIn_0.5s_ease-in-out]">
            {/* Facility Selector */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 hide-scrollbar">
              {facilities.map(f => {
                const isSelected = (currentDeviceId === f.device_id) || (!currentDeviceId && f === facilities[0]);
                return (
                  <button 
                    key={f.device_id}
                    onClick={() => router.push(`?tab=${currentTab}&deviceId=${f.device_id}`)}
                    className={`px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap border flex items-center gap-2 ${
                      isSelected 
                        ? 'bg-secondary text-white border-secondary shadow-md' 
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    {f.description || f.device_id}
                    {isSelected && <span className="w-2 h-2 rounded-full bg-white ml-1"></span>}
                  </button>
                )
              })}
            </div>

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-primary">Raspberry Pi Data Logger</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* 원격 프로세스 제어 패널 */}
            <div className="bg-white rounded-xl p-8 shadow-[0_4px_12px_rgba(0,0,0,0.05)] border-t-4 border-secondary">
              <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2"><Server size={24} /> Remote Logger Control</h3>
              <p className="text-gray-600 text-sm mb-6">
                Start or stop the <code>data-logger.py</code> process running on your Raspberry Pi remotely from anywhere.
              </p>
              
              <div className="bg-gray-50/80 p-5 rounded-2xl border border-gray-100 flex justify-between items-center transition-all hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${remoteLoggerRunning ? 'bg-success animate-pulse' : 'bg-gray-300'}`}></div>
                  <span className="font-semibold text-gray-700">Logger Process Status</span>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold text-white transition-colors duration-300 ${remoteLoggerRunning ? 'bg-success shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-gray-400'}`}>
                    {remoteLoggerRunning ? 'RUNNING' : 'STOPPED'}
                  </span>
                  <label className="relative inline-block w-[50px] h-[24px]">
                    <input type="checkbox" className="opacity-0 w-0 h-0 peer" checked={remoteLoggerRunning} onChange={(e) => handleToggleRemoteLogger(e.target.checked)} />
                    <span className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 transition-[0.4s] rounded-[24px] bg-gray-300 peer-checked:bg-success
                      before:absolute before:content-[''] before:h-[16px] before:w-[16px] before:left-[4px] before:bottom-[4px] before:bg-white before:transition-[0.4s] before:rounded-full peer-checked:before:translate-x-[26px] shadow-inner`}>
                    </span>
                  </label>
                </div>
              </div>
            </div>
            {/* 코드 생성 패널 */}
            <div className="bg-white rounded-xl p-8 shadow-[0_4px_12px_rgba(0,0,0,0.05)] border-t-4 border-primary">
              <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2"><Terminal size={24} /> Python Edge Logger Setup</h3>
              <p className="text-gray-600 text-sm mb-6">
                Generate the <code>data-logger.py</code> script configured with your current MQTT and Supabase settings to deploy on your Raspberry Pi.
              </p>
              
              <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-3">DB Transmission Interval (Per Sensor)</label>
                
                {activeSensorsList.length === 0 ? (
                  <p className="text-sm text-gray-500 italic py-2">No active sensors for this facility.</p>
                ) : (
                  <div className="space-y-2 mb-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                    {activeSensorsList.map(sensor => (
                      <div key={sensor.id} className="flex justify-between items-center bg-white p-2.5 border border-gray-200 rounded-md shadow-sm">
                        <span className="text-sm font-mono text-gray-600 truncate mr-3 flex-1" title={sensor.id}>{sensor.label} <span className="text-xs text-gray-400 font-sans ml-2">({sensor.id})</span></span>
                        <div className="flex gap-2 items-center shrink-0">
                          <input 
                            type="number" 
                            min="1" 
                            value={dbSyncInterval[sensor.id] || 5} 
                            onChange={e => handleIntervalChange(sensor.id, parseInt(e.target.value))} 
                            className="w-16 p-1 text-center border border-gray-300 rounded focus:border-primary outline-none text-sm" 
                          />
                          <span className="text-xs text-gray-500 font-medium">mins</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <p className="text-xs text-gray-500 mt-2">The logger will independently calculate the average for each sensor over its defined period and send it to the database.</p>
              </div>

              <div className="flex justify-start">
                <button onClick={handleGeneratePythonCode} disabled={isGeneratingCode} className={`w-full flex justify-center items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-md ${isGeneratingCode ? 'bg-gray-400 cursor-not-allowed' : ''}`}>
                  {isGeneratingCode ? (
                    <><div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> Loading...</>
                  ) : (
                    <><Code size={20} /> Generate Python Code</>
                  )}
                </button>
              </div>
            </div>
            </div>

          {/* 가상 환경(venv) 배포 가이드 패널 */}
          <div className="bg-white rounded-xl p-8 shadow-[0_4px_12px_rgba(0,0,0,0.05)] border-t-4 border-info mt-6 text-left">
            <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
              <Info size={24} className="text-info" /> Raspberry Pi <code>data-logger.py</code> 가상 환경(venv) 실행 가이드
            </h3>
            <p className="text-gray-600 text-sm mb-6">
              라즈베리파이의 격리된 Python 가상 환경(venv)에서 데이터 로거를 안전하고 지속적으로 실행하는 방법입니다.
            </p>
            
            <div className="space-y-5 text-sm text-gray-700">
              <div>
                <h4 className="font-bold text-primary mb-1">1. 필수 시스템 패키지 설치</h4>
                <p className="text-gray-500 mb-2">가상 환경 생성을 위해 python3-venv와 최신 pip 패키지를 설치합니다.</p>
                <pre className="bg-light p-3.5 rounded-lg border border-gray-200 text-xs overflow-x-auto font-mono text-gray-800">
                  sudo apt update && sudo apt install -y python3-venv python3-pip
                </pre>
              </div>

              <div>
                <h4 className="font-bold text-primary mb-1">2. 프로젝트 폴더 구성 및 코드 복사</h4>
                <p className="text-gray-500 mb-2">라즈베리파이에 폴더를 생성하고 다운로드받은 <code>data-logger.py</code>, <code>.env</code> 파일을 업로드합니다.</p>
                <pre className="bg-light p-3.5 rounded-lg border border-gray-200 text-xs overflow-x-auto font-mono text-gray-800">
                  mkdir -p ~/smartfarm-logger{"\n"}
                  cd ~/smartfarm-logger
                </pre>
              </div>

              <div>
                <h4 className="font-bold text-primary mb-1">3. 가상 환경 생성 및 활성화</h4>
                <p className="text-gray-500 mb-2">독립된 Python 런타임을 구성하기 위해 venv를 생성하고 시스템 쉘에 활성화합니다.</p>
                <pre className="bg-light p-3.5 rounded-lg border border-gray-200 text-xs overflow-x-auto font-mono text-gray-800">
                  python3 -m venv venv{"\n"}
                  source venv/bin/activate
                </pre>
                <p className="text-xs text-info mt-1 font-medium">* 활성화되면 프롬프트 좌측에 (venv) 표시가 나타납니다.</p>
              </div>

              <div>
                <h4 className="font-bold text-primary mb-1">4. 의존성 라이브러리 설치</h4>
                <p className="text-gray-500 mb-2">가상 환경이 활성화된 상태에서 로거 구동에 필요한 패키지들을 설치합니다.</p>
                <pre className="bg-light p-3.5 rounded-lg border border-gray-200 text-xs overflow-x-auto font-mono text-gray-800">
                  pip install --upgrade pip{"\n"}
                  pip install paho-mqtt supabase python-dotenv
                </pre>
              </div>

              <div>
                <h4 className="font-bold text-primary mb-1">5. 백그라운드 데몬(Daemon)으로 실행</h4>
                <p className="text-gray-500 mb-2">터미널 세션이 종료되어도 백그라운드에서 상시 실행되도록 nohup 명령어를 사용합니다.</p>
                <pre className="bg-light p-3.5 rounded-lg border border-gray-200 text-xs overflow-x-auto font-mono text-gray-800">
                  nohup venv/bin/python data-logger.py &gt; logger.log 2&gt;&amp;1 &amp;
                </pre>
                <p className="text-gray-500 mt-2 mb-2">실행 로그 실시간 추적 및 중단 명령어:</p>
                <pre className="bg-light p-3.5 rounded-lg border border-gray-200 text-xs overflow-x-auto font-mono text-gray-800">
                  tail -f logger.log{"\n"}
                  pkill -f data-logger.py
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User / Login Tab */}
      {currentTab === 'users' && (
        <div className="flex flex-col items-center justify-center py-20">
          <h2 className="text-2xl font-semibold text-primary mb-6">User Authentication</h2>
          {user ? (
            <div className="bg-white p-8 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] text-center max-w-md w-full border-t-4 border-success">
              <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 overflow-hidden border-4 border-white shadow-sm flex items-center justify-center">
                {user.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-12 h-12 text-gray-400" />
                )}
              </div>
              <h3 className="text-xl font-bold mb-1 text-primary">{user.user_metadata?.full_name || 'User'}</h3>
              <p className="text-gray-500 mb-8">{user.email}</p>
              <button onClick={handleLogout} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-8 py-2.5 rounded-lg transition-all">
                Log out
              </button>
            </div>
          ) : (
            <div className="bg-white p-10 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] text-center max-w-md w-full border-t-4 border-primary">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users size={32} className="text-primary" />
              </div>
              <p className="text-gray-600 mb-8">Please log in to access system settings and equipment controls.</p>
              <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-lg transition-all shadow-sm font-medium">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4단계: 알림(Toast Notification) UI */}
      <div className="fixed top-5 right-5 z-[1001] flex flex-col gap-3 w-full max-w-[400px]">
        {notifications.map(n => (
          <div key={n.id} className={`flex items-start gap-3 p-4 bg-white rounded-lg shadow-lg border-l-4 animate-in slide-in-from-right-8 fade-in duration-300
            ${n.type === 'success' ? 'border-success' : n.type === 'warning' ? 'border-warning' : n.type === 'error' ? 'border-danger' : 'border-info'}`}>
            <div className="flex-shrink-0 mt-0.5">
              {n.type === 'success' && <CheckCircle className="text-success" size={24} />}
              {n.type === 'warning' && <AlertTriangle className="text-warning" size={24} />}
              {n.type === 'error' && <XCircle className="text-danger" size={24} />}
              {n.type === 'info' && <Info className="text-info" size={24} />}
            </div>
            <div className="flex-1 text-gray-800 font-medium text-sm max-h-[150px] overflow-y-auto whitespace-pre-wrap break-words pr-1">
              {n.message}
            </div>
            <button onClick={() => removeNotification(n.id)} className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors mt-0.5">
              <X size={20} />
            </button>
          </div>
        ))}
      </div>

      {/* 4단계: Sensor Configuration Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[1000] animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-xl w-[90%] max-w-[600px] max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold text-primary">Sensor Configuration</h3>
              <button onClick={() => setIsConfigModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
            </div>
            
            <div className="mb-4">
              <label className="block mb-2 font-medium text-primary">Select Sensor Type</label>
              <select className="w-full p-3 border border-gray-300 rounded-lg focus:border-secondary outline-none transition-colors" value={configSensor} onChange={e => setConfigSensor(e.target.value)}>
                <optgroup label="Default Sensors">
                  <option value="Temperature">Temperature</option>
                  <option value="Light Intensity">Light Intensity</option>
                  <option value="Humidity">Humidity</option>
                  <option value="Hydrogen Ion Concentration">Hydrogen Ion Concentration</option>
                  <option value="Electrical Conductivity">Electrical Conductivity</option>
                  <option value="Dissolved Oxygen">Dissolved Oxygen</option>
                  <option value="Carbon Dioxide">Carbon Dioxide</option>
                </optgroup>
                {customSensors.length > 0 && (
                  <optgroup label="Custom Sensors">
                    {customSensors.map(sensor => (
                      <option key={sensor.id} value={sensor.name}>{sensor.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block mb-2 font-medium text-primary">Sensor Sampling Rate</label>
              <div className="flex gap-2">
                <input type="number" min="1" step="any" className="w-[100px] md:w-[120px] p-3 border border-gray-300 rounded-lg focus:border-secondary outline-none transition-colors" placeholder="Value" value={configRateValue} onChange={e => setConfigRateValue(e.target.value)} />
                <select className="w-[140px] md:w-[160px] p-3 border border-gray-300 rounded-lg focus:border-secondary outline-none transition-colors" value={configRateUnit} onChange={e => setConfigRateUnit(e.target.value)}>
                  <option value="second">Second(s)</option>
                  <option value="minute">Minute(s)</option>
                  <option value="hour">Hour(s)</option>
                </select>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block mb-2 font-medium text-primary">Lower Threshold Limit <span className="text-gray-500 font-normal">{getUnit(configSensor)}</span></label>
              <input type="number" step="0.1" className="w-full p-3 border border-gray-300 rounded-lg focus:border-secondary outline-none transition-colors" placeholder="Enter lower limit" value={configLower} onChange={e => setConfigLower(e.target.value)} />
            </div>
            
            <div className="mb-6">
              <label className="block mb-2 font-medium text-primary">Upper Threshold Limit <span className="text-gray-500 font-normal">{getUnit(configSensor)}</span></label>
              <input type="number" step="0.1" className="w-full p-3 border border-gray-300 rounded-lg focus:border-secondary outline-none transition-colors" placeholder="Enter upper limit" value={configUpper} onChange={e => setConfigUpper(e.target.value)} />
            </div>

            {!isReviewing ? (
              <button onClick={reviewConfig} className="w-full bg-primary text-white p-3 rounded-lg flex justify-center items-center gap-2 hover:bg-primary/90 transition-colors font-medium">
                <CheckCircle size={20} /> Review Configuration
              </button>
            ) : (
              <div className="mt-6 p-5 bg-light rounded-lg border border-gray-200 animate-in slide-in-from-bottom-4 fade-in duration-300">
                <h4 className="mb-4 text-primary font-semibold text-lg">Confirm Settings</h4>
                <p className="mb-2 text-gray-700"><strong>Sensor:</strong> {configSensor}</p>
                <p className="mb-2 text-gray-700"><strong>Sampling Rate:</strong> {configRateValue} {configRateUnit}{parseFloat(configRateValue) > 1 ? 's' : ''}</p>
                <p className="mb-2 text-gray-700"><strong>Lower Limit:</strong> {configLower} {getUnit(configSensor)}</p>
                <p className="mb-4 text-gray-700"><strong>Upper Limit:</strong> {configUpper} {getUnit(configSensor)}</p>
                <p className="mb-4 font-bold text-danger">Are these settings correct?</p>
                <div className="flex gap-3">
                  <button onClick={saveConfig} className="flex-1 bg-success hover:bg-success/90 text-white p-3 rounded-lg font-medium transition-colors">Yes, Save</button>
                  <button onClick={() => setIsReviewing(false)} className="flex-1 bg-warning hover:bg-warning/90 text-white p-3 rounded-lg font-medium transition-colors">No, Edit</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4단계: Load Configuration Modal */}
      {isLoadModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[1000] animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-xl w-[90%] max-w-[800px] max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold text-primary">Saved Sensor Configurations</h3>
              <button onClick={() => setIsLoadModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse mt-2">
                <thead>
                  <tr className="bg-light text-primary border-b-2 border-gray-200">
                    <th className="p-3 text-left font-semibold">Sensor Type</th>
                    <th className="p-3 text-left font-semibold">Sampling Rate</th>
                    <th className="p-3 text-left font-semibold">Lower Limit</th>
                    <th className="p-3 text-left font-semibold">Upper Limit</th>
                    <th className="p-3 text-left font-semibold">Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {loadedConfigs.map((c, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-3 font-medium text-primary">{c.sensor}</td>
                      {c.empty ? (
                        <td colSpan={4} className="p-3 text-gray-400 text-center italic">N/A</td>
                      ) : (
                        <>
                          <td className="p-3 text-gray-600">{c.samplingRateValue ? `${c.samplingRateValue} ${c.samplingRateUnit}${c.samplingRateValue > 1 ? 's' : ''}` : `${c.samplingRate} sec`}</td>
                          <td className="p-3 text-gray-600">{c.lowerThreshold}</td>
                          <td className="p-3 text-gray-600">{c.upperThreshold}</td>
                          <td className="p-3 text-gray-500 text-sm">{new Date(c.lastUpdated).toLocaleString()}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={() => setIsLoadModalOpen(false)} className="w-full mt-6 bg-light text-dark font-medium p-3 rounded-lg hover:bg-gray-200 transition-colors">Close</button>
          </div>
        </div>
      )}

      {/* 4단계: Generated Code Modal (Arduino) */}
      {isCodeModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[1000] animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-xl w-[90%] max-w-[800px] max-h-[90vh] flex flex-col shadow-2xl border-t-4 border-secondary">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold text-primary flex items-center gap-2"><Code size={24} /> Generated Sketch</h3>
              <button onClick={() => setIsCodeModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
            </div>
            
            <div className="flex-1 flex flex-col bg-gray-900 rounded-lg p-4 mb-6 min-h-[400px]">
              <textarea 
                className="w-full flex-1 bg-transparent text-green-400 font-mono text-sm outline-none resize-none whitespace-pre overflow-auto"
                value={generatedCode}
                onChange={(e) => setGeneratedCode(e.target.value)}
                spellCheck={false}
              />
            </div>

            <div className="flex gap-4">
              <button onClick={() => { navigator.clipboard.writeText(generatedCode); showNotification('Code copied to clipboard!', 'success'); }} className="flex-1 flex items-center justify-center gap-2 bg-light hover:bg-gray-200 text-gray-800 p-3 rounded-lg font-medium transition-colors border border-gray-300">
                <Copy size={20} /> Copy Code
              </button>
              <button onClick={() => {
              const blob = new Blob([generatedCode], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'smart_farm_node.ino'; a.click(); URL.revokeObjectURL(url);
              showNotification('Downloading .ino file...', 'success');
              }} className="flex-1 flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/90 text-white p-3 rounded-lg font-medium transition-colors">
              <Download size={20} /> Download .ino File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Python Code Modal */}
      {isPythonModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[1000] animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-xl w-[90%] max-w-[800px] max-h-[90vh] flex flex-col shadow-2xl border-t-4 border-info">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold text-primary flex items-center gap-2"><Terminal size={24} /> data-logger.py</h3>
              <button onClick={() => setIsPythonModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
            </div>
            
            <div className="flex-1 flex flex-col bg-gray-900 rounded-lg p-4 mb-6 min-h-[400px]">
              <textarea 
                className="w-full flex-1 bg-transparent text-blue-400 font-mono text-sm outline-none resize-none whitespace-pre overflow-auto"
                value={generatedPythonCode}
                onChange={(e) => setGeneratedPythonCode(e.target.value)}
                spellCheck={false}
              />
            </div>

            <div className="flex gap-4">
              <button onClick={() => { navigator.clipboard.writeText(generatedPythonCode); showNotification('Python script copied!', 'success'); }} className="flex-1 flex items-center justify-center gap-2 bg-light hover:bg-gray-200 text-gray-800 p-3 rounded-lg font-medium transition-colors border border-gray-300">
                <Copy size={20} /> Copy Code
              </button>
              <button onClick={() => {
                const blob = new Blob([generatedPythonCode], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'data-logger.py'; a.click(); URL.revokeObjectURL(url);
              }} className="flex-1 flex items-center justify-center gap-2 bg-info hover:bg-info/90 text-white p-3 rounded-lg font-medium transition-colors">
                <Download size={20} /> Download .py File
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddEqModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[1000] animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-xl w-[90%] max-w-[600px] shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold text-primary">Add Custom Equipment</h3>
              <button onClick={() => setIsAddEqModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
            </div>
            <div className="mb-4">
              <label className="block mb-2 font-medium text-primary">Equipment Name (기기 명칭)</label>
              <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:border-secondary outline-none transition-colors" placeholder="Enter equipment name" value={newEqName} onChange={e => setNewEqName(e.target.value)} />
            </div>
            <div className="mb-6">
              <label className="block mb-2 font-medium text-primary">Equipment Description (기기 설명)</label>
              <textarea className="w-full p-3 border border-gray-300 rounded-lg focus:border-secondary outline-none transition-colors resize-none" rows={3} placeholder="Enter equipment description" value={newEqDesc} onChange={e => setNewEqDesc(e.target.value)} />
            </div>
            <button onClick={handleSaveCustomEquipment} className="w-full bg-primary text-white p-3 rounded-lg flex justify-center items-center gap-2 hover:bg-primary/90 transition-colors font-medium">
              <CheckCircle size={20} /> Save Equipment
            </button>
          </div>
        </div>
      )}

      {/* Add Sensor Modal */}
      {isAddSensorModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[1000] animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-xl w-[90%] max-w-[600px] shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold text-primary">Add Custom Sensor</h3>
              <button onClick={() => setIsAddSensorModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
            </div>
            
            <div className="mb-4">
              <label className="block mb-2 font-medium text-primary">Sensor Type / Name (센서 종류명)</label>
              <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:border-secondary outline-none transition-colors" placeholder="e.g. Soil Moisture" value={newSensorName} onChange={e => setNewSensorName(e.target.value)} />
            </div>

            <div className="mb-4">
              <label className="block mb-2 font-medium text-primary">Sampling Rate (측정 주기)</label>
              <div className="flex gap-2">
                <input type="number" className="flex-1 p-3 border border-gray-300 rounded-lg focus:border-secondary outline-none transition-colors" placeholder="e.g. 10" value={newSensorRateValue} onChange={e => setNewSensorRateValue(e.target.value)} />
                <select className="p-3 border border-gray-300 rounded-lg focus:border-secondary outline-none transition-colors w-[150px]" value={newSensorRateUnit} onChange={e => setNewSensorRateUnit(e.target.value)}>
                  <option value="second">Seconds (초)</option>
                  <option value="minute">Minutes (분)</option>
                  <option value="hour">Hours (시간)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block mb-2 font-medium text-primary">Lower Limit (임계 최소값)</label>
                <input type="number" className="w-full p-3 border border-gray-300 rounded-lg focus:border-secondary outline-none transition-colors" placeholder="e.g. 30" value={newSensorLower} onChange={e => setNewSensorLower(e.target.value)} />
              </div>
              <div>
                <label className="block mb-2 font-medium text-primary">Upper Limit (임계 최대값)</label>
                <input type="number" className="w-full p-3 border border-gray-300 rounded-lg focus:border-secondary outline-none transition-colors" placeholder="e.g. 80" value={newSensorUpper} onChange={e => setNewSensorUpper(e.target.value)} />
              </div>
            </div>

            <button onClick={handleSaveCustomSensor} className="w-full bg-primary text-white p-3 rounded-lg flex justify-center items-center gap-2 hover:bg-primary/90 transition-colors font-medium">
              <CheckCircle size={20} /> Save Sensor
            </button>
          </div>
        </div>
      )}

      {/* Equipment Configuration Modal */}
      {isEquipConfigModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[1000] animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-xl w-[90%] max-w-[500px] shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold text-primary">Configure Schedule</h3>
              <button onClick={() => setIsEquipConfigModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
            </div>
            
            <div className="mb-6">
              <label className="block mb-2 font-medium text-primary">Select Equipment</label>
              <select className="w-full p-3 border border-gray-300 rounded-lg focus:border-secondary outline-none transition-colors" value={configEquip} onChange={e => setConfigEquip(e.target.value)}>
                <optgroup label="Default Equipment">
                  {Object.entries(equipmentNamesList).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </optgroup>
                {customEquipments.length > 0 && (
                  <optgroup label="Custom Equipment">
                    {customEquipments.map(eq => (
                      <option key={eq.id} value={eq.id}>{eq.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            
            {/* 24-Hour Continuous Operation Toggle */}
            <div className="flex justify-between items-center p-3.5 bg-light rounded-xl mb-6 hover:bg-gray-200 transition-colors">
              <div className="flex flex-col text-left">
                <span className="text-sm font-semibold text-primary">24-Hour Continuous Operation</span>
                <span className="text-[10px] text-gray-400 font-medium">Ignore start/stop schedule and run continuously</span>
              </div>
              <label className="relative inline-block w-[50px] h-[24px]">
                <input type="checkbox" className="opacity-0 w-0 h-0 peer" checked={equipIsContinuous} onChange={(e) => setEquipIsContinuous(e.target.checked)} />
                <span className="absolute cursor-pointer top-0 left-0 right-0 bottom-0 transition-[0.4s] rounded-[24px] bg-[#ccc] peer-checked:bg-success
                  before:absolute before:content-[''] before:h-[16px] before:w-[16px] before:left-[4px] before:bottom-[4px] before:bg-white before:transition-[0.4s] before:rounded-full peer-checked:before:translate-x-[26px]">
                </span>
              </label>
            </div>
            
            <div className={`transition-all duration-300 ${equipIsContinuous ? 'opacity-40 pointer-events-none' : ''}`}>
              <div className="mb-6">
                <label className="block mb-2 font-medium text-primary">Start Time (운전 시작)</label>
                <div className="flex gap-2 items-center">
                  <select className="p-3 border border-gray-300 rounded-lg focus:border-secondary outline-none transition-colors" value={equipStartAmPm} disabled={equipIsContinuous} onChange={e => setEquipStartAmPm(e.target.value)}>
                    <option value="AM">AM (오전)</option>
                    <option value="PM">PM (오후)</option>
                  </select>
                  <select className="p-3 border border-gray-300 rounded-lg focus:border-secondary outline-none transition-colors flex-1" value={equipStartHour} disabled={equipIsContinuous} onChange={e => setEquipStartHour(e.target.value)}>
                    {Array.from({length: 12}, (_, i) => String(i + 1).padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <span className="font-bold">:</span>
                  <select className="p-3 border border-gray-300 rounded-lg focus:border-secondary outline-none transition-colors flex-1" value={equipStartMinute} disabled={equipIsContinuous} onChange={e => setEquipStartMinute(e.target.value)}>
                    {Array.from({length: 60}, (_, i) => String(i).padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="mb-8">
                <label className="block mb-2 font-medium text-primary">Stop Time (운전 정지)</label>
                <div className="flex gap-2 items-center">
                  <select className="p-3 border border-gray-300 rounded-lg focus:border-secondary outline-none transition-colors" value={equipStopAmPm} disabled={equipIsContinuous} onChange={e => setEquipStopAmPm(e.target.value)}>
                    <option value="AM">AM (오전)</option>
                    <option value="PM">PM (오후)</option>
                  </select>
                  <select className="p-3 border border-gray-300 rounded-lg focus:border-secondary outline-none transition-colors flex-1" value={equipStopHour} disabled={equipIsContinuous} onChange={e => setEquipStopHour(e.target.value)}>
                    {Array.from({length: 12}, (_, i) => String(i + 1).padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <span className="font-bold">:</span>
                  <select className="p-3 border border-gray-300 rounded-lg focus:border-secondary outline-none transition-colors flex-1" value={equipStopMinute} disabled={equipIsContinuous} onChange={e => setEquipStopMinute(e.target.value)}>
                    {Array.from({length: 60}, (_, i) => String(i).padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <button onClick={handleSaveEquipSchedule} className="w-full bg-primary text-white p-3 rounded-lg flex justify-center items-center gap-2 hover:bg-primary/90 transition-colors font-medium">
              <CheckCircle size={20} /> Save Schedule
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
