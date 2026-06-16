# Agent Pulse

Windows system tray status indicator for opencode.

## Features

- Real-time AI status display via system tray icon
- Windows Toast notifications on status changes
- Configurable sound alerts
- Color-coded status:
  - 🟢 Green: AI idle or thinking
  - 🟡 Yellow: Waiting for user action
  - 🔴 Red: Error occurred
  - ⚪ Gray: Disconnected

## Installation

```bash
npm install
npm run build
```

## Configuration

Add to `~/.config/opencode/opencode.json`:

```json
{
  "plugin": [
    "D:/code/agent-pulse"
  ]
}
```

## Configuration Options

Create `~/.config/opencode/agent-pulse.json`:

```json
{
  "notification": {
    "enabled": true,
    "sound": true,
    "filter": "all"
  }
}
```

- `filter`: `"all"` (all notifications) | `"attention"` (only waiting/error) | `"none"` (disabled)

## Usage

Run `opencode` and the tray icon will appear automatically.

Right-click the tray icon for options:
- View current status
- Open configuration
- Exit

## Architecture

The plugin consists of two parts:
1. **Plugin core** (`src/`): Hooks into opencode events and writes state
2. **Tray process** (`tray/`): Runs independently, watches state file, manages tray icon

## Development

```bash
npm run dev  # Watch mode
```

## Status Mapping

| opencode Event | Status | Color |
|---|---|---|
| `session.status: busy` | thinking | 🟢 Green |
| `session.status: idle` | idle | 🟢 Green |
| `permission.updated` | waiting | 🟡 Yellow |
| `session.status: retry` | waiting | 🟡 Yellow |
| `session.error` | error | 🔴 Red |

## License

MIT
