import os
import json
import time
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

# Global variables for dynamic subscription management
subscribed_topics = set()
topic_to_device = {}
state_lock = threading.Lock()  # Thread lock for thread-safe operations

# 2. Read configuration from DB and process dynamic subscriptions
def update_subscriptions(client):
    global subscribed_topics, topic_to_device
    try:
        # Query active hardware pin configurations containing MQTT topics from app_settings
        response = supabase.table("app_settings").select("value").eq("key", "sf_hardware_pins").execute()
        
        if not response.data:
            print("[MQTT] No hardware configuration found in DB.")
            return

        settings = response.data[0].get("value", {})
        pin_mqtt_topics = settings.get("pinMqttTopics", {})
        default_device_id = "pooh"

        active_configs = []
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

# Background thread to refresh config every 1 minute
def config_polling_loop(client):
    while True:
        update_subscriptions(client)
        time.sleep(60)

# 3. MQTT Callback Functions (Compatible with Paho-MQTT v2.0)
def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        print(f"[MQTT] Connected to HiveMQ Broker successfully. (Host: {MQTT_HOST})")
        update_subscriptions(client)
    else:
        print(f"[MQTT] Connection failed. Return code: {reason_code}")

def on_message(client, userdata, msg):
    topic = msg.topic
    payload_str = msg.payload.decode('utf-8')
    print(f"\n[MQTT Msg Received] Topic: {topic} | Payload: {payload_str}")

    try:
        # Payload parser
        # The sensor data might be a raw float (e.g., "25.50") or a JSON string.
        # Try decoding as JSON first.
        try:
            data = json.loads(payload_str)
        except json.JSONDecodeError:
            # If not a valid JSON, treat it as a raw string/number
            data = payload_str

        # Prevent JSONB data type mismatch (wrap in dict if it's not a dictionary)
        if not isinstance(data, dict):
            # Infer metric name from topic suffix (e.g. smartfarm/pooh/temp -> temp)
            metric_name = topic.split('/')[-1]
            data = {metric_name: data}
        
        # Identify device_id by topic (fallback to URL extraction if not mapped in DB)
        with state_lock:
            device_id = topic_to_device.get(topic)
            
        if not device_id:
            parts = topic.split('/')
            device_id = parts[1] if len(parts) >= 2 else "unknown"

        # Insert payload directly into JSONB field
        record = {
            "device_id": device_id,
            "payload": data
        }
        response = supabase.table("dynamic_telemetry").insert(record).execute()
        print(f"[DB Inserted] Device: {device_id} -> dynamic_telemetry insertion successful")

    except Exception as e:
        print(f"[Error] Failed to process message or insert into DB: {e}")

# 4. Simulator Loop (Runs as a background thread)
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

    if USE_SIMULATOR:
        sim_thread = threading.Thread(target=simulator_loop, args=(client,), daemon=True)
        sim_thread.start()

    try:
        # Blocking call to handle network traffic, dispatch callbacks, and handle reconnects
        client.loop_forever()
    except KeyboardInterrupt:
        print("\nTerminating data logger script...")
        client.disconnect()