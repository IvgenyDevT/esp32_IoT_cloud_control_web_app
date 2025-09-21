let ledOn = false;

function toggleLed() {
  ledOn = !ledOn;
  const status = document.getElementById("led-status");
  status.textContent = ledOn ? "ON" : "OFF";
  status.style.color = ledOn ? "green" : "red";
}