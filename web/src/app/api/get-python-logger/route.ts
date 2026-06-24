import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const intervalMapStr = searchParams.get('intervalMap') || '{}';
    
    let intervalMap = {};
    try {
      intervalMap = JSON.parse(intervalMapStr);
    } catch(e) {
      console.error('[Python Logger] Invalid intervalMap parameter');
    }

    // process.cwd()는 Next.js 프로젝트의 루트 디렉토리 (즉, /web)를 가리킵니다.
    // 거기서 상위 폴더로 이동한 뒤 raspberry 폴더로 접근합니다.
    const filePath = path.join(process.cwd(), '..', 'raspberry', 'data-logger.py');
    let pythonCode = await fs.readFile(filePath, 'utf-8');

    // 토픽별 개별 전송 주기(intervalMap) 값을 스크립트 상단에 주입/치환
    pythonCode = pythonCode.replace(
      'TOPIC_SYNC_INTERVALS = {} # Injected by Web UI',
      `TOPIC_SYNC_INTERVALS = ${JSON.stringify(intervalMap)} # Injected from Dashboard UI`
    );

    return NextResponse.json({ code: pythonCode });
  } catch (error: any) {
    console.error('[Python Logger Read Error]:', error);
    return NextResponse.json(
      { error: 'Failed to read data-logger.py file from the server.' },
      { status: 500 }
    );
  }
}