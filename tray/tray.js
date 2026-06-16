const SysTray = require("systray").default || require("systray");
const { readFileSync } = require("fs");
const { join } = require("path");

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

function createTray(status, label, onExit, onOpenConfig) {
  if (currentTray) {
    try {
      currentTray.kill(false); // false = don't exit node process
    } catch (e) {
      // Ignore
    }
  }

  const iconName = STATUS_ICON_MAP[status] || "gray";
  const iconPath = join(__dirname, "..", "assets", "icons", `${iconName}.ico`);
  const iconBase64 = iconToBase64(iconPath);
  
  const systray = new SysTray({
    menu: {
      icon: iconBase64,
      title: "Agent Pulse",
      tooltip: `Agent Pulse - ${label}`,
      items: [
        {
          title: `当前状态: ${label}`,
          tooltip: "Current status",
          checked: false,
          enabled: false,
        },
        {
          title: "打开配置",
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
      ],
    },
    debug: false,
    copyDir: true,
  });

  systray.onClick(action => {
    if (action.item.title === "退出") {
      systray.kill();
      onExit();
    } else if (action.item.title === "打开配置") {
      onOpenConfig();
    }
  });

  systray.onExit(code => {
    console.log(`[Agent Pulse] Tray exited with code ${code}`);
  });

  currentTray = systray;
  return systray;
}

function updateTray(status, label, onExit, onOpenConfig) {
  // systray doesn't support updating icon directly, so recreate
  createTray(status, label, onExit, onOpenConfig);
}

function killTray() {
  if (currentTray) {
    try {
      currentTray.kill(false); // false = don't exit node process
    } catch (e) {
      // Ignore
    }
    currentTray = null;
  }
}

module.exports = { createTray, updateTray, killTray };
