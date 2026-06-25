import re

with open('src/app/dashboard/DashboardClient.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Add import
import_statement = "import FacilitiesSettings from '@/components/settings/FacilitiesSettings';\n"
if 'import FacilitiesSettings' not in c:
    c = c.replace('import { ResponsiveContainer', import_statement + 'import { ResponsiveContainer')

# Add rendering block before 'settings' tab
tab_block = """
        {/* Facilities Setting Tab */}
        {currentTab === 'facilities' && (
          <div className="animate-[fadeIn_0.5s_ease-in-out]">
            <FacilitiesSettings showNotification={showNotification} />
          </div>
        )}
"""
if "currentTab === 'facilities'" not in c:
    c = c.replace('        {/* System Settings Tab */}', tab_block + '        {/* System Settings Tab */}')

with open('src/app/dashboard/DashboardClient.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print('Facilities tab integration complete.')
