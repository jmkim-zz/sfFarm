import React, { Suspense } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-[100dvh] w-full overflow-hidden bg-primary text-[#333] font-sans">
      {/* Material Design Icons CDN - using style import to ensure Next.js loads it properly */}
      <style dangerouslySetInnerHTML={{ __html: `@import url('https://cdn.jsdelivr.net/npm/@mdi/font@7.2.96/css/materialdesignicons.min.css');` }} />

      {/* Sidebar (Fixed Underneath) */}
      <div className="absolute top-0 left-0 w-[250px] h-[100dvh] z-0 bg-primary">
        <Suspense fallback={<div className="h-[100dvh] w-[250px]"></div>}>
          <Sidebar />
        </Suspense>
      </div>
      
      {/* Scrollable Overlay Layer */}
      <div className="absolute inset-0 z-10 flex overflow-x-auto lg:overflow-x-hidden snap-x snap-mandatory lg:snap-none pointer-events-none">
        
        {/* Transparent Spacer (Reveals sidebar underneath, passes clicks to sidebar) */}
        <div className="w-[250px] shrink-0 h-full snap-start lg:snap-none"></div>
        
        {/* Main Content (Responsive: Mobile 100vw, Desktop flex-1, restores touch events) */}
        <div className="w-[100vw] lg:w-auto shrink-0 lg:flex-1 flex flex-col h-[100dvh] bg-[#f5f7fa] relative shadow-[-15px_0_30px_-5px_rgba(0,0,0,0.3)] lg:shadow-none snap-start lg:snap-none pointer-events-auto">
          <Header />
          <main className="flex-1 p-4 lg:p-6 overflow-y-auto overflow-x-hidden">{children}</main>
        </div>
      </div>
    </div>
  );
}