import re

with open('src/app/dashboard/DashboardClient.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Export SENSOR_METADATA
c = c.replace('const SENSOR_METADATA: Record', 'export const SENSOR_METADATA: Record')

# 2. Import FacilityOverviewCard
import_stmt = "import FacilityOverviewCard from '../../components/dashboard/FacilityOverviewCard';\n"
if 'FacilityOverviewCard' not in c:
    c = c.replace("import FacilitiesSettings from '../../components/settings/FacilitiesSettings';", 
                  "import FacilitiesSettings from '../../components/settings/FacilitiesSettings';\n" + import_stmt)

# 3. Replace the Home tab rendering safely
start_tag = '            {/* Connection Information */}'
start_idx = c.find(start_tag)

end_tag = '        {/* System Settings Tab */}'
end_idx = c.find(end_tag, start_idx)

if start_idx != -1 and end_idx != -1:
    # Backtrack from end_tag to the closing brace of the home tab
    # The original was:
    #           </div>
    #         </div>
    #       )}
    #
    #       {/* System Settings Tab */}
    backtrack_idx = c.rfind(')}', start_idx, end_idx) + 2
    
    replacement = """
            {facilities.map(facility => (
              <FacilityOverviewCard 
                key={facility.device_id}
                deviceId={facility.device_id}
                facilityName={facility.description || facility.device_id}
                showNotification={showNotification}
                SENSOR_METADATA={SENSOR_METADATA}
              />
            ))}
          </div>
        )}
"""
    c = c[:start_idx] + replacement + '\n' + c[end_idx:]

# Also fix the duplicate currentTab and currentDeviceId declarations!
# We just ran `refactor_dashboard_hooks.py` and `fix_deviceid.py` which might have added duplicates again.
bad_str = '''
  const currentTab = searchParams.get('tab') || 'dashboard';
  const currentDeviceId = searchParams.get('deviceId');
'''
c = re.sub(r'\s*const currentTab = searchParams\.get\(\'tab\'\) \|\| \'dashboard\';\s*const currentDeviceId = searchParams\.get\(\'deviceId\'\);', '', c)

good_str = '''  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';
  const currentDeviceId = searchParams.get('deviceId');'''

c = c.replace('  const searchParams = useSearchParams();', good_str)

with open('src/app/dashboard/DashboardClient.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print('Safely Updated DashboardClient for FacilityOverviewCard')
