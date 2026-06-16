import type { PluginInput, Hooks } from "@opencode-ai/plugin";
import type { Event } from "@opencode-ai/sdk";
import { spawn, type ChildProcess } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { appendFileSync } from "fs";
import { mapEventToState, getDisconnectedState } from "./hooks.js";
import { writeState } from "./state.js";
import { loadConfig } from "./config.js";

let trayProcess: ChildProcess | null = null;

const __dirname = dirname(fileURLToPath(import.meta.url));
const TRAY_SCRIPT = join(__dirname, "..", "tray", "index.js");

function logToFile(level: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logPath = join(process.env.HOME || process.env.USERPROFILE || "", ".config", "opencode", "agent-pulse-debug.log");
  const line = `[${timestamp}] [PLUGIN] [${level}] ${message}${data ? " | " + JSON.stringify(data) : ""}\n`;
  try {
    appendFileSync(logPath, line);
  } catch (e) {
    // Silently fail - no console output
  }
}

function startTray() {
  const config = loadConfig();
  logToFile("INFO", "Starting tray process", { config });
  
  trayProcess = spawn("node", [TRAY_SCRIPT], {
    detached: false,
    stdio: "pipe",
    env: {
      ...process.env,
      AGENT_PULSE_CONFIG: JSON.stringify(config),
    },
  });

  logToFile("INFO", "Tray process spawned", { pid: trayProcess.pid });

  trayProcess.stdout?.on("data", (data) => {
    const msg = data.toString().trim();
    logToFile("INFO", `Tray stdout: ${msg}`);
  });

  trayProcess.stderr?.on("data", (data) => {
    const msg = data.toString().trim();
    logToFile("ERROR", `Tray stderr: ${msg}`);
  });

  trayProcess.on("exit", (code, signal) => {
    logToFile("WARN", "Tray process exited", { code, signal });
    trayProcess = null;
  });

  trayProcess.on("error", (err) => {
    logToFile("ERROR", "Tray process error", { error: err.message });
  });

}

function stopTray() {
  if (trayProcess) {
    logToFile("INFO", "Stopping tray process", { pid: trayProcess.pid });
    trayProcess.kill();
    trayProcess = null;
  }
}

export default async function (input: PluginInput): Promise<Hooks> {
  logToFile("INFO", "Plugin loaded, starting tray");
  
  startTray();

  return {
    event: async ({ event }: { event: Event }) => {
      logToFile("DEBUG", "Received event", { type: event.type });
      const state = mapEventToState(event);
      if (state) {
        logToFile("INFO", "State mapped from event", { eventType: event.type, newState: state });
        writeState(state);
        logToFile("INFO", "State written to file");
      } else {
        logToFile("DEBUG", "Event ignored (no state mapping)", { type: event.type });
      }
    },

    dispose: async () => {
      logToFile("INFO", "Plugin unloading (dispose called)");
      writeState(getDisconnectedState());
      stopTray();
      logToFile("INFO", "Plugin disposed");
    },
  };
}
