# 스마트팜 프로젝트 환경 설정 가이드 (Setup Guide)

본 문서는 스마트팜 관제 시스템이 정상적으로 동작하기 위해 필수적인 외부 클라우드 서비스(Supabase, HiveMQ Cloud)의 설정 방법과 환경 변수(`.env`) 구성 방법을 안내합니다.

---

## 1. Supabase (데이터베이스) 설정

Supabase는 오픈소스 PostgreSQL 기반의 Backend-as-a-Service(BaaS)입니다. 본 프로젝트에서는 센서 데이터와 액추에이터 상태를 저장하고 REST API를 제공하는 역할을 합니다.

### 1.1. 프로젝트 생성 및 스키마 적용

1. Supabase 공식 홈페이지에 접속하여 회원가입 후 새로운 프로젝트를 생성합니다.
2. 프로젝트 대시보드 좌측 메뉴에서 **SQL Editor**로 이동합니다.
3. 본 프로젝트의 `supabase/migrations/001_initial_schema.sql` 파일에 있는 전체 SQL 코드를 복사하여 SQL Editor에 붙여넣고 실행(Run)합니다.
   - 이 작업을 통해 `sensor_data`와 `actuator_states` 테이블 및 RLS(Row Level Security) 정책이 생성됩니다.

### 1.2. API 키 발급

프로젝트 대시보드의 **Project Settings -> API** 메뉴로 이동하여 다음 두 가지 값을 복사해 둡니다.

- **Project URL**: 데이터베이스 접근을 위한 기본 URL 주소입니다.
- **Project API Keys**:
  - `anon` (public): 웹 프론트엔드(Next.js 브라우저 환경)에서 사용할 읽기 전용 키입니다.
  - `service_role` (secret): RLS 정책을 우회하여 데이터를 강제로 기록할 수 있는 관리자 키입니다. 백그라운드 워커(`mqtt-service`)에서만 안전하게 사용해야 합니다.

---

## 2. HiveMQ Cloud (MQTT 브로커) 설정

HiveMQ Cloud는 서버리스 형태의 완전 관리형 MQTT 브로커입니다. IoT 기기와 웹 프론트엔드 간의 실시간 메시지 중계를 담당합니다.

### 2.1. 클러스터 생성 및 인증 정보 발급

1. HiveMQ Cloud에 가입하여 무료(Serverless Free) 클러스터를 생성합니다.
2. 클러스터 대시보드의 **Access Management** 탭으로 이동하여 접속 시 사용할 **Username**과 **Password**를 생성합니다. (이 정보가 없으면 기기가 브로커에 접근할 수 없습니다.)

### 2.2. 클러스터 URL 및 포트 확인

클러스터 대시보드의 **Overview** 탭에서 클러스터 URL(예: `xxxxx.s1.eu.hivemq.cloud`)을 복사합니다.
접속 프로토콜에 따라 사용하는 포트가 다릅니다.

- **8883 포트 (`mqtts://`)**: 아두이노(C++) 및 백그라운드 워커(Node.js) 등 TCP/TLS 기반의 클라이언트가 사용합니다.
- **8884 포트 (`wss://`)**: 웹 브라우저(Next.js)가 WebSocket을 통해 접근할 때 사용합니다. 경로 뒤에 `/mqtt`를 붙여야 합니다.

---

## 3. 환경 변수 (.env) 설정

위에서 획득한 서비스 접속 정보들을 프로젝트의 환경 변수 파일에 기입해야 합니다.

### 3.1. 백그라운드 서비스 설정 (`mqtt-service/.env`)

`mqtt-service/.env.example` 파일을 복사하여 `mqtt-service/.env` 파일을 생성하고 아래와 같이 채워 넣습니다.

```env
# HiveMQ Cloud 설정 (8883 포트 사용)
MQTT_BROKER_URL=mqtts://[본인의-클러스터-URL]:8883
MQTT_USERNAME=[HiveMQ에서-생성한-유저명]
MQTT_PASSWORD=[HiveMQ에서-생성한-비밀번호]

# Supabase 설정
SUPABASE_URL=[Supabase-Project-URL]
SUPABASE_SERVICE_ROLE_KEY=[Supabase-service_role-secret-key]

# 시뮬레이터 사용 여부 (하드웨어 연결 전 테스트용)
USE_SIMULATOR=true
SIMULATOR_INTERVAL=10000
SIMULATOR_DEVICE_ID=sim-uno-r4
```

### 3.2. 웹 프론트엔드 설정 (`web/.env.local`)

`web/.env.local.example` 파일을 복사하여 `web/.env.local` 파일을 생성하고 아래와 같이 채워 넣습니다.

```env
# Supabase 설정 (브라우저 노출용 anon 키 사용)
NEXT_PUBLIC_SUPABASE_URL=[Supabase-Project-URL]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[Supabase-anon-public-key]

# HiveMQ Cloud 웹소켓 설정 (8884 포트 및 /mqtt 경로 사용)
NEXT_PUBLIC_MQTT_BROKER_URL=wss://[본인의-클러스터-URL]:8884/mqtt
NEXT_PUBLIC_MQTT_USERNAME=[HiveMQ에서-생성한-유저명]
NEXT_PUBLIC_MQTT_PASSWORD=[HiveMQ에서-생성한-비밀번호]
```

---

## 4. 실행 및 테스트 (시뮬레이터 모드)

설정이 완료되면 하드웨어 없이 시뮬레이터 모드로 전체 데이터 파이프라인을 테스트할 수 있습니다.

1. 터미널을 열고 `mqtt-service` 폴더로 이동하여 백그라운드 워커를 실행합니다.

   ```bash
   npm install
   npm run dev
   ```

   정상적으로 연결되면 10초마다 랜덤 데이터가 MQTT로 전송되고 DB에 Insert 되었다는 로그가 출력됩니다.

2. 다른 터미널을 열고 `web` 폴더로 이동하여 웹 프론트엔드를 실행합니다.
   ```bash
   npm run dev
   ```
3. 브라우저에서 `http://localhost:3000`에 접속하여 데이터가 화면에 실시간으로 표시되고 차트가 그려지는지 확인합니다.

---

## 5. 하드웨어 (아두이노) 실제 연동

테스트가 완료되면 `mqtt-service/.env`에서 `USE_SIMULATOR=false`로 변경한 후 재시작합니다.
이후 `arduino/smartfarm_uno_r4/mqtt_client.cpp` 파일의 상단 사용자 설정 부분을 본인의 Wi-Fi 정보와 HiveMQ 접속 정보로 수정한 뒤, 아두이노 보드에 펌웨어를 업로드하면 실제 하드웨어 관제가 시작됩니다.
