import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase/client';
import { Save, Plus, Trash2, Edit2, Tractor, CheckCircle, XCircle, Settings, Cpu, Settings2, Wifi, Server, CircuitBoard, ArrowUp, ArrowDown } from 'lucide-react';
import { CROP_ICONS } from '../layout/Sidebar';
import Link from 'next/link';
import EmojiIcon from '../ui/EmojiIcon';
import CropIconPickerModal from './CropIconPickerModal';

export interface CropItem {
  name: string;
  icon: string;
}

interface Facility {
  id?: string;
  device_id: string;
  mqtt_topic: string;
  description: string;
  is_active: boolean;
  crops: any[];
}

const DEFAULT_SENSORS = [
  { id: 'temperature', label: 'Temperature' },
  { id: 'humidity', label: 'Humidity' },
  { id: 'light', label: 'Light Intensity' },
  { id: 'co2', label: 'Carbon Dioxide' },
  { id: 'ph', label: 'Hydrogen Ion Concentration' },
  { id: 'ec', label: 'Electrical Conductivity' },
  { id: 'do', label: 'Dissolved Oxygen' }
];

const DEFAULT_EQUIPMENT = [
  { id: 'circulationFan', label: 'Circulation Fan' },
  { id: 'growLight', label: 'Grow Light' },
  { id: 'hvac', label: 'HVAC System' },
  { id: 'humidifier', label: 'Humidifier' },
  { id: 'co2Generator', label: 'CO2 Generator' },
  { id: 'waterPump', label: 'Water Pump' },
  { id: 'solenoidValve', label: 'Solenoid Valve' },
  { id: 'dosingPump', label: 'Dosing Pump' },
  { id: 'airPump', label: 'Air Pump' }
];

export default function FacilitiesSettings({ showNotification, onFacilitiesChange }: { showNotification: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void, onFacilitiesChange?: () => void }) {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Facility> | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  
  // App Settings States
  const [wifiConfig, setWifiConfig] = useState({ ssid: '', password: '' });
  const [activeSensors, setActiveSensors] = useState<Record<string, boolean>>({});
  const [activeEquipment, setActiveEquipment] = useState<Record<string, boolean>>({});
  const [customSensors, setCustomSensors] = useState<any[]>([]);
  const [customEquipments, setCustomEquipments] = useState<any[]>([]);
  const [cameras, setCameras] = useState<{id: string, name: string, url: string}[]>([]);

  const [facilitiesOrder, setFacilitiesOrder] = useState<string[]>([]);

  const fetchFacilities = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('device_configs').select('*').order('device_id', { ascending: true });
    
    // Fetch custom order
    const { data: orderData } = await supabase.from('app_settings').select('value').eq('key', 'sf_facilities_order').single();
    const orderArr: string[] = orderData?.value || [];
    setFacilitiesOrder(orderArr);

    if (error) {
      showNotification('Failed to fetch facilities', 'error');
    } else {
      let fetched = data || [];
      // Sort by orderArr
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
    setLoading(false);
  };

  const moveFacility = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === facilities.length - 1) return;

    const newFacilities = [...facilities];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    const temp = newFacilities[index];
    newFacilities[index] = newFacilities[swapIndex];
    newFacilities[swapIndex] = temp;
    
    setFacilities(newFacilities);
    
    const newOrder = newFacilities.map(f => f.device_id);
    setFacilitiesOrder(newOrder);
    
    const { error } = await supabase.from('app_settings').upsert({
      key: 'sf_facilities_order',
      value: newOrder
    });
    
    if (error) {
      showNotification('Failed to save order', 'error');
    } else {
      if (onFacilitiesChange) onFacilitiesChange();
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, []);

  const loadAppSettings = async (deviceId: string) => {
    const keys = [
      `sf_wifi_config_${deviceId}`,
      `sf_active_sensors_${deviceId}`,
      `sf_active_equipment_${deviceId}`,
      `sf_cameras_${deviceId}`
    ];
    const { data } = await supabase.from('app_settings').select('key, value').in('key', keys);
    
    const wifi = data?.find(d => d.key === `sf_wifi_config_${deviceId}`)?.value || { ssid: '', password: '' };
    const sensors = data?.find(d => d.key === `sf_active_sensors_${deviceId}`)?.value || {};
    const equip = data?.find(d => d.key === `sf_active_equipment_${deviceId}`)?.value || {};
    const cams = data?.find(d => d.key === `sf_cameras_${deviceId}`)?.value || [];

    // Initialize defaults if missing
    DEFAULT_SENSORS.forEach(s => {
      if (sensors[s.id] === undefined) sensors[s.id] = true;
    });
    DEFAULT_EQUIPMENT.forEach(e => {
      if (equip[e.id] === undefined) equip[e.id] = true;
    });

    setWifiConfig(wifi);
    setActiveSensors(sensors);
    setActiveEquipment(equip);
    setCameras(Array.isArray(cams) ? cams : []);
  };

  const handleEdit = async (facility: Facility) => {
    setIsEditing(facility.device_id);
    setEditForm({ ...facility, crops: facility.crops || [] });
    await loadAppSettings(facility.device_id);
  };

  const handleAddNew = () => {
    const newId = `new-device-${Date.now().toString().slice(-4)}`;
    const newFacility: Facility = {
      device_id: newId,
      mqtt_topic: `smartfarm/${newId}/sensors`,
      description: '새로운 시설',
      is_active: true,
      crops: []
    };
    setEditForm(newFacility);
    
    // Default App Settings
    setWifiConfig({ ssid: '', password: '' });
      setCustomSensors([]);
      setCustomEquipments([]);
      setCameras([]);
    const defaultS: any = {};
    DEFAULT_SENSORS.forEach(s => defaultS[s.id] = true);
    setActiveSensors(defaultS);
    
    const defaultE: any = {};
    DEFAULT_EQUIPMENT.forEach(e => defaultE[e.id] = true);
    setActiveEquipment(defaultE);
    
    setIsEditing('new');
  };

  const handleSave = async () => {
    if (!editForm) return;
    if (!editForm.device_id.trim() || !editForm.mqtt_topic.trim()) {
      showNotification('Device ID and MQTT Topic are required.', 'warning');
      return;
    }

    const { error } = await supabase.from('device_configs').upsert({
      device_id: editForm.device_id,
      mqtt_topic: editForm.mqtt_topic,
      description: editForm.description,
      is_active: editForm.is_active,
      crops: editForm.crops
    }, { onConflict: 'device_id' });

    if (error) {
      showNotification(`Failed to save: ${error.message}`, 'error');
      return;
    }

    // Save App Settings
    await supabase.from('app_settings').upsert([
      { key: `sf_wifi_config_${editForm.device_id}`, value: wifiConfig },
      { key: `sf_active_sensors_${editForm.device_id}`, value: activeSensors },
      { key: `sf_active_equipment_${editForm.device_id}`, value: activeEquipment },
      { key: `sf_cameras_${editForm.device_id}`, value: cameras }
    ]);

    showNotification('Facility saved successfully.', 'success');
    setIsEditing(null);
    setEditForm(null);
    fetchFacilities();
    if (onFacilitiesChange) onFacilitiesChange();
  };

  const handleDelete = async (deviceId: string) => {
    if (!window.confirm(`Are you sure you want to delete facility '${deviceId}'? All related data will be lost.`)) return;
    
    const { error } = await supabase.from('device_configs').delete().eq('device_id', deviceId);
    if (error) {
      showNotification(`Failed to delete: ${error.message}`, 'error');
    } else {
      showNotification('Facility deleted.', 'success');
      fetchFacilities();
      if (onFacilitiesChange) onFacilitiesChange();
    }
  };

  const handleAddCrop = (cropData: { name: string; icon: string }) => {
    if (!editForm) return;
    const currentCrops = editForm.crops || [];
    const exists = currentCrops.some(c => (typeof c === 'string' ? c : c.name) === cropData.name);
    if (!exists) {
      setEditForm({ ...editForm, crops: [...currentCrops, cropData] });
    }
  };

  const removeCrop = (cropName: string) => {
    if (!editForm) return;
    setEditForm({ 
      ...editForm, 
      crops: (editForm.crops || []).filter(c => (typeof c === 'string' ? c : c.name) !== cropName) 
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Tractor className="text-secondary" /> Facilities & Crops Management
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            시스템에 연동할 하우스/베드와 재배 중인 작물을 관리합니다.
          </p>
        </div>
        <button 
          onClick={handleAddNew}
          disabled={isEditing !== null}
          className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark transition-colors disabled:opacity-50"
        >
          <Plus size={18} /> 새 시설 추가
        </button>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading facilities...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
                  <th className="p-3 font-semibold">시설 이름 (Description)</th>
                  <th className="p-3 font-semibold">Device ID</th>
                  <th className="p-3 font-semibold">재배 작물 (Crops)</th>
                  <th className="p-3 font-semibold text-center">Status</th>
                  <th className="p-3 font-semibold">Quick Settings</th>
                  <th className="p-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {facilities.length === 0 && isEditing !== 'new' && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      등록된 시설이 없습니다. 우측 상단의 '새 시설 추가' 버튼을 눌러 추가해주세요.
                    </td>
                  </tr>
                )}
                
                {/* 렌더링 리스트 */}
                {facilities.map((facility, idx) => (
                  <tr key={facility.device_id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="p-3 font-medium text-gray-800">{facility.description || '-'}</td>
                    <td className="p-3 text-sm text-gray-600 font-mono bg-gray-100/50 rounded">{facility.device_id}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {(facility.crops || []).map((crop, idx) => {
                          const name = typeof crop === 'string' ? crop : crop.name;
                          const icon = typeof crop === 'string' ? CROP_ICONS[crop] || '🌱' : crop.icon;
                          return (
                            <span key={idx} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full border border-green-200 flex items-center gap-1">
                              <span><EmojiIcon emoji={icon} size={14} /></span> {name}
                            </span>
                          );
                        })}
                        {(!facility.crops || facility.crops.length === 0) && <span className="text-xs text-gray-400">설정 안됨</span>}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {facility.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-200"><CheckCircle size={12} /> Active</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200"><XCircle size={12} /> Inactive</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2 flex-wrap">
                          <Link href={`?tab=sensors&deviceId=${facility.device_id}`} className="text-xs flex items-center gap-1 bg-white border border-gray-200 px-2 py-1 rounded hover:bg-gray-50 text-gray-600">
                            <Cpu size={12} /> Sensors
                          </Link>
                          <Link href={`?tab=equipment&deviceId=${facility.device_id}`} className="text-xs flex items-center gap-1 bg-white border border-gray-200 px-2 py-1 rounded hover:bg-gray-50 text-gray-600">
                            <Settings2 size={12} /> Equipment
                          </Link>
                          <Link href={`?tab=arduino&deviceId=${facility.device_id}`} className="text-xs flex items-center gap-1 bg-white border border-gray-200 px-2 py-1 rounded hover:bg-gray-50 text-gray-600">
                            <CircuitBoard size={12} /> Arduino
                          </Link>
                          <Link href={`?tab=raspberry&deviceId=${facility.device_id}`} className="text-xs flex items-center gap-1 bg-white border border-gray-200 px-2 py-1 rounded hover:bg-gray-50 text-gray-600">
                            <Server size={12} /> Raspberry
                          </Link>
                      </div>
                    </td>
                    <td className="p-3 text-right flex justify-end items-center gap-1 h-full">
                      <div className="flex flex-col mr-2 border-r pr-2 border-gray-200">
                        <button onClick={() => moveFacility(idx, 'up')} disabled={idx === 0} className="p-0.5 text-gray-500 hover:text-primary hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed" title="Move Up"><ArrowUp size={14} /></button>
                        <button onClick={() => moveFacility(idx, 'down')} disabled={idx === facilities.length - 1} className="p-0.5 text-gray-500 hover:text-primary hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed" title="Move Down"><ArrowDown size={14} /></button>
                      </div>
                      <button onClick={() => handleEdit(facility)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors mr-1" title="Edit"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(facility.device_id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 편집 모달 (Form) */}
        {isEditing && editForm && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                <h3 className="text-lg font-bold text-gray-800">
                  {isEditing === 'new' ? '새 시설 등록 및 설정' : '시설 및 가용성 설정'}
                </h3>
                <button onClick={() => setIsEditing(null)} className="text-gray-400 hover:text-gray-600">
                  <XCircle size={24} />
                </button>
              </div>
              
              <div className="p-6 space-y-8">
                {/* Basic Info */}
                <div>
                  <h4 className="text-md font-semibold text-primary mb-4 flex items-center gap-2 border-b pb-2"><Settings size={18}/> Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">시설 이름 (Description) <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        value={editForm.description} 
                        onChange={e => setEditForm({...editForm, description: e.target.value})}
                        placeholder="예: A동 1번 베드"
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">상태 (Active)</label>
                      <div className="flex items-center h-[42px]">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={editForm.is_active} onChange={e => setEditForm({...editForm, is_active: e.target.checked})} />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
                          <span className="ml-3 text-sm font-medium text-gray-700">{editForm.is_active ? '데이터 수집 활성화' : '수집 일시정지'}</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Device ID <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        value={editForm.device_id} 
                        onChange={e => {
                          const newId = e.target.value;
                          setEditForm({...editForm, device_id: newId, mqtt_topic: `smartfarm/${newId}/sensors`});
                        }}
                        disabled={isEditing !== 'new'}
                        placeholder="예: bunny"
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">MQTT Topic <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        value={editForm.mqtt_topic} 
                        onChange={e => setEditForm({...editForm, mqtt_topic: e.target.value})}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all font-mono text-sm"
                      />
                    </div>
                    <div className="md:col-span-2 mt-4 border-t pt-4">
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">Live Camera Streams</label>
                        <button 
                          onClick={() => setCameras([...cameras, { id: Date.now().toString(), name: `카메라 ${cameras.length + 1}`, url: '' }])}
                          className="text-xs flex items-center gap-1 bg-secondary text-white px-2 py-1 rounded hover:bg-secondary-dark transition-colors"
                        >
                          <Plus size={14} /> 추가
                        </button>
                      </div>
                      
                      {cameras.length === 0 ? (
                        <p className="text-xs text-gray-400 italic bg-gray-50 p-3 rounded border border-dashed border-gray-200">설정된 카메라가 없습니다. 추가 버튼을 눌러 카메라를 등록하세요.</p>
                      ) : (
                        <div className="space-y-2">
                          {cameras.map((cam, idx) => (
                            <div key={cam.id} className="flex flex-col sm:flex-row gap-2 bg-gray-50 p-2 rounded border border-gray-200 items-start sm:items-center">
                              <input 
                                type="text" 
                                value={cam.name} 
                                onChange={e => {
                                  const newCams = [...cameras];
                                  newCams[idx].name = e.target.value;
                                  setCameras(newCams);
                                }}
                                placeholder="이름 (예: A동 전면)"
                                className="w-full sm:w-1/3 p-2 bg-white border border-gray-200 rounded focus:ring-1 focus:ring-secondary outline-none text-sm"
                              />
                              <input 
                                type="text" 
                                value={cam.url} 
                                onChange={e => {
                                  const newCams = [...cameras];
                                  newCams[idx].url = e.target.value;
                                  setCameras(newCams);
                                }}
                                placeholder="http://[IP]:8889/cam/"
                                className="w-full flex-1 p-2 bg-white border border-gray-200 rounded focus:ring-1 focus:ring-secondary outline-none text-sm"
                              />
                              <button 
                                onClick={() => {
                                  const newCams = [...cameras];
                                  newCams.splice(idx, 1);
                                  setCameras(newCams);
                                }}
                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="삭제"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Crops Info */}
                <div>
                  <h4 className="text-md font-semibold text-primary mb-4 flex items-center gap-2 border-b pb-2"><Tractor size={18}/> Cultivation Crops</h4>
                  <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 min-h-[50px] items-center">
                    {(editForm.crops || []).length === 0 ? (
                      <span className="text-sm text-gray-400">선택된 작물이 없습니다.</span>
                    ) : (
                      (editForm.crops || []).map((crop, idx) => {
                        const name = typeof crop === 'string' ? crop : crop.name;
                        const icon = typeof crop === 'string' ? CROP_ICONS[crop] || '🌱' : crop.icon;
                        return (
                          <div key={idx} className="bg-secondary/10 text-secondary-dark px-3 py-1.5 rounded-full border border-secondary/20 flex items-center gap-2 text-sm font-medium shadow-sm">
                            <span className="flex items-center"><EmojiIcon emoji={icon} size={16} /></span>
                            <span>{name}</span>
                            <button onClick={() => removeCrop(name)} className="text-secondary hover:text-red-500 transition-colors bg-white rounded-full p-0.5"><XCircle size={14} /></button>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="mb-4">
                    <button 
                      onClick={() => setIsCropModalOpen(true)} 
                      className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <Plus size={16} /> 추가할 작물 선택하기
                    </button>
                  </div>
                </div>

                {/* Hardware & Network */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-md font-semibold text-primary mb-4 flex items-center gap-2 border-b pb-2"><Wifi size={18}/> Wi-Fi Configuration</h4>
                    <p className="text-xs text-gray-500 mb-3">Arduino 및 Raspberry Pi 기기들이 접속할 네트워크 정보입니다.</p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">SSID (Network Name)</label>
                        <input 
                          type="text" 
                          value={wifiConfig.ssid} 
                          onChange={e => setWifiConfig({...wifiConfig, ssid: e.target.value})}
                          placeholder="My WiFi Network"
                          className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-secondary/50 outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                        <input 
                          type="password" 
                          value={wifiConfig.password} 
                          onChange={e => setWifiConfig({...wifiConfig, password: e.target.value})}
                          placeholder="••••••••"
                          className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-secondary/50 outline-none text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-semibold text-primary mb-4 flex items-center gap-2 border-b pb-2"><Cpu size={18}/> Sensor & Equipment Availability</h4>
                    <p className="text-xs text-gray-500 mb-3">이 시설에 설치된 센서와 장비만 체크하세요.</p>
                    <div className="grid grid-cols-2 gap-4 max-h-[200px] overflow-y-auto pr-2">
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Sensors</div>
                        {DEFAULT_SENSORS.map(s => (
                          <label key={s.id} className="flex items-center gap-2 cursor-pointer group">
                            <input type="checkbox" checked={activeSensors[s.id] !== false} onChange={() => setActiveSensors({...activeSensors, [s.id]: !activeSensors[s.id]})} className="accent-secondary w-4 h-4" />
                            <span className="text-sm text-gray-600 group-hover:text-gray-900 truncate">{s.label}</span>
                          </label>
                        ))}
                        {customSensors.map(s => (
                          <label key={s.id} className="flex items-center gap-2 cursor-pointer group">
                            <input type="checkbox" checked={activeSensors[s.id] !== false} onChange={() => setActiveSensors({...activeSensors, [s.id]: !activeSensors[s.id]})} className="accent-secondary w-4 h-4" />
                            <span className="text-sm text-info group-hover:text-info-dark truncate flex items-center gap-1">{s.name} <span className="text-[10px] bg-info/10 text-info px-1 rounded">Custom</span></span>
                          </label>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Equipment</div>
                        {DEFAULT_EQUIPMENT.map(e => (
                          <label key={e.id} className="flex items-center gap-2 cursor-pointer group">
                            <input type="checkbox" checked={activeEquipment[e.id] !== false} onChange={() => setActiveEquipment({...activeEquipment, [e.id]: !activeEquipment[e.id]})} className="accent-secondary w-4 h-4" />
                            <span className="text-sm text-gray-600 group-hover:text-gray-900 truncate">{e.label}</span>
                          </label>
                        ))}
                        {customEquipments.map(e => (
                          <label key={e.id} className="flex items-center gap-2 cursor-pointer group">
                            <input type="checkbox" checked={activeEquipment[e.id] !== false} onChange={() => setActiveEquipment({...activeEquipment, [e.id]: !activeEquipment[e.id]})} className="accent-secondary w-4 h-4" />
                            <span className="text-sm text-info group-hover:text-info-dark truncate flex items-center gap-1">{e.name} <span className="text-[10px] bg-info/10 text-info px-1 rounded">Custom</span></span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
              
              <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 sticky bottom-0">
                <button 
                  onClick={() => setIsEditing(null)}
                  className="px-5 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                >
                  취소
                </button>
                <button 
                  onClick={handleSave}
                  className="flex items-center gap-2 px-6 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark transition-colors font-medium shadow-md shadow-secondary/20"
                >
                  <Save size={18} /> 설정 저장
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <CropIconPickerModal 
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        onSelect={handleAddCrop}
      />
    </div>
  );
}
