const notifier = require("node-notifier");
const { join } = require("path");
const { exec } = require("child_process");
const { showCustomNotification } = require("./notifier-custom.js");
const logger = require("./logger.js");

const SOUND_PATH = join(__dirname, "..", "assets", "ping.wav");

const MIN_NOTIFY_INTERVAL = 1000; // 1s debounce
let lastNotifyTime = 0;

// Status to icon color mapping
const STATUS_ICON_MAP = {
  thinking: "green",
  idle: "green",
  waiting: "yellow",
  error: "red",
  disconnected: "gray",
};

function notify(status, label, body, config) {
  if (!config.notification.enabled) {
    return;
  }

  // notifyOn: only notify for configured statuses
  const allowedStatuses = config.notification.notifyOn || ["thinking", "idle", "waiting", "error", "disconnected"];
  if (!allowedStatuses.includes(status)) {
    logger.debug("Notification skipped (not in notifyOn)", { status, notifyOn: allowedStatuses });
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

  const now = Date.now();
  // Debounce: skip if too soon after last notification (unless priority status)
  const isPriority = status === "waiting" || status === "error";
  if (now - lastNotifyTime < MIN_NOTIFY_INTERVAL && !isPriority) {
    logger.debug("Notification skipped (debounce)", { status, sinceLast: now - lastNotifyTime });
    return;
  }
  lastNotifyTime = now;

  const iconColor = STATUS_ICON_MAP[status] || "gray";

  // Native notification (reliable), custom (experimental) when style=custom
  if (config.notification.style === "custom") {
    try {
      showCustomNotification("Agent Pulse", label, body || "", iconColor, config);
    } catch (e) {
      logger.error("Custom notification failed, falling back to native", { error: e.message });
      fallbackNotify(status, label);
    }
  } else {
    fallbackNotify(status, label);
  }

  // Play sound via PowerShell (silent, no GUI player)
  if (config.notification.sound) {
    const psCmd = `(New-Object System.Media.SoundPlayer '${SOUND_PATH}').PlaySync()`;
    exec(`powershell -NoProfile -WindowStyle Hidden -Command "${psCmd}"`, (err) => {
      if (err) {
        logger.error("Sound playback failed", { error: err.message });
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
