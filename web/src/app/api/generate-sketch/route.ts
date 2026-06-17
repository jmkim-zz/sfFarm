import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini API Key 로드
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: '서버에 GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // [핵심 요구사항] 모델 초기화 시 System Instruction으로 펌웨어 작성 규칙 주입
    const systemInstruction = `당신은 아두이노(C++) 펌웨어 개발 전문가입니다.

[엄격한 펌웨어 작성 규칙]
1. delay() 함수 사용을 절대 금지하며, 반드시 millis() 기반의 비동기 유한 상태 기계(FSM) 패턴으로 각 센서의 측정 주기를 제어할 것.
2. I2C 센서 통신 오류 시 NaN 값을 필터링하는 방어 로직을 넣을 것.
3. UART 통신 기기(예: Atlas EZO pH)는 데이터를 요청('R\\r')하기 직전에 반드시 while(Serial1.available()) Serial1.read();를 호출하여 수신 버퍼(Rx Buffer)를 Flush 할 것.
4. [네트워크 강제] WiFiClientSecure.h 라이브러리는 절대 사용하지 말 것. 반드시 <WiFiS3.h>를 포함하고, 전역 객체로 WiFiSSLClient wifiClient;를 선언하여 MQTT 보안 포트(8883) 통신에 사용할 것.
5. [MQTT 인증] mqttClient.connect() 함수 호출 시, NULL을 사용하지 말고 반드시 프론트엔드에서 전달받은 MQTT_USERNAME과 MQTT_PASSWORD 변수를 인자로 명시하여 연결 거부를 방지할 것.
6. [I2C 공식 라이브러리] SCD41 센서 제어 시 Adafruit_SCD4x.h 대신 반드시 SensirionI2CScd4x.h 공식 라이브러리를 사용할 것.
7. [UART 완전 비동기] UART 통신에서 Serial1.readStringUntil()과 같은 블로킹(Blocking) 함수 사용을 엄격히 금지할 것. 대신 if (Serial1.available()) 조건문 내부에서 char c = Serial1.read();를 통해 문자를 전역 String 버퍼에 하나씩 누적하고, c == '\\r' 조건이 만족될 때만 실수형(float)으로 파싱하는 상태 머신 구조를 작성할 것.
8. [시뮬레이션 매크로 선언] 코드 최상단 설정부에 #define SIMULATION_MODE 1 // 1: 가상 데이터 테스트, 0: 실제 하드웨어 센서 매크로를 선언할 것.
9. [가상 데이터 분기] 모든 센서 측정 루틴(SHT31, SCD41, TSL2591, Atlas pH 등) 내부에서 실제 센서 API 호출부는 #if SIMULATION_MODE == 0 으로 감싸고, #elif SIMULATION_MODE == 1 에서는 random() 함수를 사용해 스마트팜 유효 범위 내의 가상 데이터를 생성하여 할당할 것.
   - 온도 (SHT31): 15.0 ~ 35.0 °C (예: random(150, 351) / 10.0)
   - 습도 (SHT31): 40.0 ~ 90.0 % (예: random(400, 901) / 10.0)
   - CO2 (SCD41): 400 ~ 1500 ppm (예: random(400, 1501))
   - 조도 (TSL2591): 100 ~ 8000 lux (예: random(100, 8001))
   - pH (Atlas EZO): 5.5 ~ 7.5 pH (예: random(55, 76) / 10.0)
10. [비동기 구조 유지] 가상 데이터를 생성할 때에도 기존에 지시한 millis() 기반의 측정 주기(INTERVAL)와 완전 비동기 FSM 구조는 절대 훼손하지 말고 그대로 유지할 것 (UART pH 센서의 가상 응답 딜레이 모사 등).
11. [Floating Pin 노이즈 방지] 시뮬레이션 모드 동작 시 UART RX 핀의 노이즈 유입을 막기 위해, UART 데이터를 읽어들이는 while(Serial1.available()) 루틴 전체를 반드시 #if SIMULATION_MODE == 0 블록으로 감싸 물리적 포트 접근을 원천 차단할 것.
12. AI의 부연 설명 없이, 응답은 반드시 순수한 마크다운 C++ 코드 블록(\`\`\`cpp ... \`\`\`)으로만 반환할 것.`;

    const prompt = `다음 하드웨어 설정 정보를 바탕으로 아두이노 스케치(.ino) 코드를 작성하세요.\n\n${JSON.stringify(payload, null, 2)}`;

    // 모델 Fallback(자동 재시도) 리스트 지정
    // 트래픽 분산과 고품질 코드 생성을 보장하기 위해 순차적으로 시도합니다.
    const fallbackModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
    let code = '';
    let lastError: any = null;

    for (const modelName of fallbackModels) {
      try {
        console.log(`[Gemini API] 코드 생성 요청 시도 중... (모델: ${modelName})`);
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemInstruction,
        });

        const result = await model.generateContent(prompt);
        code = result.response.text();
        
        // 렌더링을 위해 마크다운 코드블록 백틱(```cpp, ```) 제거
        code = code.replace(/^```(cpp|c\+\+)?\n/i, '').replace(/```$/i, '').trim();
        
        // 성공하면 다음 모델로 넘어가지 않고 즉시 종료합니다.
        break;
      } catch (error: any) {
        console.error(`[Gemini API Error - ${modelName} 실패]:`, error.message);
        lastError = error;
      }
    }

    if (!code) {
      throw new Error(`모든 모델 호출에 실패했습니다. 마지막 서버 에러: ${lastError?.message}`);
    }

    return NextResponse.json({ code });
  } catch (error: any) {
    console.error('[Gemini API Error]:', error);
    return NextResponse.json({ error: error.message || '코드 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}