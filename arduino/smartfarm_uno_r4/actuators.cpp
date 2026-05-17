#include "actuators.h"
#include <Arduino.h>

// hardware.md에 정의된 핀 번호 할당
#define LED_PIN 3
#define FAN_PIN 4
#define PUMP_PIN 5

void initActuators()
{
    pinMode(LED_PIN, OUTPUT);
    pinMode(FAN_PIN, OUTPUT);
    pinMode(PUMP_PIN, OUTPUT);

    // 부팅 시 모든 액추에이터를 OFF 상태로 초기화 (Active HIGH 기준)
    digitalWrite(LED_PIN, LOW);
    digitalWrite(FAN_PIN, LOW);
    digitalWrite(PUMP_PIN, LOW);
}

void updateActuators(ActuatorState state)
{
    digitalWrite(LED_PIN, state.led_on ? HIGH : LOW);
    digitalWrite(FAN_PIN, state.fan_on ? HIGH : LOW);
    digitalWrite(PUMP_PIN, state.pump_on ? HIGH : LOW);
}