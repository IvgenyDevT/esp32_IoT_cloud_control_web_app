import { Sidebar, Sections } from "./ui.js";
import { Mqtt } from "./mqtt.js";
import { Device } from "./device.js";
import { Ota } from "./ota.js";
import { WiFi } from "./wifi.js";
import { LCD } from "./lcd.js";
import { LEDs } from "./leds.js";

window.App = {
    showSection: (id) => Sections.show(id),
    connectMQTT: () => Mqtt.connect(),
    checkDeviceConnection: () => Device.checkConnection(),
    startOTA: () => Ota.start(),
    scanWiFi: () => WiFi.scan(),
    sendLCDText: () => LCD.sendText(),
    closeWiFiModal: () => WiFi.closeModal(),
    connectNewWifi: () => WiFi.connectNewWifi()
};

document.addEventListener("DOMContentLoaded", () => {
    Sidebar.init();
    Sections.show("home");
    Ota.initMenuToggle();
    Ota.loadFirmwareList();
    LEDs.initToggles();
});


