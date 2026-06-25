'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tractor, Gauge, Cpu, Settings2, Wrench, FileText, Settings, Users, Server, CircuitBoard, Home, ChevronDown, PlusCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Crop Icons Mapping (Exported for use in Facilities Setting page)
export const CROP_ICONS: Record<string, string> = {
  '오이': '🥒', '토마토': '🍅', '고추': '🌶️', '파프리카': '🫑', '딸기': '🍓', 
  '방울토마토': '🍒', '엽채류': '🥬', '상추': '🥗', '멜론': '🍈', '블루베리': '🫐'
};

export default function Sidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'home';
  const currentDeviceId = searchParams.get('deviceId');
  
  const [session, setSession] = useState<any>(null);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchFacilities = async () => {
      const { data, error } = await supabase.from('device_configs').select('*').order('device_id', { ascending: true });
      if (data && !error) {
        setFacilities(data);
      }
    };
    fetchFacilities();
    
    // Subscribe to changes in device_configs
    const channel = supabase.channel('realtime-device-configs-sidebar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'device_configs' }, () => {
        fetchFacilities();
      }).subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, []);

  const selectedFacility = facilities.find(f => f.device_id === currentDeviceId) || facilities[0];

  const handleFacilityChange = (deviceId: string) => {
    setIsDropdownOpen(false);
    router.push(`?tab=${currentTab}&deviceId=${deviceId}`);
  };

  const navSections = [
    { title: 'Home', items: [{ id: 'home', label: 'Home', icon: Home }] },
    { title: 'Monitoring', items: [
      { id: 'dashboard', label: 'Dashboard', icon: Gauge },
    ]},
    { title: 'Maintenance', items: [
      { id: 'reports', label: 'Farming Journal', icon: FileText },
      { id: 'maintenance', label: 'Maintenance Schedule', icon: Wrench },
    ]},
    { title: 'System', items: [
      { id: 'facilities', label: 'Facilities Setting', icon: Tractor },
      { id: 'settings', label: 'System Settings', icon: Settings },
      { id: 'sensors', label: 'Sensor Settings', icon: Cpu },
      { id: 'equipment', label: 'Equipment Control', icon: Settings2 },
      { id: 'arduino', label: 'Arduino Setting', icon: CircuitBoard },
      { id: 'raspberry', label: 'Raspberry Setting', icon: Server },
    ]},
    { title: 'Account', items: [
      { id: 'users', label: session ? 'Profile' : 'Log In', icon: Users },
    ]}
  ];

  return (
    <nav className="bg-primary text-white h-screen fixed w-[250px] overflow-y-auto flex flex-col pt-5 z-50">

      <div className="flex-1">
        {navSections.map((section, idx) => (
          <div key={idx} className="mb-6">
            <div className="px-5 pb-2.5 text-xs uppercase text-white/60 tracking-wider">
              {section.title}
            </div>
            <div className="flex flex-col">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                const urlDeviceId = currentDeviceId ? `&deviceId=${currentDeviceId}` : '';
                
                return (
                  <Link
                    href={`?tab=${item.id}`}
                    key={item.id}
                    className={`
                      flex items-center gap-3 px-5 py-3 transition-all duration-300 border-l-4
                      ${isActive 
                        ? 'bg-white/10 border-secondary text-white' 
                        : 'border-transparent text-gray-300 hover:bg-white/5 hover:text-white'
                      }
                    `}
                  >
                    <Icon size={20} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}