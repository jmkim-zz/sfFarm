# 역할 및 컨텍스트
당신은 Next.js 기반 웹 서비스와 Google Gemini API 연동에 능숙한 시니어 풀스택 개발자입니다.
현재 사용자가 웹 UI에서 스마트팜 기기(센서/액추에이터)와 Arduino UNO R4 WiFi의 핀을 맵핑하면, 백엔드에서 Gemini API를 호출하여 아두이노 C++ 코드(.ino)를 자동 생성해주는 기능을 개발 중입니다.

# 데이터베이스 스키마 및 데이터 흐름 (배경 지식)
데이터베이스는 다음과 같이 정규화되어 있으며, 프론트엔드는 이 데이터를 조합하여 JSON 페이로드로 백엔드에 전송합니다.

device_catalog: 기기 마스터 정보 (model_name, protocol, required_libraries 등)

user_nodes: 사용자의 아두이노 보드 정보 (node_name, board_type 등)

node_pin_mappings: 사용자가 할당한 핀(A0, I2C, UART 등)과 통신 방식, MQTT 토픽 정보


# 요구 사항 (작성해야 할 코드)
TypeScript를 사용하여 다음 두 가지 코드를 작성해 주세요.

1. Next.js API 라우트 (app/api/generate-sketch/route.ts):

프론트엔드로부터 하드웨어 설정 정보가 담긴 JSON 페이로드(sensors, board_info, mqtt_info)를 받습니다.

@google/generative-ai SDK를 사용하여 gemini-1.5-flash (또는 최신 모델) API를 호출합니다.

[핵심 요구사항] 모델 초기화 시 systemInstruction (또는 메인 프롬프트 텍스트)에 다음의 엄격한 펌웨어 작성 규칙을 반드시 주입해야 합니다:

"delay() 함수 사용을 절대 금지하며, 반드시 millis() 기반의 비동기 유한 상태 기계(FSM) 패턴으로 각 센서의 측정 주기를 제어할 것."

"I2C 센서 통신 오류 시 NaN 값을 필터링하는 방어 로직을 넣을 것."

"UART 통신 기기(예: Atlas EZO pH)는 데이터를 요청('R\r')하기 직전에 반드시 while(Serial1.available()) Serial1.read();를 호출하여 수신 버퍼(Rx Buffer)를 Flush 할 것."

"AI의 부연 설명 없이, 응답은 반드시 순수한 마크다운 C++ 코드 블록(cpp ... )으로만 반환할 것."

API 결과를 프론트엔드로 반환합니다. API Key는 process.env.GEMINI_API_KEY를 사용하세요.

2. 프론트엔드 코드 생성 컴포넌트 수정 (Client Component):

기존 UI를 바탕으로 구현해 주세요:

"Generate Arduino sketch" 버튼: 클릭 시 위에서 만든 API로 데이터를 POST 요청하고, 결과를 받아오도록 연결합니다.

팝업(모달) 결과창: 코드가 생성되면 현재 UI 레이아웃과 동일한 팝업 내에 코드를 렌더링합니다.

"Copy Code" 버튼 추가: navigator.clipboard API를 사용하여 생성된 텍스트를 클립보드에 복사하는 로직을 연결합니다.

"Download .ino File" 버튼 추가: Blob 객체와 URL.createObjectURL()을 활용하여 생성된 코드를 smartfarm_node.ino 파일로 즉시 다운로드하는 로직을 연결합니다.

# 출력 형식
즉시 프로젝트에 적용할 수 있도록 불필요한 설명은 줄이고, 완성도 높은 TypeScript 코드를 위주로 출력해 주세요. API 통신 시 에러 핸들링(try-catch)을 반드시 포함해야 합니다.