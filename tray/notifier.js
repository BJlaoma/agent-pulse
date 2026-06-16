const notifier = require("node-notifier");
const player = require("play-sound")();
const { join } = require("path");
const { showCustomNotification } = require("./notifier-custom.js");
const logger = require("./logger.js");

const SOUND_PATH = join(__dirname, "..", "assets", "ping.wav");

// Status to icon color mapping
const STATUS_ICON_MAP = {
  thinking: "green",
  idle: "green",
  waiting: "yellow",
  error: "red",
  disconnected: "gray",
};

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

  const iconColor = STATUS_ICON_MAP[status] || "gray";

  // Native notification (reliable), custom (experimental) when style=custom
  if (config.notification.style === "custom") {
    try {
      showCustomNotification("Agent Pulse", label, iconColor, config);
    } catch (e) {
      logger.error("Custom notification failed, falling back to native", { error: e.message });
      fallbackNotify(status, label);
    }
  } else {
    fallbackNotify(status, label);
  }

  // Play sound
  if (config.notification.sound) {
    player.play(SOUND_PATH, (err) => {
      if (err) {
        // Silently fail
      }
    });
  }
}

function fallbackNotify(status, label) {
  const iconPath = join(__dirname, "..", "assets", "icons", `${status}.ico`);
  notifier.notify({
    title: "Agent Pulse",
    message: label,
    icon: iconPath,
    sound: false,
    appID: "Agent Pulse",
  });
}

module.exports = { notify };
