// src/app/api/websocket/route.ts
import { NextResponse } from 'next/server';

// GET: 클라이언트에게 웹소켓(MQTT over WSS) 접속 정보를 제공
export async function GET() {
  // TODO: 환경 변수에서 HiveMQ 접속 URL 등을 읽어와 클라이언트에 전달하는 로직 구현
  return NextResponse.json({ 
    status: 'success', 
    message: 'WebSocket routing module is ready',
    // 추후 아래와 같이 설정 정보를 반환할 수 있습니다.
    // brokerUrl: process.env.NEXT_PUBLIC_MQTT_BROKER_URL
  });
}