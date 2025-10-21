// lcd.js
// Handles LCD text sending via MQTT

import { MQTT_CONFIG, SEL } from "./config.js";
import { $ } from "./utils.js";
import State from "./state.js";
import Mqtt from "./mqtt.js";

export const LCD = {
    sendText() {
        const input = $(SEL.lcdInput);
        if (!input) return;

        const text = input.value.trim();
        if (!text) {
            alert("Please enter text for LCD");
            return;
        }

        if (!State.mqtt || !State.mqtt.connected || !State.deviceConnected) {
            alert("MQTT + Device must be connected");
            return;
        }

        Mqtt.publish(MQTT_CONFIG.topics.askLcd, text);
        input.value = "";
    },
};

