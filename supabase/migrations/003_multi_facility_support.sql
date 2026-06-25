-- 003_multi_facility_support.sql

-- 1. 기기 및 구독(Subscribe) 설정 테이블 생성 (다중 시설 지원 및 작물 메타데이터 포함)
CREATE TABLE IF NOT EXISTS device_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT UNIQUE NOT NULL,       -- 기기 식별자 (예: 'uno-r4-001', 'bunny', 'pooh')
    mqtt_topic TEXT NOT NULL,             -- 구독할 토픽 (예: 'smartfarm/bunny/sensors')
    is_active BOOLEAN DEFAULT true,       -- 데이터 수집 활성화 여부
    description TEXT,                     -- 기기 설명 (예: 'A동 1번 베드')
    crops JSONB DEFAULT '[]'::jsonb,      -- 재배 중인 작물 목록 (JSON 배열, 예: ["오이", "토마토"])
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 동적 센서 데이터(JSONB) 적재 테이블 생성
CREATE TABLE IF NOT EXISTS dynamic_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT REFERENCES device_configs(device_id) ON DELETE CASCADE,
    payload JSONB NOT NULL,               -- 센서 데이터를 통째로 저장하는 JSONB 컬럼
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 설정 데이터를 저장할 테이블 생성 (전역 설정용)
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 보안을 위한 RLS(Row Level Security) 설정 및 조회 권한
ALTER TABLE device_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dynamic_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- 정책 생성 전 기존 정책 삭제 (안전장치)
DROP POLICY IF EXISTS "Allow public read for configs" ON device_configs;
DROP POLICY IF EXISTS "Allow public read for telemetry" ON dynamic_telemetry;
DROP POLICY IF EXISTS "Allow public read and write" ON app_settings;
DROP POLICY IF EXISTS "Allow all for configs" ON device_configs;
DROP POLICY IF EXISTS "Allow all for telemetry" ON dynamic_telemetry;

-- 개발 편의를 위해 일단 ALL 권한 부여 (필요 시 수정)
CREATE POLICY "Allow all for configs" ON device_configs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for telemetry" ON dynamic_telemetry FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read and write" ON app_settings FOR ALL USING (true) WITH CHECK (true);

-- 실시간 차트 업데이트를 위한 설정 (publication)
-- 만약 이미 존재한다면 에러가 날 수 있으므로 예외 처리가 필요하나, SQL 스크립트에서는 생략하거나 안전하게 실행
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'dynamic_telemetry'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE dynamic_telemetry;
    END IF;
END $$;
