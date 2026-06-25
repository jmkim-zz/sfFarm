with open('src/app/dashboard/DashboardClient.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

bad_block = """                  <button 
                    onClick={handleConnectWifi}
                    className="w-full bg-secondary hover:bg-secondary/90 text-white py-2 rounded-lg font-medium transition-all text-sm"
                  >
                    Connect to {selectedWifiSsid}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}"""

c = c.replace(bad_block, '')
c = c.replace("import FacilitiesSettings from '@/components/settings/FacilitiesSettings';\nimport FacilitiesSettings from '@/components/settings/FacilitiesSettings';", "import FacilitiesSettings from '@/components/settings/FacilitiesSettings';")

with open('src/app/dashboard/DashboardClient.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print('Cleaned up bad block.')
