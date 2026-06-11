import React from 'react';
import dynamic from 'next/dynamic';
import MainLayout from '../../components/layout/MainLayout';

/**
 * 대시보드 페이지 (서버 컴포넌트)
 */

const DashboardClient = dynamic(() => import('./DashboardClient'), {
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center p-10 text-center text-gray-500">대시보드 데이터를 불러오는 중입니다...</div>
});

export default function DashboardPage() {
  return (
    <MainLayout>
      <DashboardClient />
    </MainLayout>
  );
}