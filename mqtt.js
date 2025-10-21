import { State } from "./state.js";
import { MQTT_CONFIG } from "./config.js";
import { Indicators } from "./ui.js";
import { Ota } from "./ota.js";
import { Device } from "./device.js";
import { WiFi } from "./wifi.js";

export const Mqtt = {
    connect() {
        if (State.mqtt && State.mqtt.connected) return;
        if (!window.mqtt) return alert("mqtt.js not loaded");

        Indicators.setMqttConnecting();
        State.mqtt = mqtt.connect(MQTT_CONFIG.brokerUrl, MQTT_CONFIG.options);

        const timeout = setTimeout(() => {
            alert("Failed to connect MQTT");
            Indicators.setMqttDisconnected();
        }, 15000);

        State.mqtt.on("connect", () => {
            clearTimeout(timeout);
            Indicators.setMqttConnected();

            [
                MQTT_CONFIG.topics.otaProgress,
                MQTT_CONFIG.topics.scanResult,
                MQTT_CONFIG.topics.wifiConnection,
                MQTT_CONFIG.topics.deviceStatus,
                MQTT_CONFIG.topics.wifiConnectStatus,
                MQTT_CONFIG.topics.wifiCredList
            ].forEach((t) => State.mqtt.subscribe(t));

            State.mqtt.removeAllListeners("message");
            State.mqtt.on("message", (topic, payload) =>
                Mqtt._onMessage(topic, payload)
            );
        });

        State.mqtt.on("error", () => {
            clearTimeout(timeout);
            alert("MQTT error");
            Indicators.setMqttDisconnected();
        });
    },

    publish(topic, msg) {
        if (!State.mqtt || !State.mqtt.connected) return false;
        State.mqtt.publish(topic, msg);
        return true;
    },

    _onMessage(topic, payload) {
        const msg = payload.toString();
        console.log("[MQTT]", topic, msg);

        switch (topic) {
            case MQTT_CONFIG.topics.otaProgress:
                Ota.handleOtaProgress(msg);
                break;
            case MQTT_CONFIG.topics.deviceStatus:
                Device.handleDeviceStatus(msg);
                break;
            case MQTT_CONFIG.topics.scanResult:
                WiFi.handleScanResult(msg);
                break;
            case MQTT_CONFIG.topics.wifiConnectStatus:
                WiFi.handleWifiConnectStatus(msg);
                break;
            case MQTT_CONFIG.topics.wifiCredList:
                WiFi.handleCredListLine(msg);
                break;
            default:
                break;
        }
    }
};