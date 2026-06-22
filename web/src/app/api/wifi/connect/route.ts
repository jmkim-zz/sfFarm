import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import { createServerSupabaseClient } from '../../../../lib/supabase/server';

const execFilePromise = promisify(execFile);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ssid, password } = body;

    if (!ssid) {
      return NextResponse.json({ success: false, error: 'SSID is required.' }, { status: 400 });
    }

    const isWindows = os.platform() === 'win32';

    if (isWindows) {
      // Windows: 개발/테스트용 Mock 동작
      // WPA2 최소 규격 상 비밀번호는 8자 이상이어야 함 (보안 없음/Open 제외)
      if (password && password.length < 8) {
        return NextResponse.json({ 
          success: false, 
          error: 'Connection failed: Password must be at least 8 characters for WPA2 security.' 
        }, { status: 400 });
      }
      
      // DB 설정 동기화
      await updateDbWifiConfig(ssid, password || '');

      return NextResponse.json({ 
        success: true, 
        message: `Successfully connected to ${ssid} (Simulated)`,
        isMock: true 
      });
    } else {
      // Linux/Raspberry Pi: nmcli dev wifi connect <ssid> password <password>
      // execFile을 사용하여 쉘 메타문자 인젝션을 완벽히 방지함
      const args = ['dev', 'wifi', 'connect', ssid];
      if (password) {
        args.push('password', password);
      }

      try {
        // 15초 타임아웃 설정 (Wi-Fi 연결 시도 대기 시간)
        const { stdout } = await execFilePromise('nmcli', args, { timeout: 15000 });
        console.log('nmcli connect success:', stdout);

        // DB 설정 동기화
        await updateDbWifiConfig(ssid, password || '');

        return NextResponse.json({ 
          success: true, 
          message: `Successfully connected to ${ssid}.` 
        });
      } catch (execError: any) {
        console.error('nmcli connect execution error:', execError);
        return NextResponse.json({ 
          success: false, 
          error: `Failed to connect to ${ssid}. Error: ${execError.stderr || execError.message}` 
        }, { status: 500 });
      }
    }
  } catch (error: any) {
    console.error('Wi-Fi connect handler exception:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'An unexpected error occurred during Wi-Fi connection.' 
    }, { status: 500 });
  }
}

// Supabase DB의 app_settings 테이블에 Wi-Fi 접속 정보 동기화
async function updateDbWifiConfig(ssid: string, pass: string) {
  try {
    const supabase = createServerSupabaseClient();
    
    // 1. 기존 네트워크/MQTT 설정을 먼저 조회
    const { data: existingData, error: fetchError } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'sf_network_mqtt')
      .single();

    let updatedValue = {
      wifiSsid: ssid,
      wifiPassword: pass,
      mqttServer: '',
      mqttUsername: '',
      mqttPassword: ''
    };

    if (!fetchError && existingData?.value) {
      updatedValue = {
        ...existingData.value,
        wifiSsid: ssid,
        wifiPassword: pass
      };
    }

    // 2. 새로운 와이파이 접속 정보 업서트(Upsert)
    const { error: upsertError } = await supabase
      .from('app_settings')
      .upsert({
        key: 'sf_network_mqtt',
        value: updatedValue,
        updated_at: new Date().toISOString()
      });

    if (upsertError) {
      console.error('Supabase DB settings update failed:', upsertError);
    } else {
      console.log('Supabase DB settings successfully synchronized with new Wi-Fi credentials.');
    }
  } catch (dbError) {
    console.error('Exception during database sync:', dbError);
  }
}
