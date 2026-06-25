import sys

with open('src/app/dashboard/DashboardClient.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Add currentDeviceId
c = c.replace(
    "const currentTab = searchParams.get('tab') || 'dashboard';",
    "const currentTab = searchParams.get('tab') || 'dashboard';\n  const currentDeviceId = searchParams.get('deviceId');"
)

# 2. Add currentDeviceId dependencies
c = c.replace(
    "}, []); // Hardware Pin Configuration",
    "}, [currentDeviceId]); // Hardware Pin Configuration"
)
c = c.replace(
    "}, []); // Network & MQTT Settings",
    "}, [currentDeviceId]); // Network & MQTT Settings"
)
c = c.replace(
    "}, []); // Edge Logger Settings",
    "}, [currentDeviceId]); // Edge Logger Settings"
)
c = c.replace(
    "}, []); // Sensor Configurations",
    "}, [currentDeviceId]); // Sensor Configurations"
)

# 3. Add early returns and change keys
c = c.replace(
    "const loadHardwareSettings = async () => {",
    "if (!currentDeviceId) return;\n      const loadHardwareSettings = async () => {"
)
c = c.replace(
    "const handleSaveHardwareConfig = async () => {",
    "const handleSaveHardwareConfig = async () => {\n      if (!currentDeviceId) return;"
)
c = c.replace(
    "const handleSaveNetworkConfig = async () => {",
    "const handleSaveNetworkConfig = async () => {\n      if (!currentDeviceId) return;"
)
c = c.replace(
    "const handleSaveEdgeLoggerConfig = async () => {",
    "const handleSaveEdgeLoggerConfig = async () => {\n      if (!currentDeviceId) return;"
)
c = c.replace(
    "const handleToggleRemoteLogger = async (state: boolean) => {",
    "const handleToggleRemoteLogger = async (state: boolean) => {\n      if (!currentDeviceId) return;"
)

c = c.replace("'sf_hardware_pins'", "`sf_hardware_pins_${currentDeviceId}`")
c = c.replace("'sf_network_mqtt'", "`sf_network_mqtt_${currentDeviceId}`")
c = c.replace("'sf_edge_logger_config'", "`sf_edge_logger_config_${currentDeviceId}`")
c = c.replace("'sf_logger_status'", "`sf_logger_status_${currentDeviceId}`")
c = c.replace("localStorage.getItem(`", "localStorage.getItem(`") # Already string literal, wait, replacing ' with ` above did this.
# Let's fix the localStorage ones specifically:
c = c.replace("localStorage.getItem(`sf_hardware_pins_${currentDeviceId}`)", "localStorage.getItem(`sf_hardware_pins_${currentDeviceId}`)")
# It should be fine. The backticks are correct.

# 4. Remove pinMqttTopics
c = c.replace("""  const [pinMqttTopics, setPinMqttTopics] = useState<Record<string, string[][]>>({
    D2: [['smartfarm/uno-r4/sensors']],
    A0: [['smartfarm/uno-r4/sensors']],
    A1: [['smartfarm/uno-r4/sensors']],
    D3: [['smartfarm/uno-r4/control']],
    D4: [['smartfarm/uno-r4/control']],
    D5: [['smartfarm/uno-r4/control']],
    I2C: [['none'], ['smartfarm/uno-r4/sensors', 'smartfarm/uno-r4/sensors']]
  });""", "")
c = c.replace("if (parsed.pinMqttTopics) setPinMqttTopics(parsed.pinMqttTopics);", "")
c = c.replace("""        const oldTopics = migrateI2C(parsed.pinMqttTopics);
        if (oldTopics) {
          Object.entries(oldTopics).forEach(([k, v]) => { migratedTopics[k] = Array.isArray(v) ? v.map((item: any) => Array.isArray(item) ? item : [item]) : [['']]; });
        }""", "")
c = c.replace("if (migratedTopics && Object.keys(migratedTopics).length > 0) setPinMqttTopics(migratedTopics);", "")
c = c.replace("const hardwareData = { pinConfigs, pinMappings, pinMqttTopics, pinCounts };", "const hardwareData = { pinConfigs, pinMappings, pinCounts };")
c = c.replace("setPinMqttTopics(prev => { const next = [...(prev[pinId] || [])]; next.splice(index, 1); return { ...prev, [pinId]: next }; });", "")

c = c.replace("""      setPinMqttTopics(prev => {
        const current = prev[pinId] || [];
        const next = [...current];
        if (next.length > currentCount) next.splice(currentCount);
        else while (next.length < currentCount) next.push(['smartfarm/uno-r4/sensors']);
        return { ...prev, [pinId]: next };
      });""", "")

c = c.replace("""      setPinMqttTopics(prev => {
        const current = prev[pinId] || [];
        const next = [...current];
        next[index] = new Array(mappings.length).fill('smartfarm/uno-r4/sensors');
        return { ...prev, [pinId]: next };
      });""", "")

c = c.replace("""  const handlePinMqttTopicChange = (pinId: string, index: number, topicIndex: number, value: string) => {
    setPinMqttTopics(prev => {
      const current = prev[pinId] || [];
      const next = [...current];
      if (!next[index]) next[index] = [];
      next[index][topicIndex] = value;
      return { ...prev, [pinId]: next };
    });
  };""", "")

c = c.replace("""          topics: pinMqttTopics""", "")

c = c.replace("""  const activeMqttTopics = useMemo(() => {
    const topics = new Set<string>();
    Object.values(pinMqttTopics).forEach(group => {
      group.forEach(row => {
        row.forEach(topic => {
          if (topic && topic !== 'none') topics.add(topic);
        });
      });
    });
    return Array.from(topics);
  }, [pinMqttTopics]);""", "")

c = c.replace("""  let commonTopicPrefix = 'smartfarm/uno-r4';
  for (const pinId in pinMqttTopics) {
    const found = pinMqttTopics[pinId]?.flat().find(t => t && t.includes('/'));
    if (found) {
      const parts = found.split('/');
      if (parts.length >= 2) {
        commonTopicPrefix = parts.slice(0, 2).join('/');
        break;
      }
    }
  }""", "")

c = c.replace("""<th>MQTT Topic</th>""", "")
c = c.replace("""                              <td className="p-4 align-top">
                                <div className="flex flex-col gap-1 w-full bg-gray-50/50 p-1.5 rounded-lg border border-gray-100">
                                  {(pinMappings[pin.id]?.[i] || ['none']).map((mapping, tIdx) => (
                                    <input key={tIdx} type="text" placeholder={topicPlaceholder} value={pinMqttTopics[pin.id]?.[i]?.[tIdx] || ''} onChange={(e) => handlePinMqttTopicChange(pin.id, i, tIdx, e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary outline-none text-xs transition-all bg-white" />
                                  ))}
                                </div>
                              </td>""", "")

# 5. Add facilityMqttTopic
c = c.replace(
    "const [dbSyncInterval, setDbSyncInterval] = useState<Record<string, number>>({});",
    "const [dbSyncInterval, setDbSyncInterval] = useState<Record<string, number>>({});\n  const [facilityMqttTopic, setFacilityMqttTopic] = useState<string>('');\n  const activeMqttTopics = facilityMqttTopic ? [facilityMqttTopic] : (currentDeviceId ? [`smartfarm/${currentDeviceId}/sensors`] : []);"
)

c = c.replace(
    "// Edge Logger Settings 로드",
    "// Fetch Facility's MQTT Topic\n      const { data: facility } = await supabase.from('device_configs').select('mqtt_topic').eq('device_id', currentDeviceId).single();\n      if (facility?.mqtt_topic) setFacilityMqttTopic(facility.mqtt_topic);\n      else setFacilityMqttTopic('');\n\n      // Edge Logger Settings 로드"
)

# 6. Fallback pin configs
c = c.replace(
    """        setPinConfigs({
          D2: ['DHT11/22'], A0: ['Soil Moisture'], A1: ['LDR (Photoresistor)'], 
          D3: ['Relay (Active High)'], D4: ['Relay (Active High)'], D5: ['Relay (Active High)'],
          I2C: ['LCD 16x2 (I2C)', 'TSL2591']
        });
        setPinMappings({
          D2: [['temperature', 'humidity']], A0: [['soil_moisture']], A1: [['light']],
          D3: [['growLight']], D4: [['circulationFan']], D5: [['waterPump']],
          I2C: [['none'], ['Temperature', 'Humidity']]
        });""",
    """        setPinConfigs({
          D2: [''], A0: [''], A1: [''], 
          D3: [''], D4: [''], D5: [''],
          I2C: ['', '']
        });
        setPinMappings({
          D2: [['none']], A0: [['none']], A1: [['none']],
          D3: [['none']], D4: [['none']], D5: [['none']],
          I2C: [['none'], ['none']]
        });"""
)

# 7. Add MQTT UI panel
info_panel = """                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h3 className="text-lg font-semibold text-primary">Hardware Pin Configuration</h3>
                  <button onClick={handleSaveHardwareConfig} className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                    Save Config
                  </button>
                </div>

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
                      <span className="text-xs text-gray-500">JSON Payload: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">{"{\\"temp\\":25.1, \\"light\\":400, \\"soil_moisture\\":45}"}</code></span>
                    </div>
                    <div className="bg-white p-3 border border-gray-200 rounded-lg">
                      <span className="block text-xs font-bold text-gray-500 uppercase mb-1">Control (Actuators)</span>
                      <code className="block text-sm text-secondary font-mono mb-2">{(facilityMqttTopic || `smartfarm/${currentDeviceId || 'pooh'}/sensors`).replace('/sensors', '/control')}</code>
                      <span className="text-xs text-gray-500">JSON Payload: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">{"{\\"waterPump\\":\\"ON\\", \\"growLight\\":\\"OFF\\"}"}</code></span>
                    </div>
                  </div>
                </div>"""

c = c.replace(
    """                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h3 className="text-lg font-semibold text-primary">Hardware Pin Configuration</h3>
                  <button onClick={handleSaveHardwareConfig} className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                    Save Config
                  </button>
                </div>""",
    info_panel
)

# 8. Inject MQTT topic into AI payload
payload_injection = """      const { data: facility } = await supabase.from('device_configs').select('mqtt_topic').eq('device_id', currentDeviceId).single();
      const facilityMqttTopic = facility?.mqtt_topic || `smartfarm/${currentDeviceId}/sensors`;
      const controlMqttTopic = facilityMqttTopic.replace('/sensors', '/control');
      
      const payload = {
        board: selectedArduinoBoard,
        networkInfo: { wifiSsid, wifiPassword, mqttServer, mqttUsername, mqttPassword, facilityMqttTopic, controlMqttTopic },"""
        
c = c.replace(
    """      const payload = {
        board: selectedArduinoBoard,
        networkInfo: { wifiSsid, wifiPassword, mqttServer, mqttUsername, mqttPassword },""",
    payload_injection
)

# 9. Clean remaining unused variable
c = c.replace("const topicPlaceholder = commonTopicPrefix + '/<sensor_name>';", "")

with open('src/app/dashboard/DashboardClient.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print("DashboardClient.tsx reconstructed safely.")
