'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { LayoutGrid, Play, Square, FolderOpen, SlidersHorizontal, CheckCircle, AlertTriangle, XCircle, Info, X, Cpu, Settings2, Users, CircuitBoard, Wifi, Copy, Download, Code, Server, Terminal } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';

// 알림(Notification) 타입을 정의하고 관리하는 커스텀 훅
type NotificationType = 'success' | 'warning' | 'error' | 'info';
interface NotificationItem { id: number; message: string; type: NotificationType; }

function useNotification() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const showNotification = (message: string, type: NotificationType = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    // 5초 뒤에 알림 자동 삭제
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  };
  return { notifications, showNotification };
}

// 장비 개별 항목을 렌더링하는 재사용 컴포넌트
function EquipmentItem({ 
  name, icon, details, description, isOn, onToggle, isActive = true
}: { 
  name: string, icon: string, details: string, description: string, isOn: boolean, onToggle: (state: boolean) => void, isActive?: boolean
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
    if (val === 'custom') onChange(['custom']);
    else {
      const newSelected = selected.includes(val) 
        ? selected.filter(v => v !== val) 
        : [...selected.filter(v => v !== 'custom'), val];
      onChange(newSelected.length ? newSelected : ['custom']);
    }
  };

  return (
    <div className="relative w-full text-sm" tabIndex={0} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsOpen(false); }}>
      <div className="w-full p-2 border border-gray-300 rounded-lg cursor-pointer bg-white flex justify-between items-center hover:border-secondary transition-colors" onClick={() => setIsOpen(!isOpen)}>
        <span className="truncate mr-2 text-gray-700 font-medium">
          {selected.includes('custom') ? 'Custom / None' : selected.map(val => {
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
            <input type="checkbox" checked={selected.includes('custom')} onChange={() => toggleItem('custom')} className="mr-3 w-4 h-4 accent-secondary" /> Custom / None
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
function useSupabaseSensors() {
  const [sensors, setSensors] = useState({
    temperature: 0, humidity: 0, light: 0, co2: 0, ph: 0, ec: 0, do: 0
  });

  useEffect(() => {
    // 1. 페이지 로드 시 최신 데이터 1건 가져오기
    const fetchLatest = async () => {
      const { data, error } = await supabase
        .from('sensor_data')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data && !error) {
        setSensors(prev => ({
          ...prev,
          temperature: data.temperature ?? prev.temperature,
          humidity: data.humidity ?? prev.humidity,
          light: data.light_intensity ?? prev.light,
        }));
      }
    };
    fetchLatest();

    // 2. data-logger.py가 DB에 새 데이터를 INSERT 할 때마다 실시간 수신
    const channel = supabase
      .channel('realtime-sensor-data')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_data' },
        (payload) => {
          const newData = payload.new;
          setSensors(prev => ({
            ...prev,
            temperature: newData.temperature ?? prev.temperature,
            humidity: newData.humidity ?? prev.humidity,
            light: newData.light_intensity ?? prev.light,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return sensors;
}

// 시스템 설정(센서/기기 사용 여부)을 관리하는 커스텀 훅
function useSystemSettings() {
  const [activeSensors, setActiveSensors] = useState({
    temperature: true, humidity: true, light: true, co2: true, ph: true, ec: true, do: true
  });
  const [activeEquipment, setActiveEquipment] = useState({
    circulationFan: true, growLight: true, hvac: true, humidifier: true, co2Generator: true, waterPump: true, solenoidValve: true, dosingPump: true, airPump: true
  });

  useEffect(() => {
    const loadSettings = async () => {
      const { data: sensorData } = await supabase.from('app_settings').select('value').eq('key', 'sf_active_sensors').single();
      const { data: equipData } = await supabase.from('app_settings').select('value').eq('key', 'sf_active_equipment').single();
      
      if (sensorData?.value) setActiveSensors(sensorData.value);
      else {
        const savedS = localStorage.getItem('sf_active_sensors');
        if (savedS) setActiveSensors(JSON.parse(savedS));
      }
      
      if (equipData?.value) setActiveEquipment(equipData.value);
      else {
        const savedE = localStorage.getItem('sf_active_equipment');
        if (savedE) setActiveEquipment(JSON.parse(savedE));
      }
    };
    loadSettings();
  }, []);

  const toggleSensor = (key: keyof typeof activeSensors) => {
    setActiveSensors(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('sf_active_sensors', JSON.stringify(next));
      supabase.from('app_settings').upsert({ key: 'sf_active_sensors', value: next }).then();
      return next;
    });
  };

  const toggleEquipmentSetting = (key: keyof typeof activeEquipment) => {
    setActiveEquipment(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('sf_active_equipment', JSON.stringify(next));
      supabase.from('app_settings').upsert({ key: 'sf_active_equipment', value: next }).then();
      return next;
    });
  };

  return { activeSensors, activeEquipment, toggleSensor, toggleEquipmentSetting };
}

// 장비 상태를 관리하는 커스텀 훅
function useEquipmentControl(showNotification: (msg: string, type: NotificationType) => void) {
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

  const toggleEquipment = (key: keyof typeof equipment, state: boolean) => {
    setEquipment(prev => ({ ...prev, [key]: state }));
    showNotification(`${equipmentNames[key]} ${state ? 'activated' : 'deactivated'}`, 'success');
  };

  const startAll = () => {
    const allOn = Object.keys(equipment).reduce((acc, key) => ({ ...acc, [key]: true }), {} as typeof equipment);
    setEquipment(allOn);
    showNotification('Starting all equipment...', 'success');
  };

  const stopAll = () => {
    const allOff = Object.keys(equipment).reduce((acc, key) => ({ ...acc, [key]: false }), {} as typeof equipment);
    setEquipment(allOff);
    showNotification('Stopping all equipment...', 'warning');
  };

  return { equipment, toggleEquipment, startAll, stopAll };
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

export default function DashboardClient() {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';
  const { notifications, showNotification } = useNotification();
  const { equipment, toggleEquipment, startAll, stopAll } = useEquipmentControl(showNotification);

  // 💡 여기서 설정한 값들을 꺼내옵니다. 이 코드가 누락되어서 에러가 발생했었습니다!
  const { activeSensors, activeEquipment, toggleSensor, toggleEquipmentSetting } = useSystemSettings();
  const equipmentNamesList = { circulationFan: 'Circulation Fan', growLight: 'Grow Light', hvac: 'HVAC', humidifier: 'Humidifier', co2Generator: 'CO2 Generator', waterPump: 'Water Pump', solenoidValve: 'Solenoid Valve', dosingPump: 'Dosing Pump', airPump: 'Air Pump' };

  // Auth Status (Supabase)
  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user || null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

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

  // 센서 설정 모달이 열리거나 센서 종류(configSensor)를 변경할 때, 기존에 저장된 값을 폼에 불러오기
  useEffect(() => {
    const loadConfig = async () => {
      if (isConfigModalOpen) {
        const key = `sf_sensor_config_${configSensor.replace(/\s+/g, '_')}`;
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
          setConfigRateValue('10');
          setConfigRateUnit('second');
          setConfigLower('');
          setConfigUpper('');
        }
      }
    };
    loadConfig();
  }, [isConfigModalOpen, configSensor]);

  // 센서 설정값을 화면에 바로 표시하기 위한 상태 관리
  const [sensorConfigs, setSensorConfigs] = useState<Record<string, { lowerThreshold: number, upperThreshold: number, samplingRate: string | number, samplingRateValue?: number, samplingRateUnit?: string }>>({});

  const loadAllSensorConfigs = async () => {
    const sensorsList = ["Temperature", "Light Intensity", "Humidity", "Hydrogen Ion Concentration", "Electrical Conductivity", "Dissolved Oxygen", "Carbon Dioxide"];
    const newConfigs: Record<string, any> = {};
    
    const keys = sensorsList.map(s => `sf_sensor_config_${s.replace(/\s+/g, '_')}`);
    const { data } = await supabase.from('app_settings').select('key, value').in('key', keys);
    
    sensorsList.forEach(s => {
      const key = `sf_sensor_config_${s.replace(/\s+/g, '_')}`;
      const dbItem = data?.find(d => d.key === key);
      if (dbItem?.value) {
        newConfigs[s] = dbItem.value;
      } else {
        const saved = localStorage.getItem(key);
        if (saved) newConfigs[s] = JSON.parse(saved);
      }
    });
    setSensorConfigs(newConfigs);
  };

  useEffect(() => {
    loadAllSensorConfigs();
  }, []);
  
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
    A0: [['custom']],
    A1: [['Light Intensity']],
    D3: [['growLight']],
    D4: [['circulationFan']],
    D5: [['waterPump']],
    I2C: [['custom'], ['Temperature', 'Humidity']]
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
  const [generatedAgentCode, setGeneratedAgentCode] = useState<string>('');
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);

  // Supabase 실시간 센서 데이터 연동
  const sensors = useSupabaseSensors();

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
      }
      
      // 라즈베리파이 원격 로거 상태 로드
      const { data: loggerData } = await supabase.from('app_settings').select('value').eq('key', 'sf_logger_status').single();
      if (loggerData?.value) {
        setRemoteLoggerRunning(loggerData.value.running || false);
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
    };
    loadNetworkSettings();
  }, []);

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
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'sf_hardware_pins').single();
      let parsed = data?.value;
      if (!parsed) {
        const saved = localStorage.getItem('sf_hardware_pins');
        if (saved) parsed = JSON.parse(saved);
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
          Object.entries(oldMappings).forEach(([k, v]) => { migratedMappings[k] = Array.isArray(v) ? v.map((item: any) => Array.isArray(item) ? item : [item]) : [['custom']]; });
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
  }, []);

  // Hardware Pin Configuration 저장
  const handleSaveHardwareConfig = async () => {
    const hardwareData = { pinConfigs, pinMappings, pinMqttTopics, pinCounts };
    await supabase.from('app_settings').upsert({ key: 'sf_hardware_pins', value: hardwareData });
    localStorage.setItem('sf_hardware_pins', JSON.stringify(hardwareData));
    showNotification('Hardware pin configuration saved!', 'success');
  };

  // 라즈베리파이 원격 로거 시작/정지 토글 함수
  const handleToggleRemoteLogger = async (state: boolean) => {
    setRemoteLoggerRunning(state);
    await supabase.from('app_settings').upsert({ key: 'sf_logger_status', value: { running: state } });
    showNotification(state ? 'Start command sent to Raspberry Pi Agent!' : 'Stop command sent to Raspberry Pi Agent.', state ? 'success' : 'warning');
  };

  const handlePinDeviceChange = (pinId: string, index: number, value: string) => {
    setPinConfigs(prev => {
      const current = prev[pinId] || [];
      const next = [...current];
      next[index] = value;
      return { ...prev, [pinId]: next };
    });
  };

  const handlePinMappingChange = (pinId: string, index: number, value: string[]) => {
    setPinMappings(prev => {
      const current = prev[pinId] || [];
      const next = [...current];
      next[index] = value;
      return { ...prev, [pinId]: next };
    });
    
    // 매핑 항목 수에 맞게 MQTT Topic 배열 개수도 동기화
    setPinMqttTopics(prev => {
      const current = prev[pinId] || [];
      const next = [...current];
      const currentTopics = next[index] || [];
      
      const newTopics = value.map((_, i) => currentTopics[i] !== undefined ? currentTopics[i] : (currentTopics[currentTopics.length - 1] || 'smartfarm/uno-r4/topic'));
      next[index] = newTopics;
      return { ...prev, [pinId]: next };
    });
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
        networkInfo: { wifiSsid, mqttServer, mqttUsername },
        hardwarePins: {
          configs: pinConfigs,
          mappings: pinMappings,
          topics: pinMqttTopics
        },
        sensorSettings: sensorConfigs
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

  // Raspberry Pi (Python) 코드 자동 생성 함수
  const handleGeneratePythonCode = async () => {
    setIsGeneratingCode(true); // 로딩 상태 공유
    showNotification('Loading Python logger script...', 'info');
    try {
      const response = await fetch('/api/get-python-logger');
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

  // 파수꾼 에이전트(agent.py) 코드 자동 생성 함수
  const handleGenerateAgentCode = () => {
    const agentCode = `import os
import time
import subprocess
from supabase import create_client, Client
from dotenv import load_dotenv

# 1. 환경 변수 로드 (.env)
load_dotenv()

# ==============================================================================
# ⚠️ [사용자 환경 설정 - 필수 수정 항목] ⚠️
# 라즈베리파이 등 배포하는 환경에 맞게 .env 파일을 생성하여 변수를 선언하거나,
# 아래 os.getenv(...) 부분을 지우고 "자신의_실제_문자열_값"으로 직접 덮어쓰세요.
# ==============================================================================

# 1. Supabase 설정
# SUPABASE_URL: Supabase 프로젝트 URL (예: "https://xxxx.supabase.co")
# SUPABASE_KEY: Supabase Service Role Key (보안 주의: 절대 외부에 노출하지 마세요)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("[오류] Supabase 설정이 누락되었습니다. 코드를 직접 수정하거나 .env를 설정하세요.")

# ==============================================================================

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
logger_process = None

print("Agent is running and listening for remote commands from Dashboard...")

while True:
    try:
        response = supabase.table("app_settings").select("value").eq("key", "sf_logger_status").execute()
        
        if response.data and len(response.data) > 0:
            settings = response.data[0].get("value", {})
            should_run = settings.get("running", False)

            if should_run and logger_process is None:
                print("[Command Received] START -> Starting data-logger.py...")
                logger_process = subprocess.Popen(["python", "data-logger.py"])
            elif not should_run and logger_process is not None:
                print("[Command Received] STOP -> Terminating data-logger.py...")
                logger_process.terminate()
                logger_process.wait()
                logger_process = None
                
    except Exception as e:
        print(f"Error checking status: {e}")

    time.sleep(5) # 5초마다 웹 대시보드의 스위치 상태 확인
`;
    setGeneratedAgentCode(agentCode);
    setIsAgentModalOpen(true);
  };

  // 설정 리뷰 및 검증 로직
  const reviewConfig = () => {
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
    
    const key = `sf_sensor_config_${configSensor.replace(/\s+/g, '_')}`;
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
        redirectTo: `${window.location.origin}/dashboard`
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
  const humStatus = getSensorStatus('Humidity', sensors.humidity, activeSensors.humidity, 'Optimal');
  const lightStatus = getSensorStatus('Light Intensity', sensors.light, activeSensors.light, 'Normal');
  const co2Status = getSensorStatus('Carbon Dioxide', sensors.co2, activeSensors.co2, 'Optimal');
  const phStatus = getSensorStatus('Hydrogen Ion Concentration', sensors.ph, activeSensors.ph, 'Optimal');
  const ecStatus = getSensorStatus('Electrical Conductivity', sensors.ec, activeSensors.ec, 'Optimal');
  const doStatus = getSensorStatus('Dissolved Oxygen', sensors.do, activeSensors.do, 'Optimal');

  // 다중 선택 드롭다운 옵션 정의
  const mappingOptions = [
    { group: 'Sensors', items: [
      { label: 'Temperature', value: 'Temperature' }, { label: 'Humidity', value: 'Humidity' }, { label: 'Light Intensity', value: 'Light Intensity' },
      { label: 'pH', value: 'Hydrogen Ion Concentration' }, { label: 'EC', value: 'Electrical Conductivity' }, { label: 'DO', value: 'Dissolved Oxygen' }, { label: 'Carbon Dioxide', value: 'Carbon Dioxide' }
    ]},
    { group: 'Equipment', items: Object.entries(equipmentNamesList).map(([k, v]) => ({ label: v, value: k })) }
  ];

  return (
    <div className="animate-[fadeIn_0.5s_ease-in-out] w-full">
      {currentTab === 'dashboard' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-primary">Dashboard Overview</h2>
            <div className="flex gap-4">
              <button onClick={() => showNotification('Starting all systems...', 'success')} className="flex items-center gap-2 bg-secondary hover:bg-secondary/90 text-white px-4 py-2 rounded-lg transition-all">
                <Play size={18} /> Start All
              </button>
              <button 
                onClick={() => {
                  if(confirm('Are you sure you want to execute emergency stop? This will halt all operations.')) showNotification('Emergency stop activated! All systems halted.', 'error');
                }} 
                className="flex items-center gap-2 bg-danger hover:bg-danger/90 text-white px-4 py-2 rounded-lg transition-all"
              >
                <Square size={18} /> Emergency Stop
              </button>
            </div>
          </div>

          <div className="p-10 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300 shadow-sm">
            <LayoutGrid className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg">Dashboard content has been cleared to focus purely on Sensor Monitoring and Equipment Control.</p>
            <p className="text-sm mt-2">Please select 'Sensor Monitoring' or 'Equipment Control' from the sidebar.</p>
          </div>
        </div>
      )}

      {currentTab === 'sensors' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-primary">Sensor Monitoring</h2>
            <div className="flex gap-4">
              <button 
                onClick={async () => {
                  const sensorsList = ["Temperature", "Light Intensity", "Humidity", "Hydrogen Ion Concentration", "Electrical Conductivity", "Dissolved Oxygen", "Carbon Dioxide"];
                  const keys = sensorsList.map(s => `sf_sensor_config_${s.replace(/\s+/g, '_')}`);
                  const { data } = await supabase.from('app_settings').select('key, value').in('key', keys);

                  const configs = sensorsList.map(s => {
                    const key = `sf_sensor_config_${s.replace(/\s+/g, '_')}`;
                    const dbItem = data?.find(d => d.key === key);
                    if (dbItem?.value) return { sensor: s, ...dbItem.value };
                    
                    const saved = localStorage.getItem(key);
                    if (saved) return { sensor: s, ...JSON.parse(saved) };
                    
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
        </div>
      )}

      {currentTab === 'equipment' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-primary">Equipment Control</h2>
            <div className="flex gap-4">
              <button onClick={startAll} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition-all">
                <Play size={18} /> Start All
              </button>
              <button onClick={stopAll} className="flex items-center gap-2 bg-danger hover:bg-danger/90 text-white px-4 py-2 rounded-lg transition-all">
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
              />
              <EquipmentItem 
                name="Grow Light" icon="mdi-lightbulb-on" 
                details="Power: ON / OFF | Dimming: 0 ~ 100%" description="광합성에 필요한 유효 광량(PPFD) 공급"
                isOn={equipment.growLight} onToggle={(state) => toggleEquipment('growLight', state)} isActive={activeEquipment.growLight}
              />
              <EquipmentItem 
                name="HVAC" icon="mdi-air-conditioner" 
                details="Power: ON / OFF | Target Temp(°C)" description="목표 온도(DIF) 유지를 위한 강력한 온도 제어"
                isOn={equipment.hvac} onToggle={(state) => toggleEquipment('hvac', state)} isActive={activeEquipment.hvac}
              />
              <EquipmentItem 
                name="Humidifier" icon="mdi-air-humidifier" 
                details="Power: ON / OFF | Target Hum(%)" description="적정 상대습도(RH) 유지 및 곰팡이병 방지"
                isOn={equipment.humidifier} onToggle={(state) => toggleEquipment('humidifier', state)} isActive={activeEquipment.humidifier}
              />
              <EquipmentItem 
                name="CO2 Generator" icon="mdi-gas-cylinder" 
                details="Valve State: Open / Close | Target CO2(ppm)" description="광합성 촉진을 위한 탄산가스 시비"
                isOn={equipment.co2Generator} onToggle={(state) => toggleEquipment('co2Generator', state)} isActive={activeEquipment.co2Generator}
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
              />
              <EquipmentItem 
                name="Solenoid Valve" icon="mdi-pipe-valve" 
                details="Valve State: Open / Close" description="특정 구역(Zone)으로 가는 관수 라인 개폐"
                isOn={equipment.solenoidValve} onToggle={(state) => toggleEquipment('solenoidValve', state)} isActive={activeEquipment.solenoidValve}
              />
              <EquipmentItem 
                name="Dosing Pump" icon="mdi-eyedropper" 
                details="Injection(mL) | Pulse" description="A액, B액, 산, 알칼리를 튜브로 미세 주입하여 EC/pH 맞춤"
                isOn={equipment.dosingPump} onToggle={(state) => toggleEquipment('dosingPump', state)} isActive={activeEquipment.dosingPump}
              />
              <EquipmentItem 
                name="Air Pump" icon="mdi-weather-windy" 
                details="Power: ON / OFF" description="양액 탱크 내 용존 산소(DO) 농도 증가"
                isOn={equipment.airPump} onToggle={(state) => toggleEquipment('airPump', state)} isActive={activeEquipment.airPump}
              />
            </div>
          </div>
        </div>
      )}

      {/* System Settings Tab */}
      {currentTab === 'settings' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-primary">System Settings</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border-t-4 border-primary">
              <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2"><Cpu size={20}/> Sensor Visibility</h3>
              <div className="flex flex-col gap-3">
                {Object.entries({ temperature: 'Temperature', humidity: 'Humidity', light: 'Light Intensity', co2: 'Carbon Dioxide', ph: 'Hydrogen Ion Concentration', ec: 'Electrical Conductivity', do: 'Dissolved Oxygen' }).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-light rounded-lg transition-colors">
                    <input type="checkbox" checked={activeSensors[key as keyof typeof activeSensors]} onChange={() => toggleSensor(key as keyof typeof activeSensors)} className="w-5 h-5 accent-secondary cursor-pointer" />
                    <span className="text-gray-700 font-medium">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border-t-4 border-secondary">
              <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2"><Settings2 size={20}/> Equipment Availability</h3>
              <div className="flex flex-col gap-3">
                {Object.entries(equipmentNamesList).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-light rounded-lg transition-colors">
                    <input type="checkbox" checked={activeEquipment[key as keyof typeof activeEquipment]} onChange={() => toggleEquipmentSetting(key as keyof typeof activeEquipment)} className="w-5 h-5 accent-secondary cursor-pointer" />
                    <span className="text-gray-700 font-medium">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Arduino Setting Tab */}
      {currentTab === 'arduino' && (
        <div className="animate-[fadeIn_0.5s_ease-in-out]">
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
                      <th className="p-4 font-semibold w-[20%]">MQTT Topic</th>
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
                                <MultiSelectDropdown options={mappingOptions} selected={pinMappings[pin.id]?.[i] || ['custom']} onChange={(vals) => handlePinMappingChange(pin.id, i, vals)} />
                              </td>
                              <td className="p-4 align-top">
                                <div className="flex flex-col gap-1 w-full bg-gray-50/50 p-1.5 rounded-lg border border-gray-100">
                                  {(pinMappings[pin.id]?.[i] || ['custom']).map((mapping, tIdx) => (
                                    <input key={tIdx} type="text" placeholder={`Topic for ${mapping}`} value={pinMqttTopics[pin.id]?.[i]?.[tIdx] || ''} onChange={(e) => handlePinMqttTopicChange(pin.id, i, tIdx, e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary outline-none text-xs transition-all bg-white" />
                                  ))}
                                </div>
                              </td>
                              <td className="p-4 align-top">
                                <input type="text" placeholder={pin.isBus ? `Bus Device ${i + 1} (e.g. Module)` : pin.id === 'UART' ? 'e.g. RS485, MH-Z19' : `e.g. DHT22 Sensor`} value={pinConfigs[pin.id]?.[i] || ''} onChange={(e) => handlePinDeviceChange(pin.id, i, e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary outline-none text-sm transition-all" />
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
      {currentTab === 'raspberry' && (
        <div className="animate-[fadeIn_0.5s_ease-in-out]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-primary">Raspberry Pi Data Logger</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* 원격 프로세스 제어 패널 */}
            <div className="bg-white rounded-xl p-8 shadow-[0_4px_12px_rgba(0,0,0,0.05)] border-t-4 border-secondary flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2"><Server size={24} /> Remote Logger Control</h3>
                <p className="text-gray-600 text-sm mb-6">
                  Start or stop the <code>data-logger.py</code> process running on your Raspberry Pi remotely from anywhere.
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 flex justify-between items-center">
                <span className="font-medium text-gray-700">Logger Process Status</span>
                <EquipmentItem name="" icon="" details="" description="" isOn={remoteLoggerRunning} onToggle={handleToggleRemoteLogger} isActive={true} />
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-3 font-medium">To enable remote control, the Agent script must be running on your Raspberry Pi.</p>
                <button onClick={handleGenerateAgentCode} className="w-full flex justify-center items-center gap-2 bg-secondary hover:bg-secondary/90 text-white px-4 py-2.5 rounded-lg font-medium transition-all shadow-sm text-sm">
                  <Terminal size={18} /> Generate agent.py
                </button>
              </div>
            </div>

            {/* 코드 생성 패널 */}
            <div className="bg-white rounded-xl p-8 shadow-[0_4px_12px_rgba(0,0,0,0.05)] border-t-4 border-primary">
              <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2"><Terminal size={24} /> Python Edge Logger Setup</h3>
              <p className="text-gray-600 text-sm mb-6">
                Generate the <code>data-logger.py</code> script configured with your current MQTT and Supabase settings to deploy on your Raspberry Pi.
              </p>
              
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
          <div key={n.id} className={`flex items-center gap-3 p-4 bg-white rounded-lg shadow-lg border-l-4 animate-in slide-in-from-right-8 fade-in duration-300
            ${n.type === 'success' ? 'border-success' : n.type === 'warning' ? 'border-warning' : n.type === 'error' ? 'border-danger' : 'border-info'}`}>
            <div className="flex-shrink-0">
              {n.type === 'success' && <CheckCircle className="text-success" size={24} />}
              {n.type === 'warning' && <AlertTriangle className="text-warning" size={24} />}
              {n.type === 'error' && <XCircle className="text-danger" size={24} />}
              {n.type === 'info' && <Info className="text-info" size={24} />}
            </div>
            <div className="text-gray-800 font-medium">{n.message}</div>
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
                <option value="Temperature">Temperature</option>
                <option value="Light Intensity">Light Intensity</option>
                <option value="Humidity">Humidity</option>
                <option value="Hydrogen Ion Concentration">Hydrogen Ion Concentration</option>
                <option value="Electrical Conductivity">Electrical Conductivity</option>
                <option value="Dissolved Oxygen">Dissolved Oxygen</option>
                <option value="Carbon Dioxide">Carbon Dioxide</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block mb-2 font-medium text-primary">Sensor Sampling Rate</label>
              <div className="flex gap-2">
                <input type="number" min="1" step="any" className="flex-1 p-3 border border-gray-300 rounded-lg focus:border-secondary outline-none transition-colors" placeholder="Enter value" value={configRateValue} onChange={e => setConfigRateValue(e.target.value)} />
                <select className="w-[140px] p-3 border border-gray-300 rounded-lg focus:border-secondary outline-none transition-colors" value={configRateUnit} onChange={e => setConfigRateUnit(e.target.value)}>
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

      {/* Generated Agent Code Modal */}
      {isAgentModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[1000] animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-xl w-[90%] max-w-[800px] max-h-[90vh] flex flex-col shadow-2xl border-t-4 border-secondary">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-semibold text-primary flex items-center gap-2"><Terminal size={24} /> agent.py (Remote Controller)</h3>
              <button onClick={() => setIsAgentModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
            </div>
            
            <div className="mb-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <strong>💡 How to run on Raspberry Pi:</strong><br/>
              1. Download both <code className="bg-white px-1">data-logger.py</code> and <code className="bg-white px-1">agent.py</code> to the same folder.<br/>
              2. Install dependencies: <code className="bg-white px-1">pip install supabase python-dotenv paho-mqtt</code><br/>
              3. Run the agent: <code className="bg-white px-1">python agent.py</code>
            </div>

            <div className="flex-1 flex flex-col bg-gray-900 rounded-lg p-4 mb-6 min-h-[300px]">
              <textarea 
                className="w-full flex-1 bg-transparent text-purple-400 font-mono text-sm outline-none resize-none whitespace-pre overflow-auto"
                value={generatedAgentCode}
                onChange={(e) => setGeneratedAgentCode(e.target.value)}
                spellCheck={false}
              />
            </div>

            <div className="flex gap-4">
              <button onClick={() => { navigator.clipboard.writeText(generatedAgentCode); showNotification('Agent script copied!', 'success'); }} className="flex-1 flex items-center justify-center gap-2 bg-light hover:bg-gray-200 text-gray-800 p-3 rounded-lg font-medium transition-colors border border-gray-300">
                <Copy size={20} /> Copy Code
              </button>
              <button onClick={() => {
                const blob = new Blob([generatedAgentCode], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'agent.py'; a.click(); URL.revokeObjectURL(url);
              }} className="flex-1 flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/90 text-white p-3 rounded-lg font-medium transition-colors">
                <Download size={20} /> Download .py File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}