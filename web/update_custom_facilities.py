import re
with open('src/components/settings/FacilitiesSettings.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Add custom state
c = c.replace(
    "const [activeEquipment, setActiveEquipment] = useState<Record<string, boolean>>({});",
    "const [activeEquipment, setActiveEquipment] = useState<Record<string, boolean>>({});\n  const [customSensors, setCustomSensors] = useState<any[]>([]);\n  const [customEquipments, setCustomEquipments] = useState<any[]>([]);"
)

# 2. Update loadAppSettings
old_keys = """      const keys = [
        `sf_wifi_config_${deviceId}`,
        `sf_active_sensors_${deviceId}`,
        `sf_active_equipment_${deviceId}`
      ];"""
new_keys = """      const keys = [
        `sf_wifi_config_${deviceId}`,
        `sf_active_sensors_${deviceId}`,
        `sf_active_equipment_${deviceId}`,
        `sf_custom_sensors_${deviceId}`,
        `sf_custom_equipment_${deviceId}`
      ];"""
c = c.replace(old_keys, new_keys)

old_load_defaults = """      // Initialize defaults if missing
      DEFAULT_SENSORS.forEach(s => {
        if (sensors[s.id] === undefined) sensors[s.id] = true;
      });
      DEFAULT_EQUIPMENT.forEach(e => {
        if (equip[e.id] === undefined) equip[e.id] = true;
      });

      setWifiConfig(wifi);
      setActiveSensors(sensors);
      setActiveEquipment(equip);"""

new_load_defaults = """      // Custom devices
      let cSensors = data?.find(d => d.key === `sf_custom_sensors_${deviceId}`)?.value;
      let cEquip = data?.find(d => d.key === `sf_custom_equipment_${deviceId}`)?.value;
      
      if (!cSensors) {
          const saved = localStorage.getItem(`sf_custom_sensors_${deviceId}`);
          if (saved) cSensors = JSON.parse(saved);
      }
      if (!cEquip) {
          const saved = localStorage.getItem(`sf_custom_equipment_${deviceId}`);
          if (saved) cEquip = JSON.parse(saved);
      }
      const cSensorsList = cSensors || [];
      const cEquipList = cEquip || [];
      
      setCustomSensors(cSensorsList);
      setCustomEquipments(cEquipList);

      // Initialize defaults if missing
      DEFAULT_SENSORS.forEach(s => {
        if (sensors[s.id] === undefined) sensors[s.id] = true;
      });
      cSensorsList.forEach((s: any) => {
        if (sensors[s.id] === undefined) sensors[s.id] = true;
      });
      
      DEFAULT_EQUIPMENT.forEach(e => {
        if (equip[e.id] === undefined) equip[e.id] = true;
      });
      cEquipList.forEach((e: any) => {
        if (equip[e.id] === undefined) equip[e.id] = true;
      });

      setWifiConfig(wifi);
      setActiveSensors(sensors);
      setActiveEquipment(equip);"""
c = c.replace(old_load_defaults, new_load_defaults)

# 3. Handle Add New (reset custom state)
c = c.replace(
    "setWifiConfig({ ssid: '', password: '' });",
    "setWifiConfig({ ssid: '', password: '' });\n      setCustomSensors([]);\n      setCustomEquipments([]);"
)

# 4. Render Checkboxes
old_sensors_render = """                        {DEFAULT_SENSORS.map(s => (
                          <label key={s.id} className="flex items-center gap-2 cursor-pointer group">
                            <input type="checkbox" checked={activeSensors[s.id] !== false} onChange={() => setActiveSensors({...activeSensors, [s.id]: !activeSensors[s.id]})} className="accent-secondary w-4 h-4" />
                            <span className="text-sm text-gray-600 group-hover:text-gray-900 truncate">{s.label}</span>
                          </label>
                        ))}"""

new_sensors_render = """                        {DEFAULT_SENSORS.map(s => (
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
                        ))}"""

c = c.replace(old_sensors_render, new_sensors_render)

old_equip_render = """                        {DEFAULT_EQUIPMENT.map(e => (
                          <label key={e.id} className="flex items-center gap-2 cursor-pointer group">
                            <input type="checkbox" checked={activeEquipment[e.id] !== false} onChange={() => setActiveEquipment({...activeEquipment, [e.id]: !activeEquipment[e.id]})} className="accent-secondary w-4 h-4" />
                            <span className="text-sm text-gray-600 group-hover:text-gray-900 truncate">{e.label}</span>
                          </label>
                        ))}"""

new_equip_render = """                        {DEFAULT_EQUIPMENT.map(e => (
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
                        ))}"""

c = c.replace(old_equip_render, new_equip_render)

with open('src/components/settings/FacilitiesSettings.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print('Updated FacilitiesSettings with custom sensors and equipments')
