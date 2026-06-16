import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface AgentPulseConfig {
  notification: {
    enabled: boolean;
    sound: boolean;
    filter: "all" | "attention" | "none";
  };
  tray: {
    showLabel: boolean;
  };
}

const CONFIG_DIR = join(homedir(), ".config", "opencode");
const CONFIG_PATH = join(CONFIG_DIR, "agent-pulse.json");

const DEFAULT_CONFIG: AgentPulseConfig = {
  notification: {
    enabled: true,
    sound: false,
    filter: "all",
  },
  tray: {
    showLabel: true,
  },
};

export function loadConfig(): AgentPulseConfig {
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
