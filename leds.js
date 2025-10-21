// leds.js
// Handles LED toggles (Yellow, Red, Green)

import { MQTT_CONFIG, SEL } from "./config.js";
import { $ } from "./utils.js";
import State from "./state.js";
import Mqtt from "./mqtt.js";

export const LEDs = {
    initToggles() {
        const map = [
            { id: SEL.ledYellow, name: "Yellow" },
            { id: SEL.ledRed, name: "Red" },
            { id: SEL.ledGreen, name: "Green" },
        ];

        map.forEach(({ id, name }) => {
            const el = $(id);
            if (!el) return;

            el.addEventListener("change", (e) => {
                const target = /** @type {HTMLInputElement} */ e.target;
                if (State.mqtt && State.mqtt.connected && State.deviceConnected) {
                    const on = target.checked ? "on" : "off";
                    Mqtt.publish(MQTT_CONFIG.topics.ledsToggle, `${name.toLowerCase()} led ${on}`);
                } else {
                    target.checked = !target.checked;
                    alert("MQTT + Device must be connected");
                }
            });
        });
    },
};

