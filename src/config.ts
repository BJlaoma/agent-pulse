import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface AgentPulseConfig {
    notification: {
    enabled: boolean;
    sound: boolean;
    filter: "all" | "attention" | "none";
    notifyOn: AgentStatus[];
    style: "native" | "custom";
    position: "bottom-left" | "bottom-right" | "top-left" | "top-right";
    duration: number;
    width: number;
    height: number;
  };
  tray: {
    showLabel: boolean;
  };
}

import type { AgentStatus } from "./state.js";

const CONFIG_DIR = join(homedir(), ".config", "opencode");
const CONFIG_PATH = join(CONFIG_DIR, "agent-pulse.json");

const DEFAULT_CONFIG: AgentPulseConfig = {
  notification: {
    enabled: true,
    sound: false,
    filter: "all",
    notifyOn: ["thinking", "idle", "waiting", "error", "disconnected"],
    style: "custom",
    position: "bottom-right",
    duration: 5000,
    width: 320,
    height: 100,
  },
  tray: {
    showLabel: true,
  },
};

export function loadConfig(): AgentPulseConfig {
  if (!existsSync(CONFIG_PATH)) {
    saveConfig(DEFAULT_CONFIG);
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
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: AgentPulseConfig): void {
  try {
    if (!existsSync(CONFIG_DIR)) {
      return;
    }
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error("[Agent Pulse] Failed to save config:", e);
  }
}

export { DEFAULT_CONFIG };
