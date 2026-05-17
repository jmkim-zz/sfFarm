# 🌱 SmartFarm 관제 시스템 (Monorepo)

본 프로젝트는 하드웨어(Arduino), 데이터 로거(Raspberry Pi/Python), 그리고 웹 대시보드(Next.js)가 하나의 저장소에 통합된 **모노레포(Monorepo)** 형태의 스마트팜 실시간 관제 시스템입니다.

## 🏗 시스템 아키텍처 및 데이터 흐름

1. **Sensor Data (Publish)**: IoT 기기(Arduino)가 센서 데이터를 측정하여 HiveMQ(MQTT 브로커)로 전송합니다.
2. **Data Logging (Subscribe -> DB)**: `raspberry` 디렉토리의 Python 데이터 로거가 MQTT 메시지를 수신하여 Supabase(PostgreSQL) DB에 영구 저장합니다.
3. **Web Dashboard (View)**: Next.js 웹 앱은 Supabase REST API를 통해 과거 데이터를 조회하고, MQTT over WebSockets를 통해 실시간 데이터를 화면에 렌더링합니다.
4. **Actuator Control (Publish -> Act)**: 사용자가 웹에서 제어 버튼을 누르면 MQTT 토픽으로 제어 명령이 발행되고, Arduino가 이를 수신하여 실제 액추에이터(펌프, 팬 등)를 제어합니다.

---

## 📂 디렉토리 구조 및 역할

각 디렉토리는 독립적인 역할을 수행하며, 협업 시 본인이 담당하는 파트의 폴더를 중점적으로 확인하면 됩니다.

| 디렉토리 | 기술 스택 | 역할 |
| :--- | :--- | :--- |
| `/arduino` | C/C++ | **[하드웨어]** Arduino Uno R4 기반 펌웨어 로직. 센서 제어, 와이파이 통신, MQTT Pub/Sub을 수행합니다. |
| `/raspberry` | Python | **[백그라운드 서버]** MQTT 브로커와 Supabase DB를 연결하는 브릿지. 24시간 실행되며 데이터를 기록합니다. (기존 `/mqtt-service`를 대체함) |
| `/web` | Next.js, TS | **[프론트엔드]** 사용자 대시보드 UI. 실시간 데이터 차트 표출 및 하드웨어 원격 제어 인터페이스를 제공합니다. |
| `/supabase` | SQL | **[데이터베이스]** Supabase 테이블(sensor_data, actuator_states) 생성 스키마 및 권한 설정(RLS) 파일이 포함되어 있습니다. |
| `/docs` | Markdown | **[문서]** 프로젝트 세팅 가이드 및 MQTT 토픽 설계 명세서 등이 포함되어 있습니다. |
| `/mqtt-service`| Node.js | (Legacy) 과거 Node.js로 작성되었던 데이터 로거 워커 서비스입니다. |

---

## ⚠️ 환경 변수 (.env) 설정 및 주의사항

**보안 주의:** 클라우드 서비스(HiveMQ, Supabase) 접속 정보가 담긴 `.env` 파일은 절대 Git(GitHub)에 커밋해서는 안 됩니다. 각 폴더에는 `.env.example`과 같은 템플릿만 남겨두고, 로컬 환경에서 직접 `.env` 파일을 생성하여 사용하세요.

### 1. 웹 프론트엔드 (`/web/.env.local`)
```env
# Supabase 공개 키 (웹 브라우저 노출 가능)
NEXT_PUBLIC_SUPABASE_URL=https://[본인-프로젝트].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[Supabase-anon-public-key]

# HiveMQ Cloud 웹소켓 설정 (포트 8884 및 /mqtt 경로 필수)
NEXT_PUBLIC_MQTT_BROKER_URL=wss://[본인-클러스터-URL]:8884/mqtt
NEXT_PUBLIC_MQTT_USERNAME=[HiveMQ-유저명]
NEXT_PUBLIC_MQTT_PASSWORD=[HiveMQ-비밀번호]
```

### 2. 데이터 로거 (`/raspberry/.env`)
```env
# HiveMQ Cloud (포트 8883 필수)
MQTT_BROKER_URL=mqtts://[본인-클러스터-URL]:8883
MQTT_USERNAME=[HiveMQ-유저명]
MQTT_PASSWORD=[HiveMQ-비밀번호]

# Supabase 시크릿 키 (절대 외부에 노출 금지)
SUPABASE_URL=https://[본인-프로젝트].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[Supabase-service_role-secret-key]

# 하드웨어(Arduino) 없이 테스트할 때 true로 설정
USE_SIMULATOR=true
SIMULATOR_INTERVAL=10000
SIMULATOR_DEVICE_ID=sim-uno-r4
```

---

## 🚀 로컬 환경 실행 가이드 (Quick Start)

하드웨어 없이 PC에서 UI와 데이터베이스 연동을 테스트하는 방법입니다.

### Step 1. Data Logger (Python) 실행
`/raspberry` 폴더로 이동하여 가상 환경을 세팅하고 시뮬레이터 모드로 로거를 실행합니다.
```bash
cd raspberry
python -m venv venv
source venv/Scripts/activate  # (Mac/Linux는 source venv/bin/activate)
pip install -r requirements.txt
python data-logger.py
```
> 터미널에 10초마다 랜덤 데이터가 MQTT로 전송되고 DB에 Insert되는 로그가 출력됩니다.

### Step 2. Web Dashboard (Next.js) 실행
새 터미널을 열고 `/web` 폴더로 이동하여 웹 서버를 실행합니다.
```bash
cd web
npm install
npm run dev
```
> 브라우저에서 `http://localhost:3000`에 접속하여 데이터가 실시간으로 차트에 그려지는지 확인합니다.