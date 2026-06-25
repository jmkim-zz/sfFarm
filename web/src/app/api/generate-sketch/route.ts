import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const apiKey = body.geminiApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured. Please set it in System Settings or environment variables.');
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const systemInstruction = `You are an expert C++ firmware developer for Arduino.
Follow these strict rules:
  CRITICAL 1. You MUST use the provided 'networkInfo.facilityMqttTopic' as the MQTT topic for publishing all sensor telemetry data.
  CRITICAL 2. You MUST use the provided 'networkInfo.controlMqttTopic' as the MQTT topic for subscribing to all actuator control commands.
1. delay() 함수 사용을 절대 금지하며, 반드시 millis() 기반의 비동기 유한 상태 기계(FSM) 패턴으로 각 센서의 측정 주기를 제어할 것.
2. I2C 센서 통신 오류 시 NaN 값을 필터링하는 방어 로직을 넣을 것.
3. UART 통신 기기(예: Atlas EZO pH) 수신 및 파싱 규칙:
   - 데이터를 요청('R\\r')하기 직전에 반드시 \`while(Serial1.available()) Serial1.read();\`를 호출하여 수신 버퍼(Rx Buffer)를 Flush 할 것.
   - 수신 문자를 버퍼에 누적할 때는 반드시 \`isPrintable()\`로 출력 가능한 문자인지 확인할 것.
   - 응답 파싱 시 절대 \`startsWith("+")\`를 사용하지 말 것. EZO 회로는 \`1,7.00\` 또는 \`7.00\` 형식으로 응답하므로, 콤마(,)가 있으면 분리하거나 숫자 형태인지 검증 후 \`toFloat()\`로 직접 추출할 것.
4. AI의 부연 설명 없이, 응답은 반드시 순수한 마크다운 C++ 코드 블록(\`\`\`cpp ... \`\`\`)으로만 반환할 것.
5. [사용자 필수 요구사항] Arduino UNO R4 WiFi의 내장 LED 매트릭스(Arduino_LED_Matrix)를 이용하여 통신 상태를 표시할 것:
   - WiFi 연결 시: 좌측 상단 2x2 크기로 LED ON (파란색 개념)
   - WiFi 해제 시: 좌측 상단 1x1 크기로 LED ON (빨간색 개념)
   - MQTT 연결 시: 우측 하단 2x2 크기로 LED ON (파란색 개념)
   - MQTT 해제 시: 우측 하단 1x1 크기로 LED ON (빨간색 개념)
   (주의 1: UNO R4 WiFi의 매트릭스는 물리적으로 단색(Red)이므로 컬러 제어는 불가함. AI는 색상 제어를 시도하지 말고, 오직 요구된 '위치'와 '크기'의 LED 픽셀 배열을 제어하여 상태를 정확히 구분하도록 코드를 작성할 것.)
    (주의 2: Arduino_LED_Matrix 라이브러리 사용 시, 헤더 파일 이름은 \`<Arduino_LED_Matrix.h>\` 이지만 전역 객체 선언 시의 클래스(타입) 이름은 언더바가 없는 \`ArduinoLEDMatrix\` 입니다. 따라서 반드시 \`ArduinoLEDMatrix matrix;\` 형태로 객체를 선언해야 합니다. \`Arduino_LED_Matrix matrix;\`와 같이 선언할 경우 컴파일 에러가 발생합니다.)
    (주의 3: ArduinoLEDMatrix 라이브러리에는 matrix.clear()나 matrix.drawPixel() 같은 함수가 없습니다. 특정 LED를 제어하려면 반드시 8행(Row) 12열(Col) 크기의 2차원 배열(예: \`byte frame[8][12]\` 또는 \`uint8_t frame[8][12]\`)을 선언하고 좌표값을 설정해야 합니다. 이후 \`renderBitmap\`을 호출할 때에는 \`matrix.renderBitmap(frame, 8, 12);\`와 같이 2차원 배열 자체를 캐스팅 없이 그대로 인자로 전달하고 행(8)과 열(12) 크기를 모두 지정해야 합니다. \`renderBitmap\`은 매크로 함수이므로 내부적으로 \`&frame[0][0]\`과 같이 2차원 배열 인덱싱을 수행합니다. 따라서 \`(uint8_t*)frame\` 과 같이 1차원 포인터로 캐스팅해서 전달하면 C++ 컴파일러에서 2차원 배열 참조(subscript) 오류가 발생하여 컴파일이 불가능해집니다. 절대 1차원 포인터로 캐스팅하지 마십시오.)
6. MQTT 클라이언트 라이브러리 및 보안:
   - \`ArduinoMqttClient\` 대신, 직관적이고 실무에서 널리 쓰이는 \`PubSubClient.h\` 라이브러리를 사용할 것.
   - HiveMQ Cloud 연동 시에는 패스워드 문자열 필드가 비어 있으면 서버 세션 연결이 거부되므로, MQTT 연결(connect) 시 패스워드 매개변수에 실제 계정 비밀번호 정보를 누락 없이 인자로 전달해 연동할 것.
7. TSL2591 센서 조도 측정 시 주의사항:
   - 객체 생성 시 \`Adafruit_TSL2591 tsl = Adafruit_TSL2591(2591);\` 형태로 생성하고 타이밍과 게인 설정은 반드시 \`setup()\` 내부에서 \`tsl.setGain()\`, \`tsl.setTiming()\`을 통해 지정할 것. (생성자에 직접 인자 전달 금지)
   - \`tsl.getFullLuminosity(&lum_full, &lum_ir)\` 와 같은 포인터/참조 매개변수 방식은 해당 라이브러리에서 지원하지 않으므로 절대 사용 금지.
   - 반드시 파라미터 없이 호출하여 32비트 반환값을 받은 후 비트 연산할 것. (예시: \`uint32_t lum = tsl.getFullLuminosity(); uint16_t ir = lum >> 16; uint16_t full = lum & 0xFFFF;\`)
8. WiFi 및 MQTT 재연결 시 \`while (WiFi.status() != WL_CONNECTED)\` 등 스핀락(Spinlock) 블로킹 코드를 절대 작성하지 말고, 연결이 안 되었으면 즉시 \`return\` 하여 완전한 논블로킹으로 구현할 것.
9. Arduino UNO R4 WiFi의 통신 라이브러리 주의사항:
   - ESP 계열의 \`<WiFi.h>\`, \`<WiFiClientSecure.h>\`, \`<WiFiSSLClient.h>\` 헤더를 절대 포함(include)하지 말 것. UNO R4 WiFi 전용 네트워킹 라이브러리인 반드시 \`#include <WiFiS3.h>\` 만 포함할 것. (\`<WiFiS3.h>\` 내부에 SSL 클라이언트 기능이 있으므로 객체는 \`WiFiSSLClient wifiClient;\` 형태로 생성 가능함)
   - \`setInsecure()\` 메서드를 지원하지 않으므로 코드 어디에도 절대 작성하지 말 것.
   - 시뮬레이션 모드를 끄고 실물 보드에 업로드할 때(\`SIMULATION_MODE == 0\`) 반드시 \`WiFi.begin(WIFI_SSID, WIFI_PASSWORD);\` 구문으로 SSID와 암호 매개변수를 모두 정확히 적용해 호출할 것.
10. SCD41 센서 라이브러리: \`<Adafruit_SCD4X.h>\` 대신 반드시 제조사 공식 라이브러리인 \`<SensirionI2CScd4x.h>\`를 사용할 것.
11. 시뮬레이션 모드(TDD) 및 하드웨어 격리 (가장 중요):
    - 코드 최상단에 \`#define SIMULATION_MODE 1\` 매크로를 선언할 것.
    - **WiFi 연결과 MQTT 통신(네트워크 연결)은 \`SIMULATION_MODE\` 값에 관계없이 항상 실제 실물 동작**을 수행해야 합니다. 즉, \`SIMULATION_MODE == 1\`인 경우에도 \`WiFi.begin()\`과 \`mqttClient.connect()\`를 통해 실제 네트워크 및 브로커에 접속하고, \`mqttClient.publish()\`를 통해 데이터를 실제로 발행해야 합니다. 통신 로직 자체를 격리하거나 가짜 상태로 조기 리턴하지 마십시오.
    - **\`SIMULATION_MODE\`는 오직 물리 센서 소자의 장착 여부만 가리킵니다.** \`SIMULATION_MODE == 1\`일 때는 물리 센서 소자(SHT31, TSL2591, Atlas EZO pH 등)가 없으므로 센서의 물리 리딩 로직만 건너뛰고 \`random()\` 함수 등을 통해 데이터를 시뮬레이션(가짜 생성)할 뿐, 이 데이터 또한 실제 연결된 WiFi와 MQTT를 통해 브로커로 실시간 발행되어야 합니다.
    - 물리 센서 초기화(예: \`sht31.begin()\`, \`tsl.begin()\` 등) 및 물리 센서 값 읽기, UART 수신 대기(\`Serial1.available()\`) 등 **물리 소자와 직접적으로 통신하는 로직만 \`#if SIMULATION_MODE == 0\` 전처리기 지시어로 격리**하십시오.
    - 이때 전역 스코프 오류(\`not declared in this scope\`)를 방지하기 위해, 모든 라이브러리 객체(예: \`ArduinoLEDMatrix matrix;\`, \`Adafruit_SHT31 sht31;\`, \`WiFiSSLClient wifiClient;\` 등) 및 전역 변수/핀 선언부 자체는 절대로 전처리기 지시어(#if) 내부로 격리하지 말고 전역에 노출시켜 선언해야 합니다. 오직 \`setup()\` 및 \`loop()\` 내부의 물리적 초기화 및 물리적 측정 실행 로직만 \`#if SIMULATION_MODE == 0\`으로 감싸 격리할 것.
    - 시뮬레이션 모드(\`SIMULATION_MODE == 1\`)에서는 하드웨어 응답(UART 수신 대기 등)을 기다리는 FSM 로직 없이, 측정 주기 도래 시 곧바로 Random 값을 생성하여 FSM 상태를 전이시키고 실제 연결된 MQTT로 발행할 것.`;

    // 프론트엔드에서 넘어온 하드웨어 핀 및 네트워크 설정 Payload 전달
    const prompt = `다음 하드웨어 및 네트워크 설정 정보를 바탕으로 스마트팜 아두이노 전체 스케치(.ino) 코드를 작성해 줘:\n\n${JSON.stringify(body, null, 2)}`;

    // 접속 실패(404 등) 시 대비해 여러 모델로 순차적(Fallback) 재시도
    // 코드 품질 유지를 위해 추론 능력이 뛰어난 Pro 계열의 모델만으로 구성
    const modelsToTry = [
      'gemini-2.5-pro',
      'gemini-2.0-pro-exp-02-05',
      'gemini-1.5-pro-latest',
      'gemini-1.5-pro',
      'gemini-pro',
      'gemini-2.5-flash' 
    ];
    let code = '';
    const errors: string[] = [];

    for (const modelName of modelsToTry) {
      try {
        console.log(`[Generate Sketch API] Trying model: ${modelName}`);
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemInstruction
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        code = response.text() || '';
        break; // 성공 시 루프 종료
      } catch (error: any) {
        console.warn(`[Generate Sketch API] Model ${modelName} failed:`, error.message);
        // 에러가 너무 길어지지 않게 첫 줄만 수집
        errors.push(`[${modelName}] ${(error.message || 'Unknown').split('\n')[0]}`);
      }
    }

    if (!code) {
      const combinedErrors = errors.join(' | ');
      if (combinedErrors.includes('429') || combinedErrors.includes('Quota')) {
        throw new Error('Gemini API 호출 한도(Rate Limit 또는 Quota)를 초과했습니다. 잠시 후 다시 시도해 주세요.\n(상세: ' + combinedErrors + ')');
      }
      throw new Error(`모든 모델에서 코드 생성에 실패했습니다. 상세 오류: ${combinedErrors}`);
    }

    // AI가 규칙을 무시하고 텍스트를 덧붙였을 경우를 대비해 순수 코드 블록만 추출
    const match = code.match(/```(?:cpp|c)?\n([\s\S]*?)```/);
    if (match && match[1]) {
      code = match[1].trim();
    } else {
      code = code.replace(/^```(cpp|c)?\n/, '').replace(/```$/, '').trim();
    }

    return NextResponse.json({ code });
  } catch (error: any) {
    console.error('[Generate Sketch API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate Arduino sketch code.' },
      { status: 500 }
    );
  }
}