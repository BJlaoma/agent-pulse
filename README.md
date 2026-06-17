# Agent Pulse

Windows system tray status indicator for opencode — real-time AI status with desktop notifications.

> **Windows only.** Requires Windows 10+.  
> [中文文档](docs/README-CN.md)

## Features

- **System tray icon** — green/yellow/red/gray shows AI status at a glance
- **Desktop notifications** — custom-styled popup with model name, token usage, and user question
- **Slide-up animation** with fade in/out, click to focus opencode
- **Settings panel** — GUI to configure all options
- **Tray menu** — pause, close, focus opencode, settings, uninstall

## Lifecycle

| Action | How | Effect |
|--------|-----|--------|
| **Install** | Add `"agent-pulse"` to `opencode.json` | auto-install on restart |
| **Run** | Start opencode | tray icon appears |
| **Pause** | Tray → "🔔 Pause" | tray stays, notifications stop |
| **Close** | Tray → "Close" | tray hides, auto-restart on next event |
| **Uninstall** | Tray → "Uninstall" | removes config, restart opencode to complete |

## Install

### Via npm

```bash
npm install -g agent-pulse
```

Add to `opencode.json` (or ask opencode AI to do it):

```json
{ "plugin": ["agent-pulse"] }
```

Restart opencode.

### Manual (drop-in)

Copy files to `.opencode/plugins/agent-pulse/`. No config needed.

### Local dev

```bash
git clone https://github.com/anomalyco/agent-pulse
cd agent-pulse && npm install && npm run build
```

```json
{ "plugin": ["D:/code/agent-pulse"] }
```

## Configuration

Tray → "Settings", or `~/.config/opencode/agent-pulse.json`:

| Option | Values | Default |
|--------|--------|---------|
| `enabled` | true/false | true |
| `sound` | true/false | false |
| `filter` | all / attention / none | all |
| `notifyOn` | status array | all five |
| `style` | custom / native | native |
| `position` | bottom-right / bottom-left / top-right / top-left | bottom-right |
| `duration` | ms | 5000 |

## Status

| Status | Color | Meaning |
|--------|-------|---------|
| thinking | 🟢 | AI generating |
| idle | 🟢 | Ready |
| waiting | 🟡 | Awaiting permission |
| error | 🔴 | Error occurred |
| disconnected | ⚪ | opencode disconnected |

## License

MIT
