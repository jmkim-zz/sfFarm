import re

with open('src/app/dashboard/DashboardClient.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Export SENSORS_METADATA
c = c.replace('const SENSORS_METADATA: Record', 'export const SENSORS_METADATA: Record')

# 2. Import FacilityOverviewCard
import_stmt = "import FacilityOverviewCard from '../../components/dashboard/FacilityOverviewCard';\n"
if 'FacilityOverviewCard' not in c:
    c = c.replace("import FacilitiesSettings from '../../components/settings/FacilitiesSettings';", 
                  "import FacilitiesSettings from '../../components/settings/FacilitiesSettings';\n" + import_stmt)

# 3. Replace the Home tab rendering
# We need to find the start of the System Connection card inside currentTab === 'home'
start_tag = '            {/* Connection Information */}'
start_idx = c.find(start_tag)

# and find the end of Active Actuators Grid
end_tag = '          </div>\n        )}'
end_idx = c.find(end_tag, start_idx)

if start_idx != -1 and end_idx != -1:
    replacement = """
            {facilities.map(facility => (
              <FacilityOverviewCard 
                key={facility.device_id}
                deviceId={facility.device_id}
                facilityName={facility.description || facility.device_id}
                showNotification={showNotification}
                SENSORS_METADATA={SENSORS_METADATA}
              />
            ))}
"""
    c = c[:start_idx] + replacement + c[end_idx:]

with open('src/app/dashboard/DashboardClient.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print('Updated DashboardClient for FacilityOverviewCard')
