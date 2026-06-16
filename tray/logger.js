const { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } = require("fs");
const { join } = require("path");
const { homedir } = require("os");

const LOG_DIR = join(homedir(), ".config", "opencode");
const LOG_PATH = join(LOG_DIR, "agent-pulse-debug.log");
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB

let logInitialized = false;

function checkLogSize() {
  try {
    if (!existsSync(LOG_PATH)) return;
    const stats = statSync(LOG_PATH);
    if (stats.size > MAX_LOG_SIZE) {
      // Truncate: keep last 1MB of content
      const content = readFileSync(LOG_PATH, "utf-8");
      const keepSize = 1024 * 1024; // 1MB
      const truncated = content.slice(-keepSize);
      const index = truncated.indexOf("\n");
      const cleanStart = index > 0 ? truncated.slice(index + 1) : truncated;
      writeFileSync(LOG_PATH, `[${new Date().toISOString()}] [INFO] Log truncated due to size limit\n` + cleanStart);
    }
  } catch (e) {
    // Silently fail
  }
}

function initLog() {
  if (logInitialized) return;
  try {
    if (!existsSync(LOG_DIR)) {
      mkdirSync(LOG_DIR, { recursive: true });
    }
    checkLogSize();
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
