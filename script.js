let ledOn = false;

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

// נתחבר ל-Broker
const client = mqtt.connect(broker, options);

client.on("connect", () => {
  console.log("Connected to HiveMQ broker");

  // נרשם ל-Topic
  client.subscribe("Jeka", (err) => {
    if (!err) {
      console.log("Subscribed to topic Jeka");
    }
  });
});

// כשמגיעה הודעה מ-ESP32
client.on("message", (topic, message) => {
  console.log("Received:", topic, message.toString());
  const status = document.getElementById("led-status");
  status.textContent = message.toString();
  status.style.color = message.toString() === "ON" ? "green" : "red";
});



function toggleLed() {
  ledOn = !ledOn;
  const status = document.getElementById("led-status");
  status.textContent = ledOn ? "ON" : "OFF";
  status.style.color = ledOn ? "green" : "red";
  status.style.fontWeight = "bold";
}