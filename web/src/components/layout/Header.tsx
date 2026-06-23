import React from 'react';
import { Bot } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-white text-primary flex justify-between items-center px-8 h-[70px] shadow-[0_2px_10px_rgba(0,0,0,0.08)] z-50 sticky top-0">
      <div className="flex items-center gap-2.5">
        <Bot size={28} className="text-primary" />
        <h1 className="text-xl font-semibold">Smart Farm Control Center</h1>
      </div>
      <div className="flex items-center gap-5">
        {/* Connection status moved to Home screen */}
      </div>
    </header>
  );
}