import React, { Suspense } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import DashboardClient from './DashboardClient';

/**
 * 대시보드 페이지 (서버 컴포넌트)
 *
 * 이 컴포넌트는 페이지의 기본 레이아웃을 설정하고,
 * 클라이언트 측 로직을 포함하는 <DashboardClient /> 컴포넌트를 <Suspense>로 감싸서 렌더링합니다.
 * 이렇게 하면 useSearchParams와 같은 클라이언트 훅을 사용하는 컴포넌트가 로드되는 동안
 * fallback UI를 보여줄 수 있어 빌드 에러를 방지하고 사용자 경험을 향상시킵니다.
 */
export default function DashboardPage() {
  return (
    <MainLayout>
      <Suspense fallback={<div className="flex h-full w-full items-center justify-center p-10 text-center text-gray-500">대시보드 데이터를 불러오는 중입니다...</div>}>
        <DashboardClient />
      </Suspense>
    </MainLayout>
  );
}