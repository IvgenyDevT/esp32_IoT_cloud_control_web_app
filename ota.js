// ota.js
// Handles OTA update process and firmware version list

import { MQTT_CONFIG, FIRMWARE_SOURCE, SEL } from "./config.js";
import { $, Dom } from "./utils.js";
import State from "./state.js";
import Mqtt from "./mqtt.js";
import Device from "./device.js";

export const Ota = {
    async start() {
        if (!State.mqtt || !State.mqtt.connected) {
            alert("MQTT must be connected");
            Dom.setText(SEL.otaStatus, "OTA Status: Not connected (MQTT + Device required)");
            return;
        }

        await Device.checkConnection();
        if (!State.deviceConnected) {
            alert("Cannot start OTA: Device not connected");
            Dom.setText(SEL.otaStatus, "Device not connected");
            return;
        }

        const selected = $(SEL.firmwareSelected);
        const url = selected?.getAttribute("data-url");
        if (!url) {
            alert("Please select firmware version first!");
            return;
        }

        Dom.setText(SEL.otaStatus, "OTA Status: Triggered");
        const progress = $(SEL.otaProgress);
        const percent = $(SEL.otaPercent);
        if (progress) progress.value = 0;
        if (percent) percent.textContent = "0%";

        Mqtt.publish(MQTT_CONFIG.topics.askOta, url);
    },

    handleOtaProgress(msg) {
        if (msg.includes("Progress")) {
            Dom.setText(SEL.otaStatus, "OTA Status: installing new firmware ...");
        } else {
            Dom.setText(SEL.otaStatus, `OTA Status: ${msg}`);
        }

        const match = msg.match(/(\d+)%/);
        if (match) {
            const val = parseInt(match[1], 10);
            const progress = $(SEL.otaProgress);
            const percent = $(SEL.otaPercent);
            if (progress) progress.value = val;
            if (percent) percent.textContent = `${val}%`;
        }

        if (msg.includes("restarting")) {
            Device.checkConnection();
        }
    },

    async loadFirmwareList() {
        try {
            const res = await fetch(FIRMWARE_SOURCE.api);
            const files = await res.json();
            const menu = $(SEL.firmwareMenuList);
            if (!menu) return;
            menu.innerHTML = "";

            files.forEach((file) => {
                if (!file.name.endsWith(".bin")) return;

                const a = document.createElement("a");
                a.href = "#";
                a.textContent = file.name;
                a.className = "block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100";
                a.setAttribute("data-url", FIRMWARE_SOURCE.cdn + file.name);
                a.addEventListener("click", (e) => {
                    e.preventDefault();
                    const sel = $(SEL.firmwareSelected);
                    if (sel) {
                        sel.textContent = file.name;
                        sel.setAttribute("data-url", a.getAttribute("data-url") || "");
                    }
                    Dom.addClass(SEL.firmwareMenu, "hidden");
                });
                menu.appendChild(a);
            });
        } catch (e) {
            console.error("Failed to load firmware list", e);
        }
    },

    initMenuToggle() {
        const btn = $(SEL.firmwareBtn);
        const menu = $(SEL.firmwareMenu);
        if (!btn || !menu) return;
        btn.addEventListener("click", () => {
            menu.classList.toggle("hidden");
        });
    },
};

