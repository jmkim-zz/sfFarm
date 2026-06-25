import re

with open('src/app/dashboard/DashboardClient.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add currentDeviceId
content = re.sub(
    r"const currentTab = searchParams\.get\('tab'\) \|\| 'dashboard';",
    r"const currentTab = searchParams.get('tab') || 'dashboard';\n  const currentDeviceId = searchParams.get('deviceId');",
    content
)

# 2. Scoped keys in useEffects and handle saves
def scope_key(match):
    return match.group(0).replace("'sf_hardware_pins'", "`sf_hardware_pins_${currentDeviceId}`").replace("'sf_network_mqtt'", "`sf_network_mqtt_${currentDeviceId}`").replace("'sf_edge_logger_config'", "`sf_edge_logger_config_${currentDeviceId}`").replace("'sf_logger_status'", "`sf_logger_status_${currentDeviceId}`")

content = re.sub(r"'(sf_hardware_pins|sf_network_mqtt|sf_edge_logger_config|sf_logger_status)'", scope_key, content)
content = re.sub(r"localStorage\.getItem\(`(.*?)`\)", r"localStorage.getItem(`\1`)", content)
content = re.sub(r"localStorage\.setItem\(`(.*?)`", r"localStorage.setItem(`\1`", content)

# 3. Add currentDeviceId to dependencies
content = re.sub(r"\}, \[\]\); // Hardware Pin Configuration", r"}, [currentDeviceId]); // Hardware Pin Configuration", content)
content = re.sub(r"\}, \[\]\); // Network & MQTT Settings", r"}, [currentDeviceId]); // Network & MQTT Settings", content)
content = re.sub(r"\}, \[\]\); // Edge Logger Settings", r"}, [currentDeviceId]); // Edge Logger Settings", content)
content = re.sub(r"\}, \[\]\); // Sensor Configurations", r"}, [currentDeviceId]); // Sensor Configurations", content)
content = re.sub(r"if \(!currentDeviceId\) return;\n      ", r"", content) # clean if previously inserted
content = re.sub(
    r"const loadHardwareSettings = async \(\) => \{",
    r"if (!currentDeviceId) return;\n      const loadHardwareSettings = async () => {",
    content
)
content = re.sub(
    r"const handleSaveHardwareConfig = async \(\) => \{",
    r"const handleSaveHardwareConfig = async () => {\n    if (!currentDeviceId) return;",
    content
)
content = re.sub(
    r"const handleSaveNetworkConfig = async \(\) => \{",
    r"const handleSaveNetworkConfig = async () => {\n    if (!currentDeviceId) return;",
    content
)
content = re.sub(
    r"const handleSaveEdgeLoggerConfig = async \(\) => \{",
    r"const handleSaveEdgeLoggerConfig = async () => {\n    if (!currentDeviceId) return;",
    content
)

# 4. Remove pinMqttTopics
content = re.sub(r"const \[pinMqttTopics, setPinMqttTopics\].*?\}\);\n", "", content, flags=re.DOTALL)
content = re.sub(r"if \(parsed\.pinMqttTopics\).*?\n", "", content)
content = re.sub(r"// SCL/SDA 분리.*?setPinMqttTopics\(migratedTopics\);\n", "", content, flags=re.DOTALL)
content = re.sub(r", pinMqttTopics", "", content)
content = re.sub(r"setPinMqttTopics\(prev => \{.*?\n    \};\n", "", content, flags=re.DOTALL)
content = re.sub(r"topics: pinMqttTopics", "", content)
content = re.sub(r"const handlePinMqttTopicChange = .*?\}\n", "", content, flags=re.DOTALL)
content = re.sub(r"const activeMqttTopics = useMemo.*?\}, \[pinMqttTopics\]\);\n", "", content, flags=re.DOTALL)
content = re.sub(r"let commonTopicPrefix = .*?\}\n\s*\}\n\s*", "", content, flags=re.DOTALL)
content = re.sub(r"<th>MQTT Topic</th>\n", "", content)
content = re.sub(r"<td className=\"p-4 align-top\">\s*<div className=\"flex flex-col gap-1 w-full bg-gray-50/50 p-1\.5 rounded-lg border border-gray-100\">.*?</div>\s*</td>", "", content, flags=re.DOTALL)

# 5. Add facilityMqttTopic
content = re.sub(
    r"const \[dbSyncInterval, setDbSyncInterval\] = useState<Record<string, number>>\(\{\}\);",
    r"const [dbSyncInterval, setDbSyncInterval] = useState<Record<string, number>>({});\n  const [facilityMqttTopic, setFacilityMqttTopic] = useState<string>('');\n  const activeMqttTopics = facilityMqttTopic ? [facilityMqttTopic] : (currentDeviceId ? [`smartfarm/${currentDeviceId}/sensors`] : []);",
    content
)

content = re.sub(
    r"// Edge Logger Settings 로드",
    r"// Fetch Facility's MQTT Topic\n      const { data: facility } = await supabase.from('device_configs').select('mqtt_topic').eq('device_id', currentDeviceId).single();\n      if (facility?.mqtt_topic) setFacilityMqttTopic(facility.mqtt_topic);\n      else setFacilityMqttTopic('');\n\n      // Edge Logger Settings 로드",
    content
)

# 6. Fallback pin configs
content = re.sub(
    r"setPinConfigs\(\{\n.*?'TSL2591'\]\n\s*\}\);",
    r"setPinConfigs({\n          D2: [''], A0: [''], A1: [''],\n          D3: [''], D4: [''], D5: [''],\n          I2C: ['', '']\n        });",
    content, flags=re.DOTALL
)
content = re.sub(
    r"setPinMappings\(\{\n.*?\]\n\s*\}\);",
    r"setPinMappings({\n          D2: [['none']], A0: [['none']], A1: [['none']],\n          D3: [['none']], D4: [['none']], D5: [['none']],\n          I2C: [['none'], ['none']]\n        });",
    content, flags=re.DOTALL
)

# 7. Add MQTT UI panel
info_panel = r"""
                {/* 시스템 통신 규약 안내 (Read-Only) */}
                <div className="bg-gray-50 border border-info rounded-xl p-5 mb-6 shadow-sm">
                  <h4 className="text-md font-semibold text-info mb-3 flex items-center gap-2">
                    <Info size={18} /> System MQTT Protocol Guide
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Based on your facility settings, the AI code generator will automatically configure your hardware to use the following topics and JSON formats.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-white p-3 border border-gray-200 rounded-lg">
                      <span className="block text-xs font-bold text-gray-500 uppercase mb-1">Telemetry (Sensors)</span>
                      <code className="block text-sm text-primary font-mono mb-2">{facilityMqttTopic || `smartfarm/${currentDeviceId || 'pooh'}/sensors`}</code>
                      <span className="text-xs text-gray-500">JSON Payload: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">{`{"temp":25.1, "light":400, "soil_moisture":45}`}</code></span>
                    </div>
                    <div className="bg-white p-3 border border-gray-200 rounded-lg">
                      <span className="block text-xs font-bold text-gray-500 uppercase mb-1">Control (Actuators)</span>
                      <code className="block text-sm text-secondary font-mono mb-2">{(facilityMqttTopic || `smartfarm/${currentDeviceId || 'pooh'}/sensors`).replace('/sensors', '/control')}</code>
                      <span className="text-xs text-gray-500">JSON Payload: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">{`{"waterPump":"ON", "growLight":"OFF"}`}</code></span>
                    </div>
                  </div>
                </div>
"""
content = re.sub(
    r"(<h3 className=\"text-lg font-semibold text-primary\">Hardware Pin Configuration</h3>.*?</div>)",
    r"\1" + info_panel,
    content, flags=re.DOTALL
)

# 8. Inject MQTT topic into AI payload
payload_injection = r"""
      const { data: facility } = await supabase.from('device_configs').select('mqtt_topic').eq('device_id', currentDeviceId).single();
      const facilityMqttTopic = facility?.mqtt_topic || `smartfarm/${currentDeviceId}/sensors`;
      const controlMqttTopic = facilityMqttTopic.replace('/sensors', '/control');
      
      const payload = {
        board: selectedArduinoBoard,
        networkInfo: { wifiSsid, wifiPassword, mqttServer, mqttUsername, mqttPassword, facilityMqttTopic, controlMqttTopic },
"""
content = re.sub(
    r"const payload = \{\n\s*board: selectedArduinoBoard,\n\s*networkInfo: \{ wifiSsid, wifiPassword, mqttServer, mqttUsername, mqttPassword \},",
    payload_injection,
    content
)


with open('src/app/dashboard/DashboardClient.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("DashboardClient.tsx reconstructed successfully.")
