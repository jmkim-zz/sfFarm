import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

export const dynamic = 'force-dynamic';


const execPromise = promisify(exec);

export async function GET() {
  const isWindows = os.platform() === 'win32';

  try {
    if (isWindows) {
      // Windows: 코드페이지를 65001(UTF-8)로 변경 후 netsh 실행하여 한글 깨짐 방지
      const { stdout } = await execPromise('chcp 65001 && netsh wlan show networks mode=Bssid');
      const wifiList = parseWindowsWifi(stdout);
      return NextResponse.json({ success: true, networks: wifiList });
    } else {
      // Linux/Raspberry Pi: nmcli 사용하여 CSV 형태 출력 유도
      const { stdout } = await execPromise('nmcli -t -f SSID,SIGNAL,SECURITY dev wifi list');
      const wifiList = parseLinuxWifi(stdout);
      return NextResponse.json({ success: true, networks: wifiList });
    }
  } catch (error: any) {
    console.error('Wi-Fi scan failed:', error);
    // 모의 테스트(Mock) 데이터 제공: 실제 무선랜 카드가 없거나 실행 불가한 환경(예: 로컬 개발 가상환경 등)에서의 원활한 UI 개발 지원
    const mockNetworks = [
      { ssid: 'SmartFarm_AP_5G', signal: '92%', security: 'WPA2-Personal' },
      { ssid: 'Office_Guest_WiFi', signal: '74%', security: 'WPA2-Personal' },
      { ssid: 'HiveMQ_Broker_Local', signal: '85%', security: 'WPA/WPA2-Personal' },
      { ssid: 'Free_WiFi_Zone', signal: '45%', security: 'Open' }
    ];
    return NextResponse.json({ 
      success: true, 
      networks: mockNetworks, 
      isMock: true, 
      warning: 'Fallback to mock data due to host scan error: ' + (error.message || error) 
    });
  }
}

// Windows netsh 출력 파서
function parseWindowsWifi(output: string) {
  const networks: Array<{ ssid: string; signal: string; security: string }> = [];
  const lines = output.split('\n');
  let currentSsid = '';
  let currentAuth = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('SSID')) {
      const parts = trimmed.split(':');
      // SSID 명칭에 콜론이 들어갈 수 있으므로 slice 후 join
      currentSsid = parts.slice(1).join(':').trim();
    } else if (trimmed.startsWith('Authentication') || trimmed.startsWith('인증')) {
      const parts = trimmed.split(':');
      currentAuth = parts.slice(1).join(':').trim();
    } else if (trimmed.startsWith('Signal') || trimmed.startsWith('신호')) {
      const parts = trimmed.split(':');
      const signalValue = parts.slice(1).join(':').trim();
      
      // 유효한 SSID가 수집된 경우 목록에 추가
      if (currentSsid) {
        networks.push({
          ssid: currentSsid,
          signal: signalValue,
          security: currentAuth || 'Unknown'
        });
        currentSsid = ''; // 초기화
        currentAuth = '';
      }
    }
  }
  
  // 중복 SSID 제거 및 신호가 강한 순서로 정렬
  return deduplicateAndSort(networks);
}

// Linux nmcli 출력 파서
function parseLinuxWifi(output: string) {
  const networks: Array<{ ssid: string; signal: string; security: string }> = [];
  const lines = output.split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;
    
    // nmcli -t 출력 예: SSID:SIGNAL:SECURITY
    // 이스케이프된 콜론(\:) 처리 필요
    const unescapedLine = line.replace(/\\:/g, '__COLON__');
    const parts = unescapedLine.split(':');
    
    if (parts.length >= 3) {
      const ssid = parts[0].replace(/__COLON__/g, ':').trim() || '[Hidden SSID]';
      const signal = `${parts[1].trim()}%`;
      const security = parts[2].replace(/__COLON__/g, ':').trim() || 'Open';
      
      networks.push({ ssid, signal, security });
    }
  }
  
  return deduplicateAndSort(networks);
}

// 중복 SSID 정리 및 신호 세기 기준 정렬 함수
function deduplicateAndSort(networks: Array<{ ssid: string; signal: string; security: string }>) {
  const map = new Map<string, { ssid: string; signal: string; security: string }>();
  
  for (const net of networks) {
    if (!net.ssid) continue; // 빈 SSID 제외
    const existing = map.get(net.ssid);
    const currentSignalVal = parseInt(net.signal) || 0;
    const existingSignalVal = existing ? (parseInt(existing.signal) || 0) : -1;
    
    if (currentSignalVal > existingSignalVal) {
      map.set(net.ssid, net);
    }
  }
  
  return Array.from(map.values()).sort((a, b) => {
    const sigA = parseInt(a.signal) || 0;
    const sigB = parseInt(b.signal) || 0;
    return sigB - sigA;
  });
}
