'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import MainLayout from '../../components/layout/MainLayout';
import { LayoutGrid, Play, Square, FolderOpen, SlidersHorizontal, CheckCircle, AlertTriangle, XCircle, Info, X, Cpu, Settings2 } from 'lucide-react';

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

// 가짜 센서 데이터를 생성하는 커스텀 훅 (5초마다 갱신)
function useFakeSensors() {
  const [sensors, setSensors] = useState({
    temperature: 23.5,
    humidity: 65,
    light: 200,
    co2: 500,
    ph: 6.5,
    ec: 1.2,
    do: 7
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setSensors(prev => ({
        temperature: +(prev.temperature + (Math.random() - 0.5) * 0.5).toFixed(1),
        humidity: Math.max(0, Math.min(100, Math.round(prev.humidity + (Math.random() - 0.5) * 5))),
        light: Math.max(0, Math.round(prev.light + (Math.random() - 0.5) * 10)),
        co2: Math.max(400, Math.round(prev.co2 + (Math.random() - 0.5) * 20)),
        ph: +(prev.ph + (Math.random() - 0.5) * 0.1).toFixed(1),
        ec: +(prev.ec + (Math.random() - 0.5) * 0.1).toFixed(1),
        do: +(prev.do + (Math.random() - 0.5) * 0.2).toFixed(1),
      }));
    }, 5000);
    return () => clearInterval(interval);
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
    const savedS = localStorage.getItem('sf_active_sensors');
    const savedE = localStorage.getItem('sf_active_equipment');
    if (savedS) setActiveSensors(JSON.parse(savedS));
    if (savedE) setActiveEquipment(JSON.parse(savedE));
  }, []);

  const toggleSensor = (key: keyof typeof activeSensors) => {
    setActiveSensors(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('sf_active_sensors', JSON.stringify(next));
      return next;
    });
  };

  const toggleEquipmentSetting = (key: keyof typeof activeEquipment) => {
    setActiveEquipment(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('sf_active_equipment', JSON.stringify(next));
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

function DashboardContent() {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';
  const sensors = useFakeSensors();
  const { notifications, showNotification } = useNotification();
  const { equipment, toggleEquipment, startAll, stopAll } = useEquipmentControl(showNotification);

  // 💡 여기서 설정한 값들을 꺼내옵니다. 이 코드가 누락되어서 에러가 발생했었습니다!
  const { activeSensors, activeEquipment, toggleSensor, toggleEquipmentSetting } = useSystemSettings();
  const equipmentNamesList = { circulationFan: 'Circulation Fan', growLight: 'Grow Light', hvac: 'HVAC', humidifier: 'Humidifier', co2Generator: 'CO2 Generator', waterPump: 'Water Pump', solenoidValve: 'Solenoid Valve', dosingPump: 'Dosing Pump', airPump: 'Air Pump' };

  // 모달 상태 관리
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [configSensor, setConfigSensor] = useState('Temperature');
  const [configRate, setConfigRate] = useState('10');
  const [configLower, setConfigLower] = useState('');
  const [configUpper, setConfigUpper] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [loadedConfigs, setLoadedConfigs] = useState<any[]>([]);

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

  // 설정 리뷰 및 검증 로직
  const reviewConfig = () => {
    if (!configLower || !configUpper) return showNotification('Please enter both lower and upper thresholds.', 'warning');
    if (parseFloat(configLower) >= parseFloat(configUpper)) return showNotification('Lower threshold must be less than upper threshold.', 'error');
    setIsReviewing(true);
  };

  // 설정 저장 로직 (localStorage 활용)
  const saveConfig = () => {
    const configData = {
      samplingRate: configRate,
      lowerThreshold: parseFloat(configLower),
      upperThreshold: parseFloat(configUpper),
      lastUpdated: new Date().toISOString()
    };
    
    localStorage.setItem(`sf_sensor_config_${configSensor.replace(/\s+/g, '_')}`, JSON.stringify(configData));
    showNotification(`${configSensor} configuration saved successfully!`, 'success');
    
    setConfigLower('');
    setConfigUpper('');
    setIsReviewing(false);
    setIsConfigModalOpen(false);
  };

  return (
    <div className="animate-[fadeIn_0.5s_ease-in-out]">
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
                onClick={() => {
                  const sensorsList = ["Temperature", "Light Intensity", "Humidity", "Hydrogen Ion Concentration", "Electrical Conductivity", "Dissolved Oxygen", "Carbon Dioxide"];
                  const configs = sensorsList.map(s => {
                    const saved = localStorage.getItem(`sf_sensor_config_${s.replace(/\s+/g, '_')}`);
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
                <div className="text-4xl font-bold my-5 text-primary">{activeSensors.temperature ? `${sensors.temperature.toFixed(1)}°C` : '-'}</div>
                <span className={`px-4 py-1.5 rounded-full text-xs font-medium text-white tracking-wide ${activeSensors.temperature ? 'bg-success' : 'bg-gray-400'}`}>{activeSensors.temperature ? 'Normal' : 'Disabled'}</span>
              </div>
              <div className={`bg-light p-8 rounded-xl text-center transition-colors ${activeSensors.humidity ? 'hover:bg-gray-200' : 'opacity-40 grayscale pointer-events-none'}`}>
                <div className="text-secondary mb-4"><i className="mdi mdi-water-percent text-5xl"></i></div>
                <div className="text-lg font-semibold text-primary">Humidity</div>
                <div className="text-4xl font-bold my-5 text-primary">{activeSensors.humidity ? `${sensors.humidity}%` : '-'}</div>
                <span className={`px-4 py-1.5 rounded-full text-xs font-medium text-white tracking-wide ${activeSensors.humidity ? 'bg-success' : 'bg-gray-400'}`}>{activeSensors.humidity ? 'Optimal' : 'Disabled'}</span>
              </div>
              <div className={`bg-light p-8 rounded-xl text-center transition-colors ${activeSensors.light ? 'hover:bg-gray-200' : 'opacity-40 grayscale pointer-events-none'}`}>
                <div className="text-secondary mb-4"><i className="mdi mdi-white-balance-sunny text-5xl"></i></div>
                <div className="text-lg font-semibold text-primary">Light Intensity</div>
                <div className="text-4xl font-bold my-5 text-primary">{activeSensors.light ? `${sensors.light} µmol/m²s` : '-'}</div>
                <span className={`px-4 py-1.5 rounded-full text-xs font-medium text-white tracking-wide ${activeSensors.light ? 'bg-success' : 'bg-gray-400'}`}>{activeSensors.light ? 'Normal' : 'Disabled'}</span>
              </div>
            </div>

            <hr className="border-0 border-t border-gray-200 my-8" />

            {/* 소형 센서 그리드 (CO2, pH, EC, DO) */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
              <div className={`bg-light p-5 rounded-lg text-center transition-colors ${activeSensors.co2 ? 'hover:bg-gray-200' : 'opacity-40 grayscale pointer-events-none'}`}>
                <div className="text-secondary mb-2"><i className="mdi mdi-molecule-co2 text-4xl"></i></div>
                <div className="text-sm font-semibold text-gray-700">Carbon Dioxide</div>
                <div className="text-2xl font-bold my-3 text-primary">{activeSensors.co2 ? `${sensors.co2} ppm` : '-'}</div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${activeSensors.co2 ? 'bg-success' : 'bg-gray-400'}`}>{activeSensors.co2 ? 'Optimal' : 'Disabled'}</span>
              </div>
              <div className={`bg-light p-5 rounded-lg text-center transition-colors ${activeSensors.ph ? 'hover:bg-gray-200' : 'opacity-40 grayscale pointer-events-none'}`}>
                <div className="text-secondary mb-2"><i className="mdi mdi-flask text-4xl"></i></div>
                <div className="text-sm font-semibold text-gray-700">Hydrogen Ion Concentration</div>
                <div className="text-2xl font-bold my-3 text-primary">{activeSensors.ph ? sensors.ph.toFixed(1) : '-'}</div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${activeSensors.ph ? 'bg-success' : 'bg-gray-400'}`}>{activeSensors.ph ? 'Optimal' : 'Disabled'}</span>
              </div>
              <div className={`bg-light p-5 rounded-lg text-center transition-colors ${activeSensors.ec ? 'hover:bg-gray-200' : 'opacity-40 grayscale pointer-events-none'}`}>
                <div className="text-secondary mb-2"><i className="mdi mdi-lightning-bolt text-4xl"></i></div>
                <div className="text-sm font-semibold text-gray-700">Electrical Conductivity</div>
                <div className="text-2xl font-bold my-3 text-primary">{activeSensors.ec ? `${sensors.ec.toFixed(1)} dS/m` : '-'}</div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${activeSensors.ec ? 'bg-success' : 'bg-gray-400'}`}>{activeSensors.ec ? 'Optimal' : 'Disabled'}</span>
              </div>
              <div className={`bg-light p-5 rounded-lg text-center transition-colors ${activeSensors.do ? 'hover:bg-gray-200' : 'opacity-40 grayscale pointer-events-none'}`}>
                <div className="text-secondary mb-2"><i className="mdi mdi-chart-bubble text-4xl"></i></div>
                <div className="text-sm font-semibold text-gray-700">Dissolved Oxygen</div>
                <div className="text-2xl font-bold my-3 text-primary">{activeSensors.do ? `${sensors.do.toFixed(1)} mg/L` : '-'}</div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${activeSensors.do ? 'bg-success' : 'bg-gray-400'}`}>{activeSensors.do ? 'Optimal' : 'Disabled'}</span>
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
              <select className="w-full p-3 border border-gray-300 rounded-lg focus:border-secondary outline-none transition-colors" value={configRate} onChange={e => setConfigRate(e.target.value)}>
                <option value="10">10 seconds</option>
                <option value="30">30 seconds</option>
                <option value="60">1 minute</option>
                <option value="300">5 minutes</option>
              </select>
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
                    <th className="p-3 text-left font-semibold">Sampling Rate (s)</th>
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
                          <td className="p-3 text-gray-600">{c.samplingRate}</td>
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
    </div>
  );
}

export default function DashboardPage() {
  return (
    <MainLayout>
      <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
        <DashboardContent />
      </Suspense>
    </MainLayout>
  );
}