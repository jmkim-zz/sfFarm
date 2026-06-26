import os
import json
import time
import datetime
import queue
import random
import threading
from urllib.parse import urlparse
import paho.mqtt.client as mqtt
from supabase import create_client, Client
from dotenv import load_dotenv

# 1. Load environment variables (.env)
load_dotenv()

# ==============================================================================
# ⚠️ [User Settings - Required Configuration] ⚠️
# Create a .env file matching your deployment environment,
# or replace os.getenv(...) calls directly with your real credentials.
# ==============================================================================

# 1. Supabase Configuration
# SUPABASE_URL: Supabase Project URL (e.g., "https://xxxx.supabase.co")
# SUPABASE_KEY: Supabase Service Role Key (Be careful: keep it secret!)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("[Error] Supabase configuration is missing. Configure .env or edit the script.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 2. MQTT Broker Configuration
# MQTT_URL: HiveMQ Cluster URL (e.g., "mqtts://xxxx.s1.eu.hivemq.cloud:8883")
MQTT_URL = os.getenv("MQTT_BROKER_URL")
MQTT_USERNAME = os.getenv("MQTT_USERNAME")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD")

# ==============================================================================

# Parse URL (e.g., mqtts://...:8883 -> split host and port)
parsed_url = urlparse(MQTT_URL)
MQTT_HOST = parsed_url.hostname
MQTT_PORT = parsed_url.port or 1883
MQTT_SCHEME = parsed_url.scheme

# Simulator Settings (for testing)
# USE_SIMULATOR: set to "true" to test without physical hardware, "false" for production.
USE_SIMULATOR = str(os.getenv("USE_SIMULATOR", "false")).lower() == "true"
SIMULATOR_INTERVAL = int(os.getenv("SIMULATOR_INTERVAL", "10000")) / 1000.0
SIMULATOR_DEVICE_ID = os.getenv("SIMULATOR_DEVICE_ID", "sim-uno-r4")

# Buffer for averaging per topic and per sensor
data_buffer = {} # topic -> { sensor_key -> list of values }
last_sync_time = {} # topic -> { sensor_key -> float }
buffer_lock = threading.Lock()
SENSOR_SYNC_INTERVALS = {} # Injected by Web UI

# Global variables for dynamic subscription management
subscribed_topics = set()
topic_to_device = {}
logger_status_map = {} # device_id -> boolean
state_lock = threading.Lock()  # Thread lock for thread-safe operations
equipment_schedules = {}
message_queue = queue.Queue() # device_id -> { equip_name -> schedule_data }

# 2. Read configuration from DB and process dynamic subscriptions
def update_subscriptions(client):
    global subscribed_topics, topic_to_device
    try:
        # Query active hardware pin configurations containing MQTT topics from app_settings
        response = supabase.table("app_settings").select("key, value").like("key", "sf_hardware_pins_%").execute()
        
        if not response.data:
            print("[MQTT] No hardware configuration found in DB.")
            return

        active_configs = []
        
        for row in response.data:
            settings = row.get("value", {})
            pin_mqtt_topics = settings.get("pinMqttTopics", {})
            default_device_id = "pooh"

            # Parse nested list structures under each pin interface type (I2C, UART, A0, etc.)
            for pin_type, topic_lists in pin_mqtt_topics.items():
                if not topic_lists:
                    continue
                for topic_list in topic_lists:
                    if not topic_list:
                        continue
                    for topic in topic_list:
                        if topic and topic.strip():
                            # Extract device_id from topic path (e.g., smartfarm/pooh/temp -> pooh)
                            parts = topic.split('/')
                            device_id = parts[1] if len(parts) >= 2 else default_device_id
                            active_configs.append({
                                "device_id": device_id,
                                "mqtt_topic": topic.strip()
                            })

        with state_lock:
            for config in active_configs:
                topic = config['mqtt_topic']
                device_id = config['device_id']
                topic_to_device[topic] = device_id
                
                if topic not in subscribed_topics:
                    # Prevent subscribing while offline
                    if client.is_connected():
                        client.subscribe(topic)
                        subscribed_topics.add(topic)
                        print(f"[MQTT] Successfully subscribed to new topic: {topic} (Device: {device_id})")
                    else:
                        print(f"[MQTT] Offline state, subscription pending: {topic}")
                
    except Exception as e:
        print(f"[Error] Failed to update subscriptions from DB: {e}")

def update_equipment_schedules(client):
    global equipment_schedules
    try:
        response = supabase.table("app_settings").select("key, value").like("key", "sf_equip_schedule_%").execute()
        new_schedules = {}
        for row in response.data:
            key = row['key']
            val = row['value']
            # key format: sf_equip_schedule_<device_id>_<equipment_name>
            parts = key.replace("sf_equip_schedule_", "").split("_", 1)
            if len(parts) == 2:
                device_id = parts[0]
                equip_name = parts[1]
                if device_id not in new_schedules:
                    new_schedules[device_id] = {}
                new_schedules[device_id][equip_name] = val
                
        with state_lock:
            equipment_schedules = new_schedules
            
        # Subscribe to equipment state wildcard
        with state_lock:
            if "smartfarm/+/equipment/+/state" not in subscribed_topics:
                if client.is_connected():
                    client.subscribe("smartfarm/+/equipment/+/state")
                    subscribed_topics.add("smartfarm/+/equipment/+/state")
                    print("[MQTT] Subscribed to equipment state feedback topics.")
                
    except Exception as e:
        print(f"[Error] Failed to update equipment schedules: {e}")

def update_logger_statuses():
    global logger_status_map
    try:
        response = supabase.table("app_settings").select("key, value").like("key", "sf_logger_status_%").execute()
        new_statuses = {}
        for row in response.data:
            key = row['key']
            val = row['value']
            # key format: sf_logger_status_<device_id>
            device_id = key.replace("sf_logger_status_", "")
            new_statuses[device_id] = val.get("running", False) if isinstance(val, dict) else False
            
        with state_lock:
            logger_status_map.update(new_statuses)
            
    except Exception as e:
        print(f"[Error] Failed to update logger statuses: {e}")

# Background thread to refresh config every 10 seconds
def config_polling_loop(client):
    while True:
        update_subscriptions(client)
        update_equipment_schedules(client)
        update_logger_statuses()
        time.sleep(10)

def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        print(f"[MQTT] Connected to HiveMQ Broker successfully. (Host: {MQTT_HOST})")
        update_subscriptions(client)
        update_equipment_schedules(client)
        update_logger_statuses()
    else:
        print(f"[MQTT] Connection failed. Return code: {reason_code}")

def on_message(client, userdata, msg):
    topic = msg.topic
    payload_str = msg.payload.decode('utf-8')
    # 큐에 넣고 즉시 리턴 (논블로킹)
    message_queue.put((topic, payload_str))

def message_worker_loop():
    print(f"[{'='*40}]")
    print(f"[Worker] Starting background message processing worker")
    print(f"[{'='*40}]")
    while True:
        topic, payload_str = message_queue.get()

        if "/equipment/" in topic and topic.endswith("/state"):
            print(f"\n[MQTT Equip Msg Received] Topic: {topic} | Payload: {payload_str}")
            try:
                parts = topic.split("/")
                device_id = parts[1]
                equip_name = parts[3]
                state_bool = True if payload_str.strip().upper() == "ON" else False
                
                try:
                    # Check standard equipment
                    res = supabase.table("app_settings").select("value").eq("key", f"sf_equipment_status_{device_id}").execute()
                    if res.data and res.data[0].get('value'):
                        current_status = res.data[0]['value']
                        if equip_name in current_status:
                            current_status[equip_name] = state_bool
                            supabase.table("app_settings").update({"value": current_status}).eq("key", f"sf_equipment_status_{device_id}").execute()
                            print(f"[Equip State] Updated standard equip {equip_name} to {state_bool} for device {device_id}")
                            continue
                    
                    # Check custom equipment
                    res_custom = supabase.table("app_settings").select("value").eq("key", f"sf_custom_equipment_status_{device_id}").execute()
                    if res_custom.data and res_custom.data[0].get('value'):
                        current_custom = res_custom.data[0]['value']
                        current_custom[equip_name] = state_bool
                        supabase.table("app_settings").update({"value": current_custom}).eq("key", f"sf_custom_equipment_status_{device_id}").execute()
                        print(f"[Equip State] Updated custom equip {equip_name} to {state_bool} for device {device_id}")
                        
                except Exception as e:
                    print(f"[Error] Failed to update equipment state to DB: {e}")
            except Exception as e:
                print(f"[Error] Equipment state processing failed: {e}")
            continue

        try:
            # Payload parser
            try:
                data = json.loads(payload_str)
            except json.JSONDecodeError:
                data = payload_str

            if isinstance(data, dict):
                # AI가 생성한 단일 센서 포맷 ({"value": 9.14, "timestamp": 1234}) 인 경우
                # 실제 센서 이름(topic의 마지막 부분)으로 매핑을 바꿔줍니다.
                if "value" in data and len(data) <= 2:
                    metric_name = topic.split('/')[-1]
                    data = {metric_name: data["value"]}
            else:
                # 일반 숫자 문자열인 경우
                metric_name = topic.split('/')[-1]
                data = {metric_name: data}
            
            with state_lock:
                device_id = topic_to_device.get(topic)
                
            if not device_id:
                parts = topic.split('/')
                device_id = parts[1] if len(parts) >= 2 else "unknown"

            # Check if logger process is "ON" for this facility
            with state_lock:
                is_running = logger_status_map.get(device_id, False)

            if not is_running:
                # Logger is OFF for this facility, ignore incoming telemetry
                # print(f"[Skipped] Logger is OFF for {device_id}. Ignoring {topic}")
                continue

            print(f"\n[MQTT Sensor Msg Received] Topic: {topic} | Payload: {payload_str}")

            # Buffer payload for averaging per sensor
            with buffer_lock:
                if topic not in data_buffer:
                    data_buffer[topic] = {}
                    last_sync_time[topic] = {}
                    
                for k, v in data.items():
                    try:
                        if k not in data_buffer[topic]:
                            data_buffer[topic][k] = []
                            last_sync_time[topic][k] = time.time()
                        data_buffer[topic][k].append(v)
                    except Exception as e:
                        print(f"[Error] Failed to buffer individual sensor {k}: {e}")

        except Exception as e:
            print(f"[Error] Failed to process message or buffer data: {e}")

# 4. Background DB Sync Loop (Averaging logic per sensor)
def db_sync_loop():
    print(f"[{'='*40}]")
    print(f"[DB Sync] Starting per-sensor DB transmission loop (Tick: 10s)")
    print(f"[{'='*40}]")
    while True:
        time.sleep(10) # Wake up every 10 seconds for more granular check
        current_time = time.time()
        
        # Lock을 최소화하여 복사본만 추출
        extracted_data = {}
        with buffer_lock:
            for topic, sensors in list(data_buffer.items()):
                for sensor_key, values in list(sensors.items()):
                    interval_mins = SENSOR_SYNC_INTERVALS.get(sensor_key, 5)
                    last_time = last_sync_time[topic].get(sensor_key, 0)
                    
                    if (current_time - last_time) >= (interval_mins * 60):
                        if not values:
                            last_sync_time[topic][sensor_key] = current_time
                            continue
                            
                        # 복사 및 원본 비우기 (Lock 내부)
                        if topic not in extracted_data:
                            extracted_data[topic] = {}
                        extracted_data[topic][sensor_key] = list(values)
                        data_buffer[topic][sensor_key] = []
                        last_sync_time[topic][sensor_key] = current_time
                        
        # Lock 해제 후 IQR 연산 및 DB 저장 수행
        for topic, sensors_to_process in extracted_data.items():
            payload_to_send = {}
            for sensor_key, copied_values in sensors_to_process.items():
                num_vals = []
                last_non_num = None
                for v in copied_values:
                    try:
                        num_vals.append(float(v))
                    except (ValueError, TypeError):
                        last_non_num = v
                
                if not num_vals:
                    payload_to_send[sensor_key] = last_non_num
                elif len(num_vals) < 4:
                    avg = sum(num_vals) / len(num_vals)
                    payload_to_send[sensor_key] = round(avg, 2)
                else:
                    sorted_vals = sorted(num_vals)
                    q1 = sorted_vals[int(len(sorted_vals) * 0.25)]
                    q3 = sorted_vals[int(len(sorted_vals) * 0.75)]
                    iqr = q3 - q1
                    lower = q1 - (1.5 * iqr)
                    upper = q3 + (1.5 * iqr)
                    filtered = [v for v in num_vals if lower <= v <= upper]
                    if not filtered:
                        filtered = num_vals
                    avg = sum(filtered) / len(filtered)
                    payload_to_send[sensor_key] = round(avg, 2)
                    
            if payload_to_send:
                with state_lock:
                    device_id = topic_to_device.get(topic)
                if not device_id:
                    parts = topic.split('/')
                    device_id = parts[1] if len(parts) >= 2 else "unknown"

                record = {
                    "device_id": device_id,
                    "payload": payload_to_send
                }
                try:
                    supabase.table("dynamic_telemetry").insert(record).execute()
                    print(f"[DB Sync] Topic: {topic} (Device: {device_id}) -> Inserted {len(payload_to_send)} sensors: {payload_to_send}")
                except Exception as e:
                    print(f"[Error] Failed to insert data for {topic}: {e}")

def is_time_in_schedule(sched):
    if sched.get('isContinuous'):
        return True
    
    start_str = sched.get('start')
    stop_str = sched.get('stop')
    if not start_str or not stop_str:
        return False
        
    try:
        # format: "AM 08:00"
        start_time = datetime.datetime.strptime(start_str, "%p %I:%M").time()
        stop_time = datetime.datetime.strptime(stop_str, "%p %I:%M").time()
        now = datetime.datetime.now().time()
        
        if start_time <= stop_time:
            return start_time <= now <= stop_time
        else: # crosses midnight
            return now >= start_time or now <= stop_time
    except Exception:
        return False

last_published_state = {}

def equipment_control_loop(client):
    print(f"[{'='*40}]")
    print(f"[Equip Control] Starting equipment schedule control loop (Tick: 10s)")
    print(f"[{'='*40}]")
    while True:
        time.sleep(10)
        with state_lock:
            schedules_copy = {d: e.copy() for d, e in equipment_schedules.items()}
            
        for device_id, equips in schedules_copy.items():
            for equip_name, sched in equips.items():
                target_state = "ON" if is_time_in_schedule(sched) else "OFF"
                state_key = f"{device_id}/{equip_name}"
                
                if last_published_state.get(state_key) != target_state:
                    topic = f"smartfarm/{device_id}/equipment/{equip_name}/set"
                    client.publish(topic, target_state)
                    last_published_state[state_key] = target_state
                    print(f"[Equipment Control] {topic} -> {target_state}")

# 5. Simulator Loop (Runs as a background thread)
def simulator_loop(client):
    print(f"[{'='*40}]")
    print(f"[Simulator] Simulator mode enabled.")
    print(f"[Simulator] Interval: {SIMULATOR_INTERVAL} seconds")
    print(f"[{'='*40}]")
    
    while True:
        # Publish to the first mapped topic, fallback to simulator default if none exists
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

# 5. Main Execution Block
if __name__ == "__main__":
    # Explicitly define Paho-MQTT v2.0 API version
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    
    if MQTT_USERNAME and MQTT_PASSWORD:
        client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
        
    if MQTT_SCHEME in ['mqtts', 'tls', 'ssl']:
        client.tls_set()  # Enable TLS for MQTTS (Port 8883)

    client.on_connect = on_connect
    client.on_message = on_message

    client.connect(MQTT_HOST, MQTT_PORT, 60)

    # Start background polling thread for DB configuration updates
    polling_thread = threading.Thread(target=config_polling_loop, args=(client,), daemon=True)
    polling_thread.start()

    # Start message worker thread to process incoming MQTT messages
    worker_thread = threading.Thread(target=message_worker_loop, daemon=True)
    worker_thread.start()

    # Start background thread for syncing averaged DB data
    db_sync_thread = threading.Thread(target=db_sync_loop, daemon=True)
    db_sync_thread.start()

    # Start background thread for equipment control
    equip_thread = threading.Thread(target=equipment_control_loop, args=(client,), daemon=True)
    equip_thread.start()

    if USE_SIMULATOR:
        sim_thread = threading.Thread(target=simulator_loop, args=(client,), daemon=True)
        sim_thread.start()

    try:
        # Blocking call to handle network traffic, dispatch callbacks, and handle reconnects
        client.loop_forever()
    except KeyboardInterrupt:
        print("\nTerminating data logger script...")
        client.disconnect()