import re
with open('src/app/dashboard/DashboardClient.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Replace currentDeviceId with resolvedDeviceId
c = c.replace(
    "const selectedFacility = facilities.find(f => f.device_id === currentDeviceId) || facilities[0];",
    "const selectedFacility = facilities.find(f => f.device_id === currentDeviceId) || facilities[0];\n  const resolvedDeviceId = selectedFacility?.device_id;"
)

# Replace useEquipmentControl call
c = c.replace(
    "useEquipmentControl(currentDeviceId, showNotification);",
    "useEquipmentControl(resolvedDeviceId, showNotification);"
)

# Replace useSystemSettings call
c = c.replace(
    "useSystemSettings(currentDeviceId);",
    "useSystemSettings(resolvedDeviceId);"
)

with open('src/app/dashboard/DashboardClient.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
