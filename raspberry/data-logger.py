import os
import json
import time
import random
import threading
from urllib.parse import urlparse
import paho.mqtt.client as mqtt
from supabase import create_client, Client
from dotenv import load_dotenv

# 1. 환경 변수 로드 (.env)
load_dotenv()

# ==============================================================================
# ⚠️ [사용자 환경 설정 - 필수 수정 항목] ⚠️
# 라즈베리파이 등 배포하는 환경에 맞게 .env 파일을 생성하여 변수를 선언하거나,
# 아래 os.getenv(...) 부분을 지우고 "자신의_실제_문자열_값"으로 직접 덮어쓰세요.
# ==============================================================================

# 1. Supabase 설정
# SUPABASE_URL: Supabase 프로젝트 URL (예: "https://xxxx.supabase.co")
# SUPABASE_KEY: Supabase Service Role Key (보안 주의: 절대 외부에 노출하지 마세요)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("[오류] Supabase 설정이 누락되었습니다. 코드를 직접 수정하거나 .env를 설정하세요.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 2. MQTT 브로커 설정
# MQTT_URL: HiveMQ 클러스터 URL (예: "mqtts://xxxx.s1.eu.hivemq.cloud:8883")
MQTT_URL = os.getenv("MQTT_BROKER_URL")
MQTT_USERNAME = os.getenv("MQTT_USERNAME")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD")

# ==============================================================================

# URL 파싱 (예: mqtts://...:8883 -> host와 port 분리)
parsed_url = urlparse(MQTT_URL)
MQTT_HOST = parsed_url.hostname
MQTT_PORT = parsed_url.port or 1883
MQTT_SCHEME = parsed_url.scheme

# 시뮬레이터 설정 (테스트용)
# USE_SIMULATOR: 실제 아두이노 없이 테스트할 경우 "true", 실제 운영 시 "false"로 변경하세요.
# SIMULATOR_DEVICE_ID: 테스트에 사용할 가상 기기 ID를 입력하세요.
USE_SIMULATOR = str(os.getenv("USE_SIMULATOR", "false")).lower() == "true"
SIMULATOR_INTERVAL = int(os.getenv("SIMULATOR_INTERVAL", "10000")) / 1000.0
SIMULATOR_DEVICE_ID = os.getenv("SIMULATOR_DEVICE_ID", "sim-uno-r4")

# 동적 구독 관리를 위한 전역 변수
subscribed_topics = set()
topic_to_device = {}
state_lock = threading.Lock()  # 스레드 동시 접근 방지용 락

# 2. DB에서 설정 읽어와서 동적 구독(Subscribe) 처리
def update_subscriptions(client):
    global subscribed_topics, topic_to_device
    try:
        response = supabase.table("device_configs").select("device_id, mqtt_topic").eq("is_active", True).execute()
        configs = response.data
        
        with state_lock:
            for config in configs:
                topic = config['mqtt_topic']
                device_id = config['device_id']
                topic_to_device[topic] = device_id
                
                if topic not in subscribed_topics:
                    # 연결이 끊어진 상태에서 구독 방지
                    if client.is_connected():
                        client.subscribe(topic)
                        subscribed_topics.add(topic)
                        print(f"[MQTT] 새 토픽 구독 완료: {topic} (Device: {device_id})")
                    else:
                        print(f"[MQTT] 오프라인 상태이므로 구독을 보류합니다: {topic}")
                
    except Exception as e:
        print(f"[Error] DB에서 설정 업데이트 중 오류: {e}")

# 1분마다 설정을 새로고침하는 백그라운드 스레드
def config_polling_loop(client):
    while True:
        update_subscriptions(client)
        time.sleep(60)

# 3. MQTT 콜백 함수 정의 (Paho-MQTT v2.0 호환)
def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        print(f"[MQTT] HiveMQ 브로커에 성공적으로 연결되었습니다. (Host: {MQTT_HOST})")
        update_subscriptions(client)
    else:
        print(f"[MQTT] 연결 실패. 반환 코드: {reason_code}")

def on_message(client, userdata, msg):
    topic = msg.topic
    payload_str = msg.payload.decode('utf-8')
    print(f"\n[MQTT Msg Received] Topic: {topic} | Payload: {payload_str}")

    try:
        data = json.loads(payload_str)
        
        # JSONB 데이터 타입 불일치 방어 (딕셔너리/오브젝트가 아니면 감싸줌)
        if not isinstance(data, dict):
            data = {"value": data}
        
        # 토픽으로 device_id 식별 (DB에 매핑되지 않은 토픽이면 URL에서 추출 시도)
        with state_lock:
            device_id = topic_to_device.get(topic)
            
        if not device_id:
            parts = topic.split('/')
            device_id = parts[1] if len(parts) >= 2 else "unknown"

        # JSONB 필드(payload)에 데이터를 통째로 Insert
        record = {
            "device_id": device_id,
            "payload": data
        }
        response = supabase.table("dynamic_telemetry").insert(record).execute()
        print(f"[DB Inserted] Device: {device_id} -> dynamic_telemetry 기록 완료")

    except json.JSONDecodeError:
        print(f"[Error] JSON 파싱 실패: {payload_str}")
    except Exception as e:
        print(f"[Error] 메시지 처리 및 DB 저장 중 오류 발생: {e}")

# 4. 시뮬레이터 루프 (백그라운드 스레드로 동작)
def simulator_loop(client):
    print(f"[{'='*40}]")
    print(f"[Simulator] 시뮬레이터 모드가 활성화되었습니다.")
    print(f"[Simulator] Interval: {SIMULATOR_INTERVAL} seconds")
    print(f"[{'='*40}]")
    
    while True:
        # DB에 설정된 토픽이 있으면 첫 번째 기기에, 없으면 기본 기기에 데이터 전송
        with state_lock:
            target_device = next(iter(topic_to_device.values())) if topic_to_device else SIMULATOR_DEVICE_ID
            topic = next(iter(topic_to_device.keys())) if topic_to_device else f"smartfarm/{SIMULATOR_DEVICE_ID}/sensors"
        
        sensor_data = {
            "temperature": round(random.uniform(20.0, 30.0), 1),
            "humidity": round(random.uniform(40.0, 60.0), 1),
            "soil_moisture": round(random.uniform(30.0, 70.0), 1),
            "light_intensity": round(random.uniform(200.0, 800.0), 0)
        }
        
        payload = json.dumps(sensor_data)
        
        client.publish(topic, payload)
        print(f"[Simulator Published] {topic} -> {payload}")
        
        time.sleep(SIMULATOR_INTERVAL)

# 5. 메인 실행 블록
if __name__ == "__main__":
    # Paho-MQTT v2.0 API 버전 명시
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    
    if MQTT_USERNAME and MQTT_PASSWORD:
        client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
        
    if MQTT_SCHEME in ['mqtts', 'tls', 'ssl']:
        client.tls_set()  # 8883 포트 보안 연결 활성화

    client.on_connect = on_connect
    client.on_message = on_message

    client.connect(MQTT_HOST, MQTT_PORT, 60)

    # 주기적으로 DB에서 구독 정보를 읽어오는 스레드 시작
    polling_thread = threading.Thread(target=config_polling_loop, args=(client,), daemon=True)
    polling_thread.start()

    if USE_SIMULATOR:
        sim_thread = threading.Thread(target=simulator_loop, args=(client,), daemon=True)
        sim_thread.start()

    try:
        # 네트워크 트래픽 처리, 콜백 디스패치 및 자동 재연결을 처리하는 블로킹 함수
        client.loop_forever()
    except KeyboardInterrupt:
        print("\n프로그램을 종료합니다...")
        client.disconnect()