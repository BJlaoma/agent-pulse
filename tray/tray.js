const SysTray = require("systray").default || require("systray");
const { readFileSync, writeFileSync, unlinkSync } = require("fs");
const { join } = require("path");
const { tmpdir } = require("os");
const { exec } = require("child_process");
const logger = require("./logger.js");

// Status to icon color mapping
const STATUS_ICON_MAP = {
  thinking: "green",
  idle: "green",
  waiting: "yellow",
  error: "red",
  disconnected: "gray",
};

function iconToBase64(iconPath) {
  const buffer = readFileSync(iconPath);
  return buffer.toString("base64");
}

let currentTray = null;

function focusOpenCode() {
  const scriptPath = join(tmpdir(), "agent-pulse-focus.ps1");
  const psScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WF {
  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
  public static bool Focus(IntPtr h) {
    if (IsIconic(h)) ShowWindow(h, 9);
    return SetForegroundWindow(h);
  }
}
"@ -ReferencedAssemblies System
$proc = Get-Process WindowsTerminal -ErrorAction SilentlyContinue | Where-Object MainWindowHandle | Select-Object -First 1
if ($proc) { [WF]::Focus($proc.MainWindowHandle) } else { exit 1 }
`;
  try {
    writeFileSync(scriptPath, psScript);
    exec(`powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "${scriptPath}"`, (err) => {
      try { unlinkSync(scriptPath); } catch (e) {}
      if (err) logger.warn("Focus opencode failed", { error: err.message });
    });
  } catch (e) {
    logger.warn("Focus opencode script error", { error: e.message });
  }
}

function createTray(status, label, onExit, onOpenConfig, onToggleNotify, onSettings, onUninstall) {
  if (currentTray) {
    try {
      currentTray.kill(false);
    } catch (e) {}
  }

  const iconName = STATUS_ICON_MAP[status] || "gray";
  const iconPath = join(__dirname, "..", "assets", "icons", `${iconName}.ico`);
  const iconBase64 = iconToBase64(iconPath);
  
  // Load config for notification toggle state
  let notifyEnabled = true;
  try {
    const config = require("./config.js").loadConfig();
    notifyEnabled = config.notification.enabled;
  } catch (e) {}

  const systray = new SysTray({
    menu: {
      icon: iconBase64,
      title: "Agent Pulse",
      tooltip: `Agent Pulse - ${label}`,
      items: [
        {
          title: `状态: ${label}`,
          tooltip: "",
          checked: false,
          enabled: false,
        },
        {
          title: "──────────────",
          tooltip: "",
          checked: false,
          enabled: false,
        },
        {
          title: notifyEnabled ? "🔔 暂停通知" : "🔕 恢复通知",
          tooltip: "Toggle notifications",
          checked: false,
          enabled: true,
        },
        {
          title: "📺 聚焦 opencode",
          tooltip: "Bring opencode window to foreground",
          checked: false,
          enabled: true,
        },
        {
          title: "⚙ 设置",
          tooltip: "Open settings panel",
          checked: false,
          enabled: true,
        },
        {
          title: "⚙ 打开配置",
          tooltip: "Open configuration file",
          checked: false,
          enabled: true,
        },
        {
          title: "退出",
          tooltip: "Exit Agent Pulse",
          checked: false,
          enabled: true,
        },
        {
          title: "──────────────",
          tooltip: "",
          checked: false,
          enabled: false,
        },
        {
          title: "卸载 Agent Pulse",
          tooltip: "Remove plugin from opencode",
          checked: false,
          enabled: true,
        },
      ],
    },
    debug: false,
    copyDir: true,
  });

  systray.onClick(action => {
    const title = action.item.title;
    if (title.includes("退出")) {
      systray.kill();
      onExit();
    } else if (title === "⚙ 设置") {
      onSettings();
    } else if (title.includes("打开配置")) {
      onOpenConfig();
    } else if (title.includes("聚焦 opencode")) {
      focusOpenCode();
    } else if (title.includes("暂停通知") || title.includes("恢复通知")) {
      onToggleNotify(!notifyEnabled);
      systray.kill(false);
    } else if (title.includes("卸载")) {
      onUninstall();
    }
  });

  systray.onExit(code => {
    console.log(`[Agent Pulse] Tray exited with code ${code}`);
  });

  currentTray = systray;
  return systray;
}

function updateTray(status, label, onExit, onOpenConfig, onToggleNotify, onSettings, onUninstall) {
  createTray(status, label, onExit, onOpenConfig, onToggleNotify, onSettings, onUninstall);
}

function killTray() {
  if (currentTray) {
    try {
      currentTray.kill(false);
    } catch (e) {}
    currentTray = null;
  }
}

module.exports = { createTray, updateTray, killTray };
