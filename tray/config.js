const { readFileSync, writeFileSync, existsSync, mkdirSync } = require("fs");
const { join } = require("path");
const { homedir } = require("os");

const CONFIG_DIR = join(homedir(), ".config", "opencode");
const CONFIG_PATH = join(CONFIG_DIR, "agent-pulse.json");

const DEFAULT_CONFIG = {
  notification: {
    enabled: true,
    sound: false,
    filter: "all",
    position: "bottom-right",
    duration: 5000,
    width: 320,
    height: 100,
  },
  tray: {
    showLabel: true,
  },
};

function loadConfig() {
  if (!existsSync(CONFIG_PATH)) {
    return DEFAULT_CONFIG;
  }
  try {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      notification: {
        ...DEFAULT_CONFIG.notification,
        ...parsed.notification,
      },
      tray: {
        ...DEFAULT_CONFIG.tray,
        ...parsed.tray,
      },
    };
  } catch (e) {
    console.error("[Agent Pulse] Failed to load config:", e.message);
    return DEFAULT_CONFIG;
  }
}

function saveConfig(config) {
  try {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error("[Agent Pulse] Failed to save config:", e.message);
  }
}

module.exports = { loadConfig, saveConfig, DEFAULT_CONFIG };
