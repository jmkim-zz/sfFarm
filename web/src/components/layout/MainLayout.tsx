import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#f5f7fa] text-[#333] font-sans">
      {/* Material Design Icons CDN - using style import to ensure Next.js loads it properly */}
      <style dangerouslySetInnerHTML={{ __html: `@import url('https://cdn.jsdelivr.net/npm/@mdi/font@7.2.96/css/materialdesignicons.min.css');` }} />

      {/* Sidebar fixed to the left */}
      <Sidebar />
      
      {/* Main Content wrapper pushed to the right by sidebar width (250px) */}
      <div className="flex-1 flex flex-col ml-[250px]">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}