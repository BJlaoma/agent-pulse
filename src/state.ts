import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export type AgentStatus = "idle" | "thinking" | "waiting" | "error" | "disconnected";

export interface AgentState {
  status: AgentStatus;
  label: string;
  timestamp: number;
  sessionID?: string;
  body?: string;
}

const STATE_DIR = join(homedir(), ".config", "opencode");
const STATE_PATH = join(STATE_DIR, "agent-pulse-state.json");

export function writeState(state: AgentState): void {
  try {
    if (!existsSync(STATE_DIR)) {
      mkdirSync(STATE_DIR, { recursive: true });
    }
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error("[Agent Pulse] Failed to write state:", e);
  }
}

export function getStatePath(): string {
  return STATE_PATH;
}
