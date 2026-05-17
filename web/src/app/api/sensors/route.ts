// src/app/api/sensors/route.ts
import { NextResponse } from 'next/server';

// GET: 전체 센서 목록 및 현재 상태 조회
export async function GET() {
  // TODO: 데이터베이스(Supabase)에서 전체 센서 노드 목록을 불러오는 로직 구현
  return NextResponse.json({ status: 'success', data: [] });
}

// POST: 시스템에 새로운 센서 노드 등록
export async function POST() {
  // TODO: 새로운 센서의 MAC 주소나 초기 설정값을 DB에 저장하는 로직 구현
  return NextResponse.json({ status: 'created' });
}