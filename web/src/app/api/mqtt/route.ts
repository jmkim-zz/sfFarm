// src/app/api/mqtt/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  // TODO: MQTT 브로커 연결 상태 조회 등의 로직 구현
  return NextResponse.json({ status: 'connected' });
}

export async function POST() {
  // TODO: MQTT Topic에 메시지 발행(Publish) 로직 구현
  return NextResponse.json({ status: 'message_sent' });
}