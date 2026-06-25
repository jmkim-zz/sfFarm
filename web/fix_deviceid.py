with open('src/app/dashboard/DashboardClient.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('filter: `device_id=eq.${deviceId}`', 'filter: `device_id=eq.${currentDeviceId}`')
# wait, useSupabaseSensors actually has `deviceId` as argument, so it SHOULD be `deviceId` there.
# I need to ONLY fix it where the argument is `currentDeviceId`.
# Let's fix it by regex for useSupabaseSensors only, and restore others.

import re
# Restore all to currentDeviceId first
c = c.replace('filter: `device_id=eq.${deviceId}`', 'filter: `device_id=eq.${currentDeviceId}`')

# Now fix useSupabaseSensors specifically
def fix_hook(match):
    return match.group(0).replace('currentDeviceId', 'deviceId')

c = re.sub(r'function useSupabaseSensors.*?return sensors;', fix_hook, c, flags=re.DOTALL)

with open('src/app/dashboard/DashboardClient.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
