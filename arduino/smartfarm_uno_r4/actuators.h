#ifndef ACTUATORS_H
#define ACTUATORS_H

// 액추에이터의 현재 상태를 관리하는 구조체
// 웹 대시보드에서 MQTT를 통해 이 상태를 변경하는 명령을 수신합니다.
struct ActuatorState
{
    bool led_on = false;
    bool fan_on = false;
    bool pump_on = false;
};

// 액추에이터 초기화 및 제어 함수 선언
void initActuators();
void updateActuators(ActuatorState state);

#endif // ACTUATORS_H