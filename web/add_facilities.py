with open('src/app/dashboard/DashboardClient.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Import FacilitiesSettings if not imported
if 'import FacilitiesSettings' not in c:
    c = c.replace("import { supabase } from '../../lib/supabase/client';", "import { supabase } from '../../lib/supabase/client';\nimport FacilitiesSettings from '../../components/settings/FacilitiesSettings';")

# Add currentTab === 'facilities' rendering block before {currentTab === 'raspberry'
facilities_tab = '''
      {currentTab === 'facilities' && (
        <div className="animate-[fadeIn_0.5s_ease-in-out]">
          <FacilitiesSettings showNotification={showNotification} />
        </div>
      )}
'''

c = c.replace("      {currentTab === 'raspberry' && (", facilities_tab + "      {currentTab === 'raspberry' && (")

with open('src/app/dashboard/DashboardClient.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print('Added FacilitiesSettings')
