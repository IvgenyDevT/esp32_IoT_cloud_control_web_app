/* ============================================================================
 *  Dashboard App (Production-Ready)
 *  - Single entry point, clean architecture
 *  - Strong separation of concerns (UI, MQTT, features)
 *  - Public API preserved via window.App.* (so your HTML keeps working)
 *  - Defensive coding, robust state handling, rich inline documentation
 * ========================================================================== */

(() => {
    "use strict";

    /* ------------------------------------------------------------------------
     * Constants & Config
     * ---------------------------------------------------------------------- */

    /** MQTT broker and connection options */
    const MQTT_CONFIG = {
        brokerUrl: "wss://2a7e41fb3049421ba6af414adaf4f849.s1.eu.hivemq.cloud:8884/mqtt",
        options: {
            username: "JekaDeGever",
            password: "J1qwe321",
            clean: true,
            connectTimeout: 5000,
            reconnectPeriod: 4000
        },
        topics: {
            otaProgress: "OTA_update_progress",
            scanResult: "scan_wifi_result",
            wifiConnection: "wifi_connection",          // (subscribed in original code)
            deviceStatus: "device_connection_status",
            wifiConnectStatus: "wifi_connection_status",
            wifiCredList: "wifi_cred_list",
            askDeviceStatus: "Get_device_connection_status",
            askScan: "scan_wifi_nets",
            askLcd: "LCD_display",
            askOta: "OTA_update",
            askConnectNewWifi: "connect_new_wifi",
            ledsToggle: "leds_toggle"
        }
    };

    /** Selectors used across UI */
    const SEL = {
        sections: ".section",
        sidebar: "#sidebar",
        overlay: "#overlay",
        menuBtn: "#menu-btn",

        // Global indicators
        mqttStatus: "#mqtt-status",
        statusIndicator: "#status-indicator",
        deviceStatus: "#device-status",
        deviceIndicator: "#device-indicator",

        globalMqttStatus: "#global-mqtt-status",
        globalMqttIndicator: "#global-mqtt-indicator",
        globalDeviceStatus: "#global-device-status",
        globalDeviceIndicator: "#global-device-indicator",

        // Connect button spinner
        connectBtnSpinner: "#connect-btn-svg",

        // Device info cards - keyed by their visible text label
        deviceInfoContainer: "#device-info",

        // OTA
        otaStatus: "#ota-status",
        otaProgress: "#ota-progress",
        otaPercent: "#ota-percent",
        firmwareBtn: "#firmware-button",
        firmwareMenu: "#firmware-menu",
        firmwareMenuList: "#firmware-menu .py-1",
        firmwareSelected: "#firmware-selected",

        // WiFi
        wifiList: "#wifi-list",
        wifiModal: "#wifi-modal",
        wifiSsidInput: "#wifi-ssid",
        wifiPassInput: "#wifi-password",
        wifiConnectBtn: "#wifi-connect-btn",
        wifiCancelBtn: "#new-wifi-cancel-btn",

        // LCD
        lcdInput: "#lcd-text",

        // Device connection spinner
        checkEspSpinner: "#check-esp-con-btn-svg",

        // LED toggles
        ledYellow: "#Yellow",
        ledRed: "#Red",
        ledGreen: "#Green"
    };

    /** Labels the device publishes over MQTT (must match your firmware) */
    const DEVICE_LABELS = [
        "Device Name:",
        "Firmware:",
        "WiFi SSID:",
        "IP Address:",
        "MAC Address:",
        "RSSI:"
    ];

    /** Firmware list source (GitHub) */
    const FIRMWARE_SOURCE = {
        api: "https://api.github.com/repos/ivgenydevt/esp32_IoT_cloud_control_web_app/contents/firmware",
        cdn: "https://ivgenydevt.github.io/esp32_IoT_cloud_control_web_app/firmware/"
    };

    /** Utility: safe element getter */
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    /* ------------------------------------------------------------------------
     * State
     * ---------------------------------------------------------------------- */

    const State = {
        mqtt: /** @type {import("mqtt").MqttClient|null} */ (null),
        deviceConnected: false,
        wifiCreds: /** @type {Array<{ssid:string, pass:string|null}>>} */ ([]),
        currentSsid: "",
        pendingNewSsid: "",
        pendingNewPass: "",
        connectNewWifiTimeout: /** @type {number|null} */ (null),
        resumeWait: /** @type {((ok:boolean)=>void)|null} */ (null) // resolver for device-check flow
    };

    /* ------------------------------------------------------------------------
     * Utilities
     * ---------------------------------------------------------------------- */

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    const Toast = {
        show(message, duration = 2000) {
            const toast = document.createElement("div");
            toast.className = "toast";
            toast.textContent = message;
            document.body.appendChild(toast);
            // trigger animation
            setTimeout(() => toast.classList.add("show"), 50);
            setTimeout(() => {
                toast.classList.remove("show");
                setTimeout(() => document.body.removeChild(toast), 300);
            }, duration);
        }
    };

    const Dom = {
        setText(sel, text) {
            const el = $(sel);
            if (el) el.textContent = text;
        },
        setColor(sel, color) {
            const el = $(sel);
            if (el) el.style.color = color;
        },
        setBg(sel, color) {
            const el = $(sel);
            if (el) el.style.backgroundColor = color;
        },
        addClass(sel, cls) {
            const el = $(sel);
            if (el) el.classList.add(cls);
        },
        removeClass(sel, cls) {
            const el = $(sel);
            if (el) el.classList.remove(cls);
        },
        toggleClass(sel, cls) {
            const el = $(sel);
            if (el) el.classList.toggle(cls);
        }
    };

    /* ------------------------------------------------------------------------
     * UI: Sidebar / Sections
     * ---------------------------------------------------------------------- */

    const Sidebar = {
        init() {
            const sidebar = $(SEL.sidebar);
            const overlay = $(SEL.overlay);
            const menuBtn = $(SEL.menuBtn);
            if (!sidebar || !overlay || !menuBtn) return;

            menuBtn.addEventListener("click", () => {
                Dom.toggleClass(SEL.sidebar, "-translate-x-full");
                Dom.toggleClass(SEL.overlay, "hidden");
            });
            overlay.addEventListener("click", () => {
                Dom.addClass(SEL.sidebar, "-translate-x-full");
                Dom.addClass(SEL.overlay, "hidden");
            });
        },
        close() {
            Dom.addClass(SEL.sidebar, "-translate-x-full");
            Dom.addClass(SEL.overlay, "hidden");
        }
    };

    const Sections = {
        show(id) {
            $$(SEL.sections).forEach((s) => s.classList.add("hidden"));
            const target = document.getElementById(id);
            if (target) target.classList.remove("hidden");
            Sidebar.close();
        }
    };

    /* ------------------------------------------------------------------------
     * UI: Global indicators (mirrors local status to top bar)
     * ---------------------------------------------------------------------- */

    const Indicators = {
        syncGlobal() {
            const mqttStatusEl = $(SEL.mqttStatus);
            const deviceStatusEl = $(SEL.deviceStatus);
            if (!mqttStatusEl || !deviceStatusEl) return;

            // text
            Dom.setText(SEL.globalMqttStatus, mqttStatusEl.textContent || "");
            Dom.setText(SEL.globalDeviceStatus, deviceStatusEl.textContent || "");

            // text colors
            Dom.setColor(SEL.globalMqttStatus, mqttStatusEl.style.color || "");
            Dom.setColor(SEL.globalDeviceStatus, deviceStatusEl.style.color || "");

            // LED dots (backgrounds)
            const localMqttDot = $(SEL.statusIndicator);
            const localDeviceDot = $(SEL.deviceIndicator);
            if (localMqttDot) Dom.setBg(SEL.globalMqttIndicator, localMqttDot.style.backgroundColor || "");
            if (localDeviceDot) Dom.setBg(SEL.globalDeviceIndicator, localDeviceDot.style.backgroundColor || "");
        },

        setMqttConnecting() {
            Dom.setBg(SEL.statusIndicator, "yellow");
            Dom.setText(SEL.mqttStatus, "Connecting...");
            Dom.setColor(SEL.mqttStatus, "black");
            Dom.removeClass(SEL.connectBtnSpinner, "hidden");
            Indicators.syncGlobal();
        },

        setMqttConnected() {
            Dom.addClass(SEL.connectBtnSpinner, "hidden");
            Dom.setBg(SEL.statusIndicator, "green");
            Dom.setText(SEL.mqttStatus, "Connected");
            Dom.setColor(SEL.mqttStatus, "green");
            Indicators.syncGlobal();
        },

        setMqttDisconnected() {
            Dom.addClass(SEL.connectBtnSpinner, "hidden");
            Dom.setBg(SEL.statusIndicator, "red");
            Dom.setText(SEL.mqttStatus, "Not connected");
            Dom.setColor(SEL.mqttStatus, "red");
            Indicators.syncGlobal();
        },

        setDeviceChecking() {
            Dom.removeClass(SEL.checkEspSpinner, "hidden");
            Dom.setText(SEL.deviceStatus, "Checking...");
            Dom.setBg(SEL.deviceIndicator, "yellow");
            // reset last info values
            $(`${SEL.deviceInfoContainer}`).querySelectorAll("span").forEach((s) => (s.textContent = "---"));
            Indicators.syncGlobal();
        },

        setDeviceConnected() {
            Dom.addClass(SEL.checkEspSpinner, "hidden");
            Dom.setText(SEL.deviceStatus, "Connected");
            Dom.setColor(SEL.deviceStatus, "green");
            Dom.setBg(SEL.deviceIndicator, "green");
            Indicators.syncGlobal();
        },

        setDeviceNotFound() {
            Dom.addClass(SEL.checkEspSpinner, "hidden");
            Dom.setText(SEL.deviceStatus, "Device not found");
            Dom.setColor(SEL.deviceStatus, "red");
            Dom.setBg(SEL.deviceIndicator, "red");
            Indicators.syncGlobal();
        }
    };

    /* ------------------------------------------------------------------------
     * Service: MQTT
     * ---------------------------------------------------------------------- */

    const Mqtt = {
        connect() {
            if (State.mqtt && State.mqtt.connected) return;
            if (!window.mqtt) {
                alert("mqtt.js library not loaded");
                return;
            }

            Indicators.setMqttConnecting();
            State.mqtt = mqtt.connect(MQTT_CONFIG.brokerUrl, MQTT_CONFIG.options);

            // timeout guard
            const timeout = setTimeout(() => {
                alert("Failed to connect MQTT service");
                Indicators.setMqttDisconnected();
            }, 15000);

            State.mqtt.on("connect", () => {
                clearTimeout(timeout);
                Indicators.setMqttConnected();

                // subscribe topics
                [
                    MQTT_CONFIG.topics.otaProgress,
                    MQTT_CONFIG.topics.scanResult,
                    MQTT_CONFIG.topics.wifiConnection,
                    MQTT_CONFIG.topics.deviceStatus,
                    MQTT_CONFIG.topics.wifiConnectStatus,
                    MQTT_CONFIG.topics.wifiCredList
                ].forEach((t) => State.mqtt?.subscribe(t));

                // ensure single handler instance
                State.mqtt?.removeAllListeners("message");
                State.mqtt?.on("message", (topic, payload) => Mqtt._onMessage(topic, payload));
            });

            State.mqtt.on("error", () => {
                clearTimeout(timeout);
                alert("Failed to connect MQTT service");
                Indicators.setMqttDisconnected();
            });
        },

        publish(topic, msg) {
            if (!State.mqtt || !State.mqtt.connected) return false;
            State.mqtt.publish(topic, msg);
            return true;
        },

        _onMessage(topic, message) {
            const msg = message.toString();
            console.log("[MQTT] topic:", topic, "msg:", msg);

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
                    // keep silent on unrelated topics
                    break;
            }
        }
    };

    /* ------------------------------------------------------------------------
     * Feature: Device info / connectivity
     * ---------------------------------------------------------------------- */

    const Device = {
        /** Parse device info lines and update UI */
        handleDeviceStatus(msg) {
            // device says: "device connected" or "status changed"
            if (msg === "device connected" || msg === "status changed") {
                // ask full info again
                Device.checkConnection().then(() => undefined);
                return;
            }

            // parse static key: value lines
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

            // if we were waiting, resolve as success
            if (State.resumeWait) {
                State.resumeWait(true);
            }
        },

        /** Send "check connection" and wait for data or fallback */
        checkConnection() {
            return new Promise((resolve) => {
                if (!State.mqtt || !State.mqtt.connected) {
                    alert("MQTT not connected");
                    State.deviceConnected = false;
                    return resolve(false);
                }

                Indicators.setDeviceChecking();
                State.wifiCreds = []; // clear old list

                // ask
                Mqtt.publish(MQTT_CONFIG.topics.askDeviceStatus, "check_connection");

                // provide resolver that will be called once first info arrives
                State.resumeWait = (ok) => {
                    if (ok) {
                        Indicators.setDeviceConnected();
                        State.deviceConnected = true;
                    } else {
                        Indicators.setDeviceNotFound();
                        State.deviceConnected = false;
                    }
                    resolve(State.deviceConnected);
                    State.resumeWait = null;
                };

                // fallback timeout
                setTimeout(() => {
                    if (State.resumeWait) State.resumeWait(false);
                }, 5000);
            });
        }
    };

    /* ------------------------------------------------------------------------
     * Feature: OTA
     * ---------------------------------------------------------------------- */

    const Ota = {
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
            const p = $(SEL.otaProgress);
            const txt = $(SEL.otaPercent);
            if (p) p.value = 0;
            if (txt) txt.textContent = "0%";

            Mqtt.publish(MQTT_CONFIG.topics.askOta, url);
        },

        handleOtaProgress(msg) {
            if (msg.includes("Progress")) {
                Dom.setText(SEL.otaStatus, "OTA Status: installing new firmware ...");
            } else {
                Dom.setText(SEL.otaStatus, `OTA Status: ${msg}`);
            }

            // parse 10% etc
            const match = msg.match(/(\d+)%/);
            if (match) {
                const val = parseInt(match[1], 10);
                const p = $(SEL.otaProgress);
                const t = $(SEL.otaPercent);
                if (p) p.value = val;
                if (t) t.textContent = `${val}%`;
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
        }
    };

    /* ------------------------------------------------------------------------
     * Feature: LCD
     * ---------------------------------------------------------------------- */

    const LCD = {
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
        }
    };

    /* ------------------------------------------------------------------------
     * Feature: WiFi
     * ---------------------------------------------------------------------- */

    const WiFi = {
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

        /** List of APs received */
        handleScanResult(msg) {
            try {
                const networks = JSON.parse(msg);
                WiFi.renderNetworkList(networks);
            } catch (e) {
                console.error("Invalid WiFi scan data", e);
            }
        },

        /** Each line "ssid:<X> pass:<Y>" from firmware */
        handleCredListLine(msg) {
            // parse flexible "ssid: <name> pass: <pwd>"
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

            // attach handlers
            container.querySelectorAll(".connect-btn").forEach((btn) => {
                btn.addEventListener("click", () => {
                    const ssid = btn.getAttribute("data-ssid") || "";
                    WiFi._openOrAutoConnect(btn, ssid);
                });
            });
        },

        /** Try auto-connect if we already have password; else show modal */
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

        /** User pressed Connect in modal */
        connectNewWifi() {
            const ssid = ($(SEL.wifiSsidInput)?.value || "").trim();
            const pass = ($(SEL.wifiPassInput)?.value || "").trim();
            if (!ssid) return alert("SSID required");

            // update UI buttons
            Dom.setText(SEL.wifiConnectBtn, "Connecting...");
            $(SEL.wifiConnectBtn)?.setAttribute("disabled", "true");
            $(SEL.wifiCancelBtn)?.setAttribute("disabled", "true");
            const cancel = $(SEL.wifiCancelBtn);
            if (cancel) cancel.style.backgroundColor = "gray";

            // publish connect request
            Mqtt.publish(MQTT_CONFIG.topics.askConnectNewWifi, `${ssid}|${pass}`);
            State.pendingNewSsid = ssid;
            State.pendingNewPass = pass;

            // timeout guard
            if (State.connectNewWifiTimeout) clearTimeout(State.connectNewWifiTimeout);
            State.connectNewWifiTimeout = window.setTimeout(() => {
                Toast.show("Connection failed (timeout)", 3500);
                Dom.setText(SEL.wifiConnectBtn, "Connect");
                $(SEL.wifiConnectBtn)?.removeAttribute("disabled");
                // hide cancel after timeout (original behavior)
                const cancelBtn = $(SEL.wifiCancelBtn);
                if (cancelBtn) cancelBtn.hidden = true;
                WiFi.closeModal();
                Device.checkConnection();
            }, 60000);
        },

        /** Messages for connection result */
        async handleWifiConnectStatus(msg) {
            // always clear timeout + re-enable button
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
                // ensure we keep creds in memory for next time
                const exists = State.wifiCreds.some((c) => c.ssid === State.pendingNewSsid);
                if (!exists) State.wifiCreds.push({ ssid: State.pendingNewSsid, pass: State.pendingNewPass });

                // wait until device reconnects and answer
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
                // keep modal open for retry
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
        }
    };

    /* ------------------------------------------------------------------------
     * Feature: LEDs
     * ---------------------------------------------------------------------- */

    const LEDs = {
        initToggles() {
            const map = [
                { id: SEL.ledYellow, name: "Yellow" },
                { id: SEL.ledRed, name: "Red" },
                { id: SEL.ledGreen, name: "Green" }
            ];

            map.forEach(({ id, name }) => {
                const el = $(id);
                if (!el) return;
                el.addEventListener("change", (e) => {
                    const target = /** @type {HTMLInputElement} */ (e.target);
                    if (State.mqtt && State.mqtt.connected && State.deviceConnected) {
                        const on = target.checked ? "on" : "off";
                        Mqtt.publish(MQTT_CONFIG.topics.ledsToggle, `${name.toLowerCase()} led ${on}`);
                    } else {
                        // roll back toggle and notify
                        target.checked = !target.checked;
                        alert("MQTT + Device must be connected");
                    }
                });
            });
        }
    };

    /* ------------------------------------------------------------------------
     * Public API (keeps your current HTML working)
     * ---------------------------------------------------------------------- */

    const App = {
        // navigation
        showSection: (id) => Sections.show(id),

        // MQTT lifecycle
        connectMQTT: () => Mqtt.connect(),

        // device connectivity
        checkDeviceConnection: () => Device.checkConnection(),

        // features
        startOTA: () => Ota.start(),
        scanWiFi: () => WiFi.scan(),
        sendLCDText: () => LCD.sendText(),
        closeWiFiModal: () => WiFi.closeModal(),
        connectNewWifi: () => WiFi.connectNewWifi()
    };

    // expose for HTML onclick handlers
    window.App = App;

    /* ------------------------------------------------------------------------
     * Bootstrap
     * ---------------------------------------------------------------------- */

    document.addEventListener("DOMContentLoaded", () => {
        // layout
        Sidebar.init();
        Sections.show("home");

        // firmware dropdown + list
        Ota.initMenuToggle();
        Ota.loadFirmwareList();

        // LEDs
        LEDs.initToggles();

        // in case you want to auto-connect or restore state later, we keep it manual for now
        // App.connectMQTT();
    });
})();