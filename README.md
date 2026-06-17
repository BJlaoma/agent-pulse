# Agent Pulse

Windows system tray status indicator for opencode — real-time AI status with desktop notifications.

## Features

- **System tray icon** — green/yellow/red/gray shows AI status at a glance
- **Desktop notifications** — custom-styled popup with model name, token usage, and user question
- **Slide-up animation** with fade in/out
- **Click to focus** — click the notification to bring opencode to foreground
- **Settings panel** — GUI to configure all options
- **Tray menu** — pause notifications, focus opencode, settings, uninstall
- Configurable sound alerts
- Notification filter and `notifyOn` status selection

## Installation

Add to `opencode.json`:

```json
{
  "plugin": ["agent-pulse"]
}
```

Restart opencode — it auto-installs dependencies at startup.  

> **Windows only.** Requires Windows 10+ for toast notifications.

## Uninstall

**Quick uninstall** — Right-click tray icon → "🗑 卸载 Agent Pulse"  

Removes the plugin from `opencode.json` and cleans up config files.

**Manual uninstall** — Remove `"agent-pulse"` from `opencode.json` plugin array, restart opencode.

## Configuration

Via tray menu → "⚙ 设置" panel, or Edit `~/.config/opencode/agent-pulse.json`:

```json
{
  "notification": {
    "enabled": true,
    "sound": false,
    "filter": "all",
    "notifyOn": ["thinking", "idle", "waiting", "error", "disconnected"],
    "style": "custom",
    "position": "bottom-right",
    "duration": 5000
  }
}
```

| Option | Values | Default |
|--------|--------|---------|
| `enabled` | true/false | true |
| `sound` | true/false | false |
| `filter` | all / attention / none | all |
| `notifyOn` | array of statuses | all five |
| `style` | custom / native | native |
| `position` | bottom-right / bottom-left / top-right / top-left | bottom-right |
| `duration` | milliseconds | 5000 |

## Status Mapping

| Status | Color | Meaning |
|--------|-------|---------|
| thinking | 🟢 | AI is generating a response |
| idle | 🟢 | AI is idle, ready |
| waiting | 🟡 | Waiting for permission/user action |
| error | 🔴 | An error occurred |
| disconnected | ⚪ | opencode disconnected |

## Architecture

Two-process model:

1. **Plugin core** (`src/`) — runs inside opencode (Bun), hooks into events, writes state file
2. **Tray process** (`tray/`) — standalone Node.js process, watches state file, manages tray & notifications

## License

MIT
