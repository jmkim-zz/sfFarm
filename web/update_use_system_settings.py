with open('src/app/dashboard/DashboardClient.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Update useSystemSettings definition
c = c.replace(
    "export function useSystemSettings(deviceId: string | null) {",
    "export function useSystemSettings(deviceId: string | null, updateTrigger: number = 0) {"
)
c = c.replace(
    "    }, [deviceId]);\n\n    const toggleSensor",
    "    }, [deviceId, updateTrigger]);\n\n    const toggleSensor"
)

# 2. Add trigger state in DashboardClient
c = c.replace(
    "  const [facilities, setFacilities] = useState<any[]>([]);\n  \n  const fetchFacilities = async () => {",
    "  const [facilities, setFacilities] = useState<any[]>([]);\n  const [settingsUpdateTrigger, setSettingsUpdateTrigger] = useState(0);\n  \n  const fetchFacilities = async () => {\n    setSettingsUpdateTrigger(prev => prev + 1);"
)

# 3. Pass trigger to useSystemSettings
c = c.replace(
    "  const { activeSensors, activeEquipment, toggleSensor, toggleEquipmentSetting } = useSystemSettings(resolvedDeviceId\n);",
    "  const { activeSensors, activeEquipment, toggleSensor, toggleEquipmentSetting } = useSystemSettings(resolvedDeviceId, settingsUpdateTrigger);"
)

with open('src/app/dashboard/DashboardClient.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print('Updated useSystemSettings trigger')
