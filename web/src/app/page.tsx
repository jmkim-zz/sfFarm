import { redirect } from 'next/navigation';

export default function Home() {
  // 루트 경로 접속 시 대시보드 페이지로 자동 리다이렉트
  redirect('/dashboard');
}