let ledOn = false;
let client; // משתנה גלובלי ל-MQTT client

// ===== MQTT connection details =====
const broker = "wss://2a7e41fb3049421ba6af414adaf4f849.s1.eu.hivemq.cloud:8884/mqtt"; 
// שים לב: wss:// זה WebSocket מאובטח, לא mqtts://

const options = {
  username: "JekaDeGever",
  password: "J1qwe321",
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 4000
};

// ===== OTA URL קבוע כרגע =====
const OTA_URL = "https://ivgenydevt.github.io/esp32_dashboard_proj/firmware/firmware.bin";

// פונקציה להתחברות MQTT
function connectMQTT() {
  document.getElementById("status-indicator").style.backgroundColor = "yellow"; // צהוב = מתחבר

  client = mqtt.connect(broker, options);

  client.on("connect", () => {
    console.log("Connected to HiveMQ broker");
    document.getElementById("status-indicator").style.backgroundColor = "green"; // ירוק = מחובר

    // נרשמים ל-Topic
    client.subscribe("Jeka", (err) => {
      if (!err) {
        console.log("Subscribed to topic Jeka");
      }
    });
    client.subscribe("ota/progress", (err) => {
      if (!err) {
        console.log("Subscribed to topic ota/progress");
      }
    });
  });

  client.on("error", (err) => {
    console.error("Connection error: ", err);
    document.getElementById("status-indicator").style.backgroundColor = "red"; // אדום = בעיה
  });

  client.on("close", () => {
    console.warn("Disconnected from broker");
    document.getElementById("status-indicator").style.backgroundColor = "red"; // אדום = מנותק
  });

  // כשמגיעה הודעה מ-ESP32
  client.on("message", (topic, message) => {
    console.log("Received:", topic, message.toString());

    if (topic === "Jeka") {
      const status = document.getElementById("led-status");
      status.textContent = message.toString();
      status.style.color = message.toString() === "ON" ? "green" : "red";
    }

    if (topic === "ota/progress") {
      document.getElementById("ota-status").textContent =
        "OTA Status: " + message.toString();
    }
  });
}

// כפתור LED
function toggleLed() {
  ledOn = !ledOn;
  const status = document.getElementById("led-status");
  status.textContent = ledOn ? "ON" : "OFF";
  status.style.color = ledOn ? "green" : "red";
  status.style.fontWeight = "bold";

  if (client && client.connected) {
    const message = ledOn ? "red led on" : "red led off";
    client.publish("Jeka", message);
    console.log("Published:", message);
  } else {
    console.warn("Not connected to MQTT broker");
  }
}

// כפתור OTA
function startOTA() {
  if (client && client.connected) {
    client.publish("Jeka", OTA_URL);
    document.getElementById("ota-status").textContent =
      "OTA Status: Update triggered";
    console.log("OTA URL sent:", OTA_URL);
  } else {
    console.warn("Not connected to MQTT broker");
    document.getElementById("ota-status").textContent =
      "OTA Status: MQTT not connected!";
  }
}