with open('src/app/dashboard/DashboardClient.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Add filter for fetchDashboardData
c = c.replace(
    ".order('created_at', { ascending: true });",
    ".eq('device_id', resolvedDeviceId)\n        .order('created_at', { ascending: true });"
)

# Fix realtime subscription filter
c = c.replace(
    "filter: `device_id=eq.${currentDeviceId}`",
    "filter: `device_id=eq.${resolvedDeviceId}`"
)

with open('src/app/dashboard/DashboardClient.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print('Updated dashboard query to use resolvedDeviceId')
