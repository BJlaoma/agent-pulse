const notifier = require("node-notifier");
const player = require("play-sound")();
const { join } = require("path");

const SOUND_PATH = join(__dirname, "..", "assets", "ping.wav");

function notify(status, label, config) {
  if (!config.notification.enabled) {
    return;
  }

  // Filter logic
  if (config.notification.filter === "attention") {
    if (status !== "waiting" && status !== "error") {
      return;
    }
  } else if (config.notification.filter === "none") {
    return;
  }

  const iconPath = join(__dirname, "..", "assets", "icons", `${status}.ico`);

  // Windows Toast notification
  notifier.notify({
    title: "Agent Pulse",
    message: label,
    icon: iconPath,
    sound: false,
    appID: "Agent Pulse",
  });

  // Play sound
  if (config.notification.sound) {
    player.play(SOUND_PATH, (err) => {
      if (err) {
        console.error("[Agent Pulse] Sound play failed:", err.message);
      }
    });
  }
}

module.exports = { notify };
