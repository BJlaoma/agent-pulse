const { readFileSync, existsSync } = require("fs");
const { join } = require("path");
const { homedir } = require("os");

const STATE_PATH = join(homedir(), ".config", "opencode", "agent-pulse-state.json");

function readState() {
  if (!existsSync(STATE_PATH)) {
    return null;
  }
  try {
    const raw = readFileSync(STATE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("[Agent Pulse] Failed to read state:", e.message);
    return null;
  }
}

function getStatePath() {
  return STATE_PATH;
}

module.exports = { readState, getStatePath };
