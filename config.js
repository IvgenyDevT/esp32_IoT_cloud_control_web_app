export const MQTT_CONFIG = {
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
        wifiConnection: "wifi_connection",
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

export const SEL = {
    sections: ".section",
    sidebar: "#sidebar",
    overlay: "#overlay",
    menuBtn: "#menu-btn",
    mqttStatus: "#mqtt-status",
    statusIndicator: "#status-indicator",
    deviceStatus: "#device-status",
    deviceIndicator: "#device-indicator",
    globalMqttStatus: "#global-mqtt-status",
    globalMqttIndicator: "#global-mqtt-indicator",
    globalDeviceStatus: "#global-device-status",
    globalDeviceIndicator: "#global-device-indicator",
    connectBtnSpinner: "#connect-btn-svg",
    deviceInfoContainer: "#device-info",
    otaStatus: "#ota-status",
    otaProgress: "#ota-progress",
    otaPercent: "#ota-percent",
    firmwareBtn: "#firmware-button",
    firmwareMenu: "#firmware-menu",
    firmwareMenuList: "#firmware-menu .py-1",
    firmwareSelected: "#firmware-selected",
    wifiList: "#wifi-list",
    wifiModal: "#wifi-modal",
    wifiSsidInput: "#wifi-ssid",
    wifiPassInput: "#wifi-password",
    wifiConnectBtn: "#wifi-connect-btn",
    wifiCancelBtn: "#new-wifi-cancel-btn",
    lcdInput: "#lcd-text",
    checkEspSpinner: "#check-esp-con-btn-svg",
    ledYellow: "#Yellow",
    ledRed: "#Red",
    ledGreen: "#Green"
};

export const DEVICE_LABELS = [
    "Device Name:",
    "Firmware:",
    "WiFi SSID:",
    "IP Address:",
    "MAC Address:",
    "RSSI:"
];

export const FIRMWARE_SOURCE = {
    api: "https://api.github.com/repos/ivgenydevt/esp32_IoT_cloud_control_web_app/contents/firmware",
    cdn: "https://ivgenydevt.github.io/esp32_IoT_cloud_control_web_app/firmware/"
};