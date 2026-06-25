import re

with open('src/app/dashboard/DashboardClient.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Fix the duplicate block
c = c.replace("""                      ) : (
                        <div className="mt-4 bg-success/20 border border-success/45 text-white rounded-lg p-2.5 text-xs flex items-center gap-2">
                          <i className="mdi mdi-check-circle text-base text-success"></i>
                          <span className="font-semibold text-white/95">Weather conditions are safe. Normal operation.</span>
                        </div>
                      ) : (
                        <div className="mt-4 bg-success/20 border border-success/45 text-white rounded-lg p-2.5 text-xs flex items-center gap-2">
                          <i className="mdi mdi-check-circle text-base text-success"></i>
                          <span className="font-semibold text-white/95">Weather conditions are safe. Normal operation.</span>
                        </div>
                      )""", """                      ) : (
                        <div className="mt-4 bg-success/20 border border-success/45 text-white rounded-lg p-2.5 text-xs flex items-center gap-2">
                          <i className="mdi mdi-check-circle text-base text-success"></i>
                          <span className="font-semibold text-white/95">Weather conditions are safe. Normal operation.</span>
                        </div>
                      )""")

# Remove the MQTT Topic header
c = re.sub(r'                        <th className="p-4 font-semibold w-\[20%\]\">MQTT Topic</th>\n', '', c)

with open('src/app/dashboard/DashboardClient.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print('Done.')
