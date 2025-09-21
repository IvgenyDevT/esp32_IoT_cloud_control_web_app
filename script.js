let ledOn = false;
let client; // ניצור משתנה גלובלי ל-MQTT client

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

// פונקציה להתחברות עם כפתור
function connectMQTT() {
  document.getElementById("status-indicator").style.backgroundColor = "yellow"; // צהוב = מתחבר

  client = mqtt.connect(broker, options);

  client.on("connect", () => {
    console.log("Connected to HiveMQ broker");
    document.getElementById("status-indicator").style.backgroundColor = "green"; // ירוק = מחובר

    // נרשם ל-Topic
    client.subscribe("Jeka", (err) => {
      if (!err) {
        console.log("Subscribed to topic Jeka");
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
    const status = document.getElementById("led-status");
    status.textContent = message.toString();
    status.style.color = message.toString() === "ON" ? "green" : "red";
  });
}

// כפתור LED שלך - נשאר אותו דבר
function toggleLed() {
  ledOn = !ledOn;
  const status = document.getElementById("led-status");
  status.textContent = ledOn ? "ON" : "OFF";
  status.style.color = ledOn ? "green" : "red";
  status.style.fontWeight = "bold";

  // אם יש חיבור ל-MQTT → נשלח הודעה ל-ESP32
  if (client && client.connected) {
    client.publish("Jeka", ledOn ? "ON" : "OFF");
  }
}