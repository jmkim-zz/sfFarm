# Python Edge Logger 아키텍처 명세서 (완전 자동화 방식)

본 문서는 `raspberry/data-logger.py` 스크립트가 동작하는 **데이터 기반 동적 적재(JSONB) 방식**의 아키텍처를 정의합니다.
이 구조를 통해 사용자가 웹 앱(DB)에서 설정을 변경해도 라즈베리파이 코드를 수정하거나 재시작할 필요가 없습니다.

## 1. 데이터베이스 스키마 기반 (Supabase)

과거 정적 스키마(`sensor_data`) 방식에서 벗어나 유연한 관리를 지원합니다.

- **설정 테이블 (`device_configs`)**: 기기별 ID, 활성화 여부, 구독할 MQTT 토픽을 관리합니다.
- **적재 테이블 (`dynamic_telemetry`)**: 센서의 종류에 상관없이, 전달된 모든 페이로드를 `payload (JSONB)` 컬럼에 그대로 Insert 합니다.

## 2. 주요 로직 흐름

1. **초기화**: 스크립트 실행 시 DB의 `device_configs`를 조회하여 활성화된 모든 토픽을 Subscribe 합니다.
2. **백그라운드 동기화**: `config_polling_loop` 스레드가 1분 주기로 DB를 조회하여, 웹에서 새 기기(토픽)가 추가되면 실시간으로 Subscribe 목록을 업데이트합니다.
3. **유연한 적재**: MQTT 메시지 수신 시, JSON 디코딩만 거친 뒤 컬럼을 맞출 필요 없이 `dynamic_telemetry`에 1:1로 밀어 넣습니다.
