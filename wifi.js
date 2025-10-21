// wifi.js
// Handles WiFi scanning, credential management, and connection logic

import { MQTT_CONFIG, SEL } from "./config.js";
import { $, Dom, Toast, sleep } from "./utils.js";
import State from "./state.js";
import Mqtt from "./mqtt.js";
import Device from "./device.js";

export const WiFi = {
    scan() {
        if (!State.mqtt || !State.mqtt.connected) {
            alert("MQTT must be connected");
            return;
        }
        if (!State.deviceConnected) {
            alert("device not connected");
            return;
        }

        const container = $(SEL.wifiList);
        if (container) {
            container.innerHTML = `
        <div class="flex items-center gap-2 text-gray-600">
          <span>Scanning...</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
              stroke-width="1.5" stroke="currentColor" class="animate-ping size-4">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 0 1 1.06 0Z" />
          </svg>
        </div>`;
        }

        Mqtt.publish(MQTT_CONFIG.topics.askScan, "NULLarg");
    },

    handleScanResult(msg) {
        try {
            const networks = JSON.parse(msg);
            WiFi.renderNetworkList(networks);
        } catch (e) {
            console.error("Invalid WiFi scan data", e);
        }
    },

    handleCredListLine(msg) {
        const ssidMatch = msg.match(/ssid:\s*([^]+?)(?=\s*pass:|$)/);
        const passMatch = msg.match(/pass:\s*(.*)$/);
        const ssid = ssidMatch ? ssidMatch[1].trim() : null;
        const pass = passMatch ? passMatch[1].trim() : null;
        if (ssid) {
            State.wifiCreds.push({ ssid, pass: pass || null });
        }
    },

    renderNetworkList(list) {
        const container = $(SEL.wifiList);
        if (!container) return;
        container.innerHTML = "";

        list.forEach((net) => {
            const div = document.createElement("div");
            div.className = "p-3 bg-white rounded-lg shadow flex justify-between items-center";
            div.innerHTML = `
        <span>${net.ssid} (${net.rssi} dBm)</span>
        <button
          class="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded connect-btn"
          data-ssid="${net.ssid}">
          Connect
        </button>
      `;

            const btn = div.querySelector("button");
            if (net.ssid === State.currentSsid) {
                div.style.backgroundColor = "#e0f7fa";
                btn.disabled = true;
                btn.textContent = "Connected";
                btn.classList.remove("bg-indigo-600", "hover:bg-indigo-500");
                btn.classList.add("bg-green-400", "cursor-not-allowed");
            }

            container.appendChild(div);
        });

        container.querySelectorAll(".connect-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const ssid = btn.getAttribute("data-ssid") || "";
                WiFi._openOrAutoConnect(btn, ssid);
            });
        });
    },

    _openOrAutoConnect(btn, ssid) {
        const ssidInput = $(SEL.wifiSsidInput);
        const passInput = $(SEL.wifiPassInput);
        const modal = $(SEL.wifiModal);
        if (!ssidInput || !passInput || !modal) return;

        ssidInput.value = ssid;

        const known = State.wifiCreds.find((c) => c.ssid === ssid);
        if (known && known.pass) {
            passInput.value = known.pass;
            modal.style.display = "none";
            btn.disabled = true;
            btn.textContent = "Connecting...";
            WiFi.connectNewWifi();
        } else {
            passInput.value = "";
            modal.style.display = "flex";
        }
    },

    closeModal() {
        const modal = $(SEL.wifiModal);
        if (modal) modal.style.display = "none";
    },

    connectNewWifi() {
        const ssid = ($(SEL.wifiSsidInput)?.value || "").trim();
        const pass = ($(SEL.wifiPassInput)?.value || "").trim();
        if (!ssid) return alert("SSID required");

        Dom.setText(SEL.wifiConnectBtn, "Connecting...");
        $(SEL.wifiConnectBtn)?.setAttribute("disabled", "true");
        $(SEL.wifiCancelBtn)?.setAttribute("disabled", "true");
        const cancel = $(SEL.wifiCancelBtn);
        if (cancel) cancel.style.backgroundColor = "gray";

        Mqtt.publish(MQTT_CONFIG.topics.askConnectNewWifi, `${ssid}|${pass}`);
        State.pendingNewSsid = ssid;
        State.pendingNewPass = pass;

        if (State.connectNewWifiTimeout) clearTimeout(State.connectNewWifiTimeout);
        State.connectNewWifiTimeout = window.setTimeout(() => {
            Toast.show("Connection failed (timeout)", 3500);
            Dom.setText(SEL.wifiConnectBtn, "Connect");
            $(SEL.wifiConnectBtn)?.removeAttribute("disabled");
            const cancelBtn = $(SEL.wifiCancelBtn);
            if (cancelBtn) cancelBtn.hidden = true;
            WiFi.closeModal();
            Device.checkConnection();
        }, 60000);
    },

    async handleWifiConnectStatus(msg) {
        if (State.connectNewWifiTimeout) clearTimeout(State.connectNewWifiTimeout);
        $(SEL.wifiConnectBtn)?.removeAttribute("disabled");

        const resetModalButtons = () => {
            Dom.setText(SEL.wifiConnectBtn, "Connect");
            $(SEL.wifiConnectBtn)?.removeAttribute("disabled");
            const cancel = $(SEL.wifiCancelBtn);
            if (cancel) {
                cancel.removeAttribute("disabled");
                cancel.hidden = false;
            }
        };

        if (msg === "new wifi connected") {
            const exists = State.wifiCreds.some((c) => c.ssid === State.pendingNewSsid);
            if (!exists) State.wifiCreds.push({ ssid: State.pendingNewSsid, pass: State.pendingNewPass });

            let ok = false;
            for (let i = 0; i < 3 && !ok; i++) {
                ok = await Device.checkConnection();
            }

            if (ok) {
                await WiFi.scan();
                Toast.show(`Connected to WiFi: ${State.pendingNewSsid}`, 6500);
            } else {
                Toast.show("Connected to WiFi, but device not responding", 6500);
            }
            WiFi.closeModal();
            resetModalButtons();
            return;
        }

        if (msg === "new wifi not connected - wrong password") {
            resetModalButtons();
            Toast.show("Wrong password", 4000);

            await sleep(4000);
            let ok = false;
            for (let i = 0; i < 3 && !ok; i++) {
                ok = await Device.checkConnection();
            }
            if (ok) {
                await WiFi.scan();
                Toast.show(`wifi reconnected back to WiFi : ${State.currentSsid}`, 4500);
            } else {
                Toast.show("lost connection, device not responding", 4500);
            }
            return;
        }

        if (msg === "new wifi not connected - other reason") {
            resetModalButtons();
            Toast.show(`failed to connect to WiFi: ${State.pendingNewSsid}`, 3000);

            await sleep(3000);
            let ok = false;
            for (let i = 0; i < 3 && !ok; i++) {
                ok = await Device.checkConnection();
            }
            if (ok) {
                await WiFi.scan();
                Toast.show(`wifi reconnected back to WiFi : ${State.currentSsid}`, 4500);
            } else {
                Toast.show("lost connection, device not responding", 4500);
            }
            WiFi.closeModal();
            return;
        }
    },
};

