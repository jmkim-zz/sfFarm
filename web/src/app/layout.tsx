import '../styles/globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '스마트팜 대시보드 (SmartFarm Dashboard)',
  description: 'MQTT 및 Supabase 기반 실시간 IoT 관제 시스템',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}