import type { PluginInput, Hooks } from "@opencode-ai/plugin";
import type { Event } from "@opencode-ai/sdk";
import { tool } from "@opencode-ai/plugin";
import { spawn, type ChildProcess } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { appendFileSync, readFileSync, statSync, writeFileSync, existsSync } from "fs";
import { mapEventToState, getDisconnectedState } from "./hooks.js";
import { writeState } from "./state.js";
import { loadConfig } from "./config.js";

let trayProcess: ChildProcess | null = null;

const __dirname = dirname(fileURLToPath(import.meta.url));
const TRAY_SCRIPT = join(__dirname, "..", "tray", "index.js");
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB

function logToFile(level: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logPath = join(process.env.HOME || process.env.USERPROFILE || "", ".config", "opencode", "agent-pulse-debug.log");
  const line = `[${timestamp}] [PLUGIN] [${level}] ${message}${data ? " | " + JSON.stringify(data) : ""}\n`;
  try {
    // Check size before writing
    if (existsSync(logPath)) {
      const stats = statSync(logPath);
      if (stats.size > MAX_LOG_SIZE) {
        const content = readFileSync(logPath, "utf-8");
        const keepSize = 1024 * 1024; // 1MB
        const truncated = content.slice(-keepSize);
        const index = truncated.indexOf("\n");
        const cleanStart = index > 0 ? truncated.slice(index + 1) : truncated;
        writeFileSync(logPath, `[${new Date().toISOString()}] [PLUGIN] [INFO] Log truncated due to size limit\n` + cleanStart);
      }
    }
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

    "permission.ask": async (permission, output) => {
      logToFile("INFO", "Permission asked", { permission: permission.title, type: permission.type });
      // Set waiting state while user is deciding
      writeState({
        status: "waiting",
        label: "需要权限确认",
        timestamp: Date.now(),
        sessionID: permission.sessionID,
      });
      // Allow opencode to proceed with asking user
      output.status = "ask";
    },

    dispose: async () => {
      logToFile("INFO", "Plugin unloading (dispose called)");
      writeState(getDisconnectedState());
      stopTray();
      logToFile("INFO", "Plugin disposed");
    },

    tool: {
      "agent-pulse-status": tool({
        description: "Get the current status of Agent Pulse (AI status indicator)",
        args: {},
        async execute() {
          const config = loadConfig();
          const status = trayProcess !== null && !trayProcess.killed;
          return {
            output: `Agent Pulse Status:\n- Tray running: ${status}\n- Notifications: ${config.notification.enabled ? "enabled" : "disabled"}\n- Sound: ${config.notification.sound ? "on" : "off"}\n- Filter: ${config.notification.filter}\n- Position: ${config.notification.position}`,
            metadata: {
              trayRunning: status,
              config: config.notification,
            },
          };
        },
      }),
      "agent-pulse-config": tool({
        description: "Update Agent Pulse configuration (notification settings, position, etc.)",
        args: {
          enabled: tool.schema.boolean().optional().describe("Enable/disable notifications"),
          sound: tool.schema.boolean().optional().describe("Enable/disable sound"),
          filter: tool.schema.enum(["all", "attention", "none"]).optional().describe("Notification filter"),
          position: tool.schema.enum(["bottom-left", "bottom-right", "top-left", "top-right"]).optional().describe("Notification position"),
          duration: tool.schema.number().optional().describe("Notification duration in ms"),
        },
        async execute(args) {
          const config = loadConfig();
          const newConfig = {
            ...config,
            notification: {
              ...config.notification,
              ...args,
            },
          };
          // Save to file
          const { saveConfig } = await import("./config.js");
          saveConfig(newConfig);
          return {
            output: `Configuration updated successfully.\nNew settings:\n- Enabled: ${newConfig.notification.enabled}\n- Sound: ${newConfig.notification.sound}\n- Filter: ${newConfig.notification.filter}\n- Position: ${newConfig.notification.position}`,
            metadata: {
              config: newConfig.notification,
            },
          };
        },
      }),
      "agent-pulse-restart": tool({
        description: "Restart the Agent Pulse tray process",
        args: {},
        async execute() {
          logToFile("INFO", "Restarting tray process via tool");
          stopTray();
          // Wait a bit then start
          await new Promise(resolve => setTimeout(resolve, 500));
          startTray();
          return {
            output: "Agent Pulse tray process restarted successfully.",
            metadata: {
              restarted: true,
              pid: trayProcess?.pid,
            },
          };
        },
      }),
    },
  };
}
