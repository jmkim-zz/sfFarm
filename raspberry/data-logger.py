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

# Supabase 설정 로드
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Supabase 환경 변수가 설정되지 않았습니다.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# MQTT 설정 로드
MQTT_URL = os.getenv("MQTT_BROKER_URL")
MQTT_USERNAME = os.getenv("MQTT_USERNAME")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD")

# URL 파싱 (예: mqtts://...:8883 -> host와 port 분리)
parsed_url = urlparse(MQTT_URL)
MQTT_HOST = parsed_url.hostname
MQTT_PORT = parsed_url.port or 1883
MQTT_SCHEME = parsed_url.scheme

# 시뮬레이터 설정
USE_SIMULATOR = str(os.getenv("USE_SIMULATOR", "false")).lower() == "true"
SIMULATOR_INTERVAL = int(os.getenv("SIMULATOR_INTERVAL", "10000")) / 1000.0
SIMULATOR_DEVICE_ID = os.getenv("SIMULATOR_DEVICE_ID", "sim-uno-r4")


# 2. MQTT 콜백 함수 정의
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"[MQTT] HiveMQ 브로커에 성공적으로 연결되었습니다. (Host: {MQTT_HOST})")
        # 센서 및 액추에이터 상태 토픽 구독 (모든 기기 대상 '+')
        client.subscribe("smartfarm/+/sensors")
        client.subscribe("smartfarm/+/actuators/state")
        print("[MQTT] Subscribed to 'smartfarm/+/sensors' and 'smartfarm/+/actuators/state'")
    else:
        print(f"[MQTT] 연결 실패. 반환 코드: {rc}")

def on_message(client, userdata, msg):
    topic = msg.topic
    payload = msg.payload.decode('utf-8')
    print(f"\n[MQTT Msg Received] Topic: {topic} | Payload: {payload}")

    try:
        data = json.loads(payload)
        parts = topic.split('/')
        
        if len(parts) < 3:
            return
            
        device_id = parts[1]
        msg_type = parts[2]

        # 센서 데이터 수신 시 Supabase 저장
        if msg_type == 'sensors':
            record = {
                "device_id": device_id,
                "temperature": data.get("temperature"),
                "humidity": data.get("humidity"),
                "soil_moisture": data.get("soil_moisture"),
                "light_intensity": data.get("light_intensity")
            }
            response = supabase.table("sensor_data").insert(record).execute()
            print(f"[DB Inserted] Sensor Data -> {response.data}")

        # 액추에이터 상태 수신 시 Supabase 저장 (하드웨어가 실제 상태를 보고할 때)
        elif msg_type == 'actuators' and len(parts) == 4 and parts[3] == 'state':
            record = {
                "device_id": device_id,
                "led_on": data.get("led_on", False),
                "fan_on": data.get("fan_on", False),
                "pump_on": data.get("pump_on", False)
            }
            response = supabase.table("actuator_states").insert(record).execute()
            print(f"[DB Inserted] Actuator State -> {response.data}")

    except Exception as e:
        print(f"[Error] 메시지 처리 및 DB 저장 중 오류 발생: {e}")


# 3. 시뮬레이터 루프 (백그라운드 스레드로 동작)
def simulator_loop(client):
    print(f"[{'='*40}]")
    print(f"[Simulator] 시뮬레이터 모드가 활성화되었습니다.")
    print(f"[Simulator] Target Device: {SIMULATOR_DEVICE_ID}")
    print(f"[Simulator] Interval: {SIMULATOR_INTERVAL} seconds")
    print(f"[{'='*40}]")
    
    while True:
        sensor_data = {
            "temperature": round(random.uniform(20.0, 30.0), 1),
            "humidity": round(random.uniform(40.0, 60.0), 1),
            "soil_moisture": round(random.uniform(30.0, 70.0), 1),
            "light_intensity": round(random.uniform(200.0, 800.0), 0)
        }
        
        topic = f"smartfarm/{SIMULATOR_DEVICE_ID}/sensors"
        payload = json.dumps(sensor_data)
        
        client.publish(topic, payload)
        print(f"[Simulator Published] {topic} -> {payload}")
        
        time.sleep(SIMULATOR_INTERVAL)


# 4. 메인 실행 블록
if __name__ == "__main__":
    client = mqtt.Client()
    
    if MQTT_USERNAME and MQTT_PASSWORD:
        client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
        
    if MQTT_SCHEME in ['mqtts', 'tls', 'ssl']:
        client.tls_set()  # 8883 포트 보안 연결 활성화

    client.on_connect = on_connect
    client.on_message = on_message

    client.connect(MQTT_HOST, MQTT_PORT, 60)

    if USE_SIMULATOR:
        sim_thread = threading.Thread(target=simulator_loop, args=(client,), daemon=True)
        sim_thread.start()

    try:
        # 네트워크 트래픽 처리, 콜백 디스패치 및 자동 재연결을 처리하는 블로킹 함수
        client.loop_forever()
    except KeyboardInterrupt:
        print("\n프로그램을 종료합니다...")
        client.disconnect()