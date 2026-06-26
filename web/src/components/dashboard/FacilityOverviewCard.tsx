import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useSupabaseSensors, useSystemSettings, useEquipmentControl } from '../../app/dashboard/DashboardClient';
import { CROP_ICONS } from '../layout/Sidebar';
import EmojiIcon from '../ui/EmojiIcon';

export default function FacilityOverviewCard({ deviceId, facilityName, showNotification, SENSOR_METADATA, crops = [] }: any) {
  const sensors = useSupabaseSensors(deviceId);
  const { activeSensors, activeEquipment } = useSystemSettings(deviceId);
  const { equipment, customEquipmentStates, setCustomEquipmentStates, toggleEquipment } = useEquipmentControl(deviceId, showNotification);

  const [wifiSsid, setWifiSsid] = useState('');
  const [mqttServer, setMqttServer] = useState('');
  const [remoteLoggerRunning, setRemoteLoggerRunning] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);

  const [customSensors, setCustomSensors] = useState<any[]>([]);
  const [customEquipments, setCustomEquipments] = useState<any[]>([]);
  const [sensorConfigs, setSensorConfigs] = useState<Record<string, any>>({});

  useEffect(() => {
    // Check DB Connection
    const checkDbConnection = async () => {
      try {
        const { error } = await supabase.from('device_configs').select('count', { count: 'exact', head: true });
        setDbConnected(!error);
      } catch (err) {
        setDbConnected(false);
      }
    };
    checkDbConnection();
    const interval = setInterval(checkDbConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      // Network
      const { data: net } = await supabase.from('app_settings').select('value').eq('key', `sf_network_mqtt_${deviceId}`).single();
      if (net?.value) {
        setWifiSsid(net.value.wifiSsid || '');
        setMqttServer(net.value.mqttServer || '');
      }

      // Logger
      const { data: logger } = await supabase.from('app_settings').select('value').eq('key', `sf_logger_status_${deviceId}`).single();
      if (logger?.value) setRemoteLoggerRunning(logger.value.running || false);

      // Custom Sensors
      const { data: cs } = await supabase.from('app_settings').select('value').eq('key', `sf_custom_sensors_${deviceId}`).single();
      if (cs?.value) setCustomSensors(cs.value);

      // Custom Equipments
      const { data: ce } = await supabase.from('app_settings').select('value').eq('key', `sf_custom_equipment_${deviceId}`).single();
      if (ce?.value) setCustomEquipments(ce.value);
    };
    loadData();
  }, [deviceId]);

  useEffect(() => {
    const loadConfigs = async () => {
      const keys = Object.keys(activeSensors)
        .filter(k => activeSensors[k])
        .map(k => `sf_sensor_config_${deviceId}_${SENSOR_METADATA[k]?.label.replace(/\s+/g, '_')}`);
      
      const customKeys = customSensors.map(s => `sf_sensor_config_${deviceId}_${s.name.replace(/\s+/g, '_')}`);
      const allKeys = [...keys, ...customKeys];

      if (allKeys.length === 0) return;
      const { data } = await supabase.from('app_settings').select('key, value').in('key', allKeys);
      
      const newConfigs: any = {};
      Object.keys(activeSensors).filter(k => activeSensors[k]).forEach(k => {
        const label = SENSOR_METADATA[k]?.label;
        const key = `sf_sensor_config_${deviceId}_${label.replace(/\s+/g, '_')}`;
        const dbItem = data?.find((d: any) => d.key === key);
        if (dbItem?.value) newConfigs[label] = dbItem.value;
      });

      customSensors.forEach(s => {
        const key = `sf_sensor_config_${deviceId}_${s.name.replace(/\s+/g, '_')}`;
        const dbItem = data?.find((d: any) => d.key === key);
        if (dbItem?.value) newConfigs[s.name] = dbItem.value;
      });

      setSensorConfigs(newConfigs);
    };
    loadConfigs();
  }, [deviceId, activeSensors, customSensors, SENSOR_METADATA]);

  return (
    <div className="mt-8 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
        {facilityName}
        {crops.length > 0 && (
          <span className="flex gap-1 text-2xl items-center ml-2">
            {crops.map((crop: any, idx: number) => {
              const icon = typeof crop === 'string' ? CROP_ICONS[crop] || '🌱' : crop.icon;
              return <span key={idx} title={typeof crop === 'string' ? crop : crop.name} className="flex items-center"><EmojiIcon emoji={icon} size={28} /></span>;
            })}
          </span>
        )}
      </h2>
      
      {/* Grid Layout: System connections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connection Information */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col justify-between space-y-4">
          <h3 className="text-lg font-bold text-primary flex items-center gap-2">
            <span className="w-1.5 h-4 bg-secondary rounded-full"></span>
            System Connection
          </h3>
          
          <div className="space-y-3.5">
            {/* WiFi SSID Card */}
            <div className="flex justify-between items-center p-3.5 bg-light rounded-xl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                  <i className="mdi mdi-wifi text-lg"></i>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Wi-Fi Network</span>
                  <span className="text-sm font-bold text-primary">{wifiSsid || 'Not configured'}</span>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${wifiSsid ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                {wifiSsid ? 'Wired' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Devices (Sensors and Actuators) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        
        {/* Active Sensors */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100">
          <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-primary rounded-full"></span>
            Active Sensors Grid
          </h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {Object.entries(SENSOR_METADATA).map(([key, meta]: any) => {
              if (activeSensors[key] === false) return null;
              
              const val = (sensors as any)[key];
              const config = sensorConfigs[meta.label];
              
              let statusColor = "bg-success/10 text-success border-success/20";
              let statusText = "Normal";
              let icon = "mdi-check-circle";

              if (config && val !== undefined) {
                if (config.lowerThreshold !== undefined && val < config.lowerThreshold) {
                  statusColor = "bg-warning/10 text-warning border-warning/20";
                  statusText = "Low";
                  icon = "mdi-alert-circle-outline";
                } else if (config.upperThreshold !== undefined && val > config.upperThreshold) {
                  statusColor = "bg-danger/10 text-danger border-danger/20";
                  statusText = "High";
                  icon = "mdi-alert-circle";
                }
              }

              return (
                <div key={key} className="flex flex-col items-center p-3 bg-[#f8fafc] rounded-xl border border-gray-100 transition-all hover:shadow-md group">
                  <i className={`mdi ${meta.icon} text-2xl text-gray-400 group-hover:text-primary transition-colors mb-1`}></i>
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1 text-center h-4">{meta.label}</span>
                  <span className="text-lg font-black text-gray-800 mb-2">
                    {val !== undefined ? `${val} ${meta.unit}` : '--'}
                  </span>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider w-full justify-center ${statusColor}`}>
                    <i className={`mdi ${icon}`}></i>
                    {statusText}
                  </div>
                </div>
              );
            })}

            {customSensors.map((cs: any) => {
              const val = (sensors as any)[cs.id];
              const config = sensorConfigs[cs.name];
              let statusColor = "bg-success/10 text-success border-success/20";
              let statusText = "Normal";
              let icon = "mdi-check-circle";

              if (config && val !== undefined) {
                if (config.lowerThreshold !== undefined && val < config.lowerThreshold) {
                  statusColor = "bg-warning/10 text-warning border-warning/20";
                  statusText = "Low";
                  icon = "mdi-alert-circle-outline";
                } else if (config.upperThreshold !== undefined && val > config.upperThreshold) {
                  statusColor = "bg-danger/10 text-danger border-danger/20";
                  statusText = "High";
                  icon = "mdi-alert-circle";
                }
              }

              return (
                <div key={cs.id} className="flex flex-col items-center p-3 bg-[#f8fafc] rounded-xl border border-gray-100 transition-all hover:shadow-md group relative">
                  <div className="absolute top-2 right-2 text-[8px] bg-secondary/10 text-secondary px-1.5 py-0.5 rounded font-bold uppercase">Custom</div>
                  <i className="mdi mdi-access-point text-2xl text-gray-400 group-hover:text-primary transition-colors mb-1"></i>
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1 text-center h-4">{cs.name}</span>
                  <span className="text-lg font-black text-gray-800 mb-2">
                    {val !== undefined ? `${val} ${cs.unit || ''}` : '--'}
                  </span>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider w-full justify-center ${statusColor}`}>
                    <i className={`mdi ${icon}`}></i>
                    {statusText}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Actuators Grid */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-secondary rounded-full"></span>
              Active Actuators Grid
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {Object.keys(equipment).map((key) => {
                if (activeEquipment[key] === false) return null;
                const eqKey = key as keyof typeof equipment;
                const isOn = equipment[eqKey];
                
                let eqName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                
                return (
                  <div key={key} className={`flex flex-col items-center p-3 rounded-xl border transition-all ${isOn ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-[#f8fafc] border-gray-100'}`}>
                    <div className="flex justify-between w-full items-start mb-2">
                      <i className={`mdi mdi-power-plug text-xl ${isOn ? 'text-primary' : 'text-gray-300'}`}></i>
                      <div className={`w-2 h-2 rounded-full ${isOn ? 'bg-success animate-pulse' : 'bg-gray-300'}`}></div>
                    </div>
                    <span className="text-[10px] font-bold text-gray-700 text-center mb-2 h-6 leading-tight">{eqName}</span>
                    <button 
                      onClick={() => toggleEquipment(eqKey, !isOn)}
                      className={`w-full py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${isOn ? 'bg-danger/10 text-danger hover:bg-danger/20' : 'bg-success/10 text-success hover:bg-success/20'}`}
                    >
                      {isOn ? 'Turn OFF' : 'Turn ON'}
                    </button>
                  </div>
                );
              })}
              
              {customEquipments.map((ce: any) => {
                const isOn = customEquipmentStates[ce.id];
                return (
                  <div key={ce.id} className={`flex flex-col items-center p-3 rounded-xl border transition-all relative ${isOn ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-[#f8fafc] border-gray-100'}`}>
                    <div className="absolute top-2 right-2 text-[8px] bg-secondary/10 text-secondary px-1.5 py-0.5 rounded font-bold uppercase z-10">Custom</div>
                    <div className="flex justify-between w-full items-start mb-2">
                      <i className={`mdi mdi-power-plug text-xl ${isOn ? 'text-primary' : 'text-gray-300'}`}></i>
                      <div className={`w-2 h-2 rounded-full ${isOn ? 'bg-success animate-pulse' : 'bg-gray-300'}`}></div>
                    </div>
                    <span className="text-[10px] font-bold text-gray-700 text-center mb-2 h-6 leading-tight truncate w-full">{ce.name}</span>
                    <button 
                      onClick={() => setCustomEquipmentStates(prev => ({ ...prev, [ce.id]: !prev[ce.id] }))}
                      className={`w-full py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${isOn ? 'bg-danger/10 text-danger hover:bg-danger/20' : 'bg-success/10 text-success hover:bg-success/20'}`}
                    >
                      {isOn ? 'Turn OFF' : 'Turn ON'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
