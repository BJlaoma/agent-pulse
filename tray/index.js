const { watchFile, unwatchFile, statSync } = require("fs");
const { join } = require("path");
const { spawn } = require("child_process");
const { readState, getStatePath } = require("./state.js");
const { loadConfig } = require("./config.js");
const { createTray, updateTray, killTray } = require("./tray.js");
const { notify } = require("./notifier.js");
const logger = require("./logger.js");

let currentStatus = null;
let currentLabel = null;
let isExiting = false;
let stateFileWatcher = null;

function handleStateChange(reason) {
  logger.debug("handleStateChange called", { reason, isExiting });
  if (isExiting) {
    logger.debug("Already exiting, skipping state change");
    return;
  }

  const state = readState();
  if (!state) {
    logger.debug("No state file found yet");
    return;
  }

  const { status, label } = state;
  logger.debug("Read state", { status, label, currentStatus, currentLabel });

  // Only update if status changed
  if (status === currentStatus && label === currentLabel) {
    logger.debug("Status unchanged, skipping");
    return;
  }

  currentStatus = status;
  currentLabel = label;

  const config = loadConfig();
  logger.debug("Loaded config", { config });

  // Update tray
  try {
    updateTray(status, label, () => {
      if (isExiting) return;
      isExiting = true;
      logger.info("Tray exit requested by user (clicked exit menu)");
      process.exit(0);
    }, () => {
      // Open config file
      const configPath = join(require("os").homedir(), ".config", "opencode", "agent-pulse.json");
      logger.info("Opening config file", { configPath });
      try {
        if (process.platform === "win32") {
          spawn("notepad", [configPath], { detached: true });
        } else {
          require("fs").open(configPath, "r", () => {});
        }
      } catch (e) {
        logger.error("Failed to open config", { error: e.message });
      }
    });
    logger.info("Tray updated", { status, label });
  } catch (e) {
    logger.error("Failed to update tray", { error: e.message, stack: e.stack });
  }

  // Send notification
  try {
    notify(status, label, config);
    logger.info("Notification sent", { status, label });
  } catch (e) {
    logger.error("Failed to send notification", { error: e.message });
  }

  logger.info(`Status changed: ${status} - ${label}`);
}

function main() {
  logger.info("Tray process starting", { pid: process.pid, platform: process.platform });

  const config = loadConfig();
  logger.info("Config loaded", { config });

  // Initial state read
  handleStateChange("initial");

  // Use watchFile for more stable cross-platform file watching
  const statePath = getStatePath();
  logger.info("Setting up file watcher", { statePath });

  try {
    // Check if state file exists first
    if (!statSync(statePath, { throwIfNoEntry: false })) {
      logger.info("State file does not exist yet, will watch when created");
    }

    stateFileWatcher = watchFile(statePath, { interval: 500 }, (curr, prev) => {
      logger.debug("watchFile callback triggered", { 
        currMtime: curr.mtime, 
        prevMtime: prev.mtime, 
        changed: curr.mtime !== prev.mtime 
      });
      if (curr.mtime !== prev.mtime) {
        handleStateChange("file_changed");
      }
    });

    logger.info("File watcher started", { statePath });

    // Handle process termination
    process.on("SIGINT", () => {
      logger.info("SIGINT received, shutting down gracefully");
      isExiting = true;
      if (stateFileWatcher) {
        unwatchFile(statePath);
      }
      killTray();
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      logger.info("SIGTERM received, shutting down gracefully");
      isExiting = true;
      if (stateFileWatcher) {
        unwatchFile(statePath);
      }
      killTray();
      process.exit(0);
    });

    process.on("uncaughtException", (err) => {
      logger.error("Uncaught exception", { error: err.message, stack: err.stack });
      isExiting = true;
      if (stateFileWatcher) {
        unwatchFile(statePath);
      }
      killTray();
      process.exit(1);
    });

    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled rejection", { reason, promise: promise.toString() });
    });

    process.on("beforeExit", (code) => {
      logger.info("Process beforeExit", { code });
    });

    process.on("exit", (code) => {
      logger.info("Process exit", { code, isExiting });
    });

  } catch (e) {
    logger.error("Failed to watch state file", { error: e.message, stack: e.stack });
    logger.info("Switching to polling fallback");
    
    // Fallback: poll every 1 second
    setInterval(() => handleStateChange("poll"), 1000);
  }

  logger.info("Tray process main loop started");
}

main();
