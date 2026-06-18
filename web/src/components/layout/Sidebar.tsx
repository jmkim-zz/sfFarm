'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Tractor, Gauge, Cpu, Settings2, Wrench, FileText, Settings, Users, Server, CircuitBoard, Home } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function Sidebar() {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';
  const [session, setSession] = React.useState<any>(null);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const navSections = [
    {
      title: 'Home',
      items: [
        { id: 'home', label: 'Home', icon: Home },
      ]
    },
    {
      title: 'Monitoring',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: Gauge },
        { id: 'sensors', label: 'Sensor Monitoring', icon: Cpu },
        { id: 'equipment', label: 'Equipment Control', icon: Settings2 },
      ]
    },
    {
      title: 'Maintenance',
      items: [
        { id: 'maintenance', label: 'Maintenance Schedule', icon: Wrench },
        { id: 'reports', label: 'Reports', icon: FileText },
      ]
    },
    {
      title: 'System',
      items: [
        { id: 'settings', label: 'System Settings', icon: Settings },
        { id: 'raspberry', label: 'Raspberry Setting', icon: Server },
        { id: 'arduino', label: 'Arduino Setting', icon: CircuitBoard },
      ]
    },
    {
      title: 'Account',
      items: [
        { id: 'users', label: session ? 'Profile' : 'Log In', icon: Users },
      ]
    }
  ];

  return (
    <nav className="bg-primary text-white h-screen fixed w-[250px] overflow-y-auto flex flex-col pt-5">
      <div className="px-5 pb-5 mb-5 border-b border-white/10 flex items-center gap-2.5">
        <Tractor className="text-secondary" size={24} />
        <h2 className="font-semibold text-lg">Pooh's Smart Farm</h2>
      </div>

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