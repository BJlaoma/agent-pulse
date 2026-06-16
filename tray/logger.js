const { appendFileSync, existsSync, mkdirSync } = require("fs");
const { join } = require("path");
const { homedir } = require("os");

const LOG_DIR = join(homedir(), ".config", "opencode");
const LOG_PATH = join(LOG_DIR, "agent-pulse-debug.log");

let logInitialized = false;

function initLog() {
  if (logInitialized) return;
  try {
    if (!existsSync(LOG_DIR)) {
      mkdirSync(LOG_DIR, { recursive: true });
    }
    appendFileSync(LOG_PATH, `\n[${new Date().toISOString()}] ========== NEW SESSION ==========\n`);
    logInitialized = true;
  } catch (e) {
    // Silently fail - no console output
  }
}

function log(level, message, data) {
  initLog();
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level}] ${message}${data ? " | " + JSON.stringify(data) : ""}\n`;
  try {
    appendFileSync(LOG_PATH, line);
  } catch (e) {
    // Silently fail - no console output
  }
}

module.exports = {
  debug: (msg, data) => log("DEBUG", msg, data),
  info: (msg, data) => log("INFO", msg, data),
  warn: (msg, data) => log("WARN", msg, data),
  error: (msg, data) => log("ERROR", msg, data),
};
