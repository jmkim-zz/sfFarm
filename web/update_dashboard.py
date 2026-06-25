with open('src/app/dashboard/DashboardClient.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Move fetchFacilities out of useEffect
old_fetch = """  const [facilities, setFacilities] = useState<any[]>([]);
  useEffect(() => {
    const fetchFacilities = async () => {
      const { data } = await supabase.from('device_configs').select('*').order('device_id', { ascending: true });
      if (data) setFacilities(data);
    };
    fetchFacilities();

    // Subscribe to changes in device_configs so facilities list updates immediately
    const channel = supabase.channel('realtime-device-configs-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'device_configs' }, () => {
        fetchFacilities();
      }).subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, []);"""

new_fetch = """  const [facilities, setFacilities] = useState<any[]>([]);
  
  const fetchFacilities = async () => {
    const { data } = await supabase.from('device_configs').select('*').order('device_id', { ascending: true });
    if (data) setFacilities(data);
  };

  useEffect(() => {
    fetchFacilities();

    // Subscribe to changes in device_configs so facilities list updates immediately
    const channel = supabase.channel('realtime-device-configs-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'device_configs' }, () => {
        fetchFacilities();
      }).subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, []);"""

c = c.replace(old_fetch, new_fetch)

# Pass to FacilitiesSettings
c = c.replace(
    "<FacilitiesSettings showNotification={showNotification} />",
    "<FacilitiesSettings showNotification={showNotification} onFacilitiesChange={fetchFacilities} />"
)

with open('src/app/dashboard/DashboardClient.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print('Updated DashboardClient')
