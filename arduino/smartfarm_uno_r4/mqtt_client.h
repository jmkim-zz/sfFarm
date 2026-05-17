#ifndef MQTT_CLIENT_H
#define MQTT_CLIENT_H

#include "sensors.h"
#include "actuators.h"

extern ActuatorState currentActuatorState;

void setupWiFi();
void setupMQTT();
void loopMQTT();
void publishSensorData(SensorData data);
void publishActuatorState();

#endif // MQTT_CLIENT_H