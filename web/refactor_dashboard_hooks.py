import re

file_path = 'src/app/dashboard/DashboardClient.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Update useSystemSettings to take deviceId
c = re.sub(r'function useSystemSettings\(\) \{', r'function useSystemSettings(deviceId: string | null) {', c)
c = c.replace("'sf_active_sensors'", "`sf_active_sensors_${deviceId}`")
c = c.replace("'sf_active_equipment'", "`sf_active_equipment_${deviceId}`")

# Also add deviceId to useSystemSettings useEffect deps
c = re.sub(r'(\n\s*};\n\s*loadSettings\(\);\n\s*}\),\s*)\[\](\);)', r'\1[deviceId]\2', c)

# 2. Update useEquipmentControl to take deviceId
c = re.sub(r'function useEquipmentControl\(showNotification: \(msg: string, type: NotificationType\) => void\) \{',
           r'function useEquipmentControl(deviceId: string | null, showNotification: (msg: string, type: NotificationType) => void) {', c)
c = c.replace("'sf_equipment_states'", "`sf_equipment_states_${deviceId}`")
# Also add deviceId to useEquipmentControl useEffect deps
# In useEquipmentControl, the useEffect is:
# useEffect(() => {
#    const loadEquipmentStates = async () => { ... }
#    loadEquipmentStates();
#  }, []);
# Wait, this is hard to target with regex. I will replace all '}, []);' manually in the hooks.

# 3. Update useSupabaseSensors to take deviceId
c = re.sub(r'function useSupabaseSensors\(\) \{', r'function useSupabaseSensors(deviceId: string | null) {', c)
c = re.sub(r"\.from\('dynamic_telemetry'\)\s*\n\s*\.select\('\*'\)", r".from('dynamic_telemetry')\n        .select('*')\n        .eq('device_id', deviceId)", c)
c = re.sub(r"\{ event: 'INSERT', schema: 'public', table: 'dynamic_telemetry' \}", r"{ event: 'INSERT', schema: 'public', table: 'dynamic_telemetry', filter: `device_id=eq.${deviceId}` }", c)

# 4. Update the component call sites
c = c.replace('const sensors = useSupabaseSensors();', 'const sensors = useSupabaseSensors(currentDeviceId);')
c = c.replace('const { equipment, customEquipmentStates, setCustomEquipmentStates, toggleEquipment, startAll, stopAll } = useEquipmentControl(showNotification);', 'const { equipment, customEquipmentStates, setCustomEquipmentStates, toggleEquipment, startAll, stopAll } = useEquipmentControl(currentDeviceId, showNotification);')
c = c.replace('const { activeSensors, activeEquipment, toggleSensor, toggleEquipmentSetting } = useSystemSettings();', 'const { activeSensors, activeEquipment, toggleSensor, toggleEquipmentSetting } = useSystemSettings(currentDeviceId);')

# 5. Fix remaining useEffect deps in DashboardClient for currentDeviceId
# For loadHardwareSettings, loadNetworkSettings, loadAllSensorConfigs, loadCustomEq, loadCustomSensors, loadAllEquipSchedules
c = re.sub(r'loadAllSensorConfigs\(\);\n\s*\}, \[customSensors\]\);', r'loadAllSensorConfigs();\n    }, [customSensors, currentDeviceId]);', c)
c = re.sub(r'loadCustomEq\(\);\n\s*\}, \[\]\);', r'loadCustomEq();\n    }, [currentDeviceId]);', c)
c = re.sub(r'loadCustomSensors\(\);\n\s*\}, \[\]\);', r'loadCustomSensors();\n    }, [currentDeviceId]);', c)
c = re.sub(r'loadAllEquipSchedules\(\);\n\s*\}, \[customEquipments\]\);', r'loadAllEquipSchedules();\n    }, [customEquipments, currentDeviceId]);', c)

# Also fix the `sf_custom_equipment`, `sf_custom_sensors`, `sf_sensor_config_...`, `sf_equip_schedule_...` keys to be device specific
c = re.sub(r"'sf_custom_equipment'", r"`sf_custom_equipment_${currentDeviceId}`", c)
c = re.sub(r"'sf_custom_sensors'", r"`sf_custom_sensors_${currentDeviceId}`", c)
c = re.sub(r"key: `sf_sensor_config_\$\{", r"key: `sf_sensor_config_${currentDeviceId}_${", c)
c = re.sub(r"key = `sf_sensor_config_\$\{", r"key = `sf_sensor_config_${currentDeviceId}_${", c)
c = re.sub(r"key: `sf_equip_schedule_\$\{", r"key: `sf_equip_schedule_${currentDeviceId}_${", c)
c = re.sub(r"key = `sf_equip_schedule_\$\{", r"key = `sf_equip_schedule_${currentDeviceId}_${", c)


with open('src/app/dashboard/DashboardClient.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print('Hooks and keys updated successfully.')
