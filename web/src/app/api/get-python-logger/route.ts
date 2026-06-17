import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    // process.cwd()는 Next.js 프로젝트의 루트 디렉토리 (즉, /web)를 가리킵니다.
    // 거기서 상위 폴더로 이동한 뒤 raspberry 폴더로 접근합니다.
    const filePath = path.join(process.cwd(), '..', 'raspberry', 'data-logger.py');
    const pythonCode = await fs.readFile(filePath, 'utf-8');

    return NextResponse.json({ code: pythonCode });
  } catch (error: any) {
    console.error('[Python Logger Read Error]:', error);
    return NextResponse.json(
      { error: 'Failed to read data-logger.py file from the server.' },
      { status: 500 }
    );
  }
}