import re
with open('src/app/dashboard/DashboardClient.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Add facilities state and fetch logic
fetch_logic = """
  const [facilities, setFacilities] = useState<any[]>([]);
  useEffect(() => {
    const fetchFacilities = async () => {
      const { data } = await supabase.from('device_configs').select('*').order('device_id', { ascending: true });
      if (data) setFacilities(data);
    };
    fetchFacilities();
  }, []);

  const selectedFacility = facilities.find(f => f.device_id === currentDeviceId) || facilities[0];
  const selectedFacilityName = selectedFacility ? (selectedFacility.description || selectedFacility.device_id) : 'Facility';
"""

c = re.sub(r'(export default function DashboardClient\(\) \{.*?\n)(.*?const searchParams = useSearchParams\(\);)', r'\1\2' + fetch_logic, c, flags=re.DOTALL)

# 2. Update titles
c = c.replace('<h2 className="text-2xl font-extrabold text-gray-800">Sensor Monitoring</h2>', '<h2 className="text-2xl font-extrabold text-gray-800">{selectedFacilityName} Sensor Monitoring</h2>')
c = c.replace('<h2 className="text-2xl font-extrabold text-gray-800 mb-2">Equipment Control</h2>', '<h2 className="text-2xl font-extrabold text-gray-800 mb-2">{selectedFacilityName} Equipment Control</h2>')
c = c.replace('<h2 className="text-2xl font-extrabold text-gray-800">System Settings</h2>', '<h2 className="text-2xl font-extrabold text-gray-800">{selectedFacilityName} System Settings</h2>')
c = c.replace('<h2 className="text-2xl font-extrabold text-gray-800">Raspberry Pi Agent Setting</h2>', '<h2 className="text-2xl font-extrabold text-gray-800">{selectedFacilityName} Raspberry Pi Agent Setting</h2>')
c = c.replace('<h2 className="text-2xl font-extrabold text-gray-800">Arduino Hardware Setting</h2>', '<h2 className="text-2xl font-extrabold text-gray-800">{selectedFacilityName} Arduino Hardware Setting</h2>')

with open('src/app/dashboard/DashboardClient.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
print('Dynamic facility names added.')
