// src/app/api/actuators/route.ts
import { NextResponse } from 'next/server';

// 파라미터(request: Request)를 삭제하여 엄격한 검사를 통과시킵니다.
export async function GET() {
  return NextResponse.json({ status: 'success', data: [] });
}

export async function POST() {
  return NextResponse.json({ status: 'success' });
}