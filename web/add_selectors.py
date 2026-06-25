import re

with open('src/app/dashboard/DashboardClient.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

facility_selector = '''
            {/* Facility Selector */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 hide-scrollbar">
              {facilities.map(f => {
                const isSelected = (currentDeviceId === f.device_id) || (!currentDeviceId && f === facilities[0]);
                return (
                  <button 
                    key={f.device_id}
                    onClick={() => router.push(`?tab=${currentTab}&deviceId=${f.device_id}`)}
                    className={`px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap border flex items-center gap-2 ${
                      isSelected 
                        ? 'bg-secondary text-white border-secondary shadow-md' 
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    {f.description || f.device_id}
                    {isSelected && <span className="w-2 h-2 rounded-full bg-white ml-1"></span>}
                  </button>
                )
              })}
            </div>
'''

tabs = ['sensors', 'equipment', 'arduino', 'raspberry']

for tab in tabs:
    # Need to find where the tab content starts
    # e.g., {currentTab === 'sensors' && ( \n <div>
    
    # We will use regex to find {currentTab === 'TAB' && (\n <div className="..."> or <div>
    pattern = r"(\{currentTab === '" + tab + r"' && \(\s*<div[^>]*>)"
    
    def replacer(match):
        return match.group(1) + facility_selector

    c = re.sub(pattern, replacer, c)

# Rename "Sensor Monitoring" to "Sensor Settings" inside the Sensors tab header
c = c.replace('<h2 className="text-2xl font-semibold text-primary">Sensor Monitoring</h2>', '<h2 className="text-2xl font-semibold text-primary">Sensor Settings</h2>')

with open('src/app/dashboard/DashboardClient.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print('Added facility selectors and renamed Sensor Monitoring')
