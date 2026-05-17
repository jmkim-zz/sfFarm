// src/app/api/sensors/[id]/route.ts
import { NextResponse } from 'next/server';

// GET: 특정 센서의 상태 조회
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // request와 params를 모두 사용하여 Unused Variable 빌드 에러를 방지합니다.
  const url = request.url;
  const targetId = params.id;

  return NextResponse.json({ 
    status: 'success', 
    sensorId: targetId,
    requestedUrl: url
  });
}

// PUT: 특정 센서의 설정값 수정 (예: 측정 주기 변경)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const targetId = params.id;
  
  return NextResponse.json({ 
    status: 'updated', 
    sensorId: targetId 
  });
}