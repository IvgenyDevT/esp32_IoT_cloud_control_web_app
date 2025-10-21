// device.js
// Handles device connectivity and info parsing (mirrors original monolith behavior)

import { MQTT_CONFIG, DEVICE_LABELS, SEL } from "./config.js";
import State from "./state.js";
import { Dom } from "./utils.js";
import { Indicators } from "./ui.js";
import Mqtt from "./mqtt.js";

export const Device = {
    /**
     * Parse single line from firmware and update UI cards.
     * Also reacts to "device connected" / "status changed" by re-checking.
     */
    handleDeviceStatus(msg) {
        // Firmware sometimes sends a signal to re-query full status
        if (msg === "device connected" || msg === "status changed") {
            Device.checkConnection().then(() => undefined);
            return;
        }

        // Parse "Key: Value" lines exactly like in your original code
        for (const label of DEVICE_LABELS) {
            if (msg.startsWith(label)) {
                const holder = document.getElementById(label);
                if (!holder) continue;

                const value = msg.replace(label, "").trim();
                if (label === "WiFi SSID:") {
                    State.currentSsid = value;
                }
                holder.innerHTML = `${label} <span class="text-gray-900 font-medium">${value}</span>`;
            }
        }

        // If we were waiting for a response (checkConnection), resolve success
        if (State.resumeWait) {
            State.resumeWait(true);
        }
    },

    /**
     * Ask device for status and wait up to 5s for first info line.
     * Returns Promise<boolean> indicating whether device responded.
     */
    checkConnection() {
        return new Promise((resolve) => {
            // Guard: MQTT must be connected
            if (!State.mqtt || !State.mqtt.connected) {
                alert("MQTT not connected");
                State.deviceConnected = false;
                return resolve(false);
            }

            // Update UI while checking
            Indicators.setDeviceChecking();
            State.wifiCreds = []; // clear previous list (same as monolith)

            // Ask device to publish its status
            Mqtt.publish(MQTT_CONFIG.topics.askDeviceStatus, "check_connection");

            // Set resolver that will be called once the first info arrives
            State.resumeWait = (ok) => {
                if (ok) {
                    Indicators.setDeviceConnected();
                    State.deviceConnected = true;
                } else {
                    Indicators.setDeviceNotFound();
                    State.deviceConnected = false;
                }
                resolve(State.deviceConnected);
                State.resumeWait = null; // cleanup
            };

            // Fallback timeout (same timing as your original)
            setTimeout(() => {
                if (State.resumeWait) State.resumeWait(false);
            }, 5000);
        });
    },
};

