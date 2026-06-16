# Agent Pulse 设计文档

## 项目概述

Agent Pulse 是一个 opencode 原生插件，在 opencode 启动时自动加载，为 Windows 提供系统托盘状态指示和弹窗通知。当 AI 状态变化时，托盘图标变色并发送 Windows Toast 通知 + 提示音。

## 核心需求

| 需求 | 说明 |
|---|---|
| 插件形态 | 系统托盘图标（无悬浮窗） |
| 状态检测 | 基于 opencode SDK 事件 hook |
| 通知策略 | 所有状态变化默认弹窗+声音，用户可配置 |
| 提示音 | 统一一种 WAV 提示音 |
| 图标格式 | Windows `.ico` 文件 |
| 启动方式 | opencode 启动时自动加载 |

## 架构设计

### 进程模型

```
┌─────────────────────────────────────────────────┐
│           opencode 主进程 (Node.js)              │
│  ┌───────────────────────────────────────────┐  │
│  │  agent-pulse 插件 (src/index.ts)           │  │
│  │                                            │  │
│  │  - 注册 event / permission.ask hooks      │  │
│  │  - 状态变化 → 写入状态文件                 │  │
│  │    ~/.config/opencode/agent-pulse-state.json│  │
│  │  - 启动子进程 (tray/index.js)              │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                         │
                         │ 子进程 spawn
                         ▼
┌─────────────────────────────────────────────────┐
│      agent-pulse-tray 子进程 (Node.js)           │
│  ┌───────────────────────────────────────────┐  │
│  │  - 监听状态文件变化 (fs.watch)             │  │
│  │  - systray 更新托盘图标颜色                 │  │
│  │  - node-notifier 发送 Windows Toast        │  │
│  │  - play-sound 播放 WAV 提示音              │  │
│  │  - 右键菜单：显示日志、打开配置、退出        │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 为什么用子进程

- opencode 主进程不能阻塞，否则卡住 AI 响应
- 托盘进程需要常驻事件循环（systray 阻塞），必须在独立进程
- opencode 退出时，子进程通过 `child.kill()` 自动关闭

## 状态颜色映射

| opencode 事件 | 状态 ID | 颜色 | 图标 | 通知文案 |
|---|---|---|---|---|
| `session.status: { type: "busy" }` | `thinking` | 🟢 绿色 | 闪烁 | "AI 正在思考..." |
| `session.status: { type: "idle" }` | `idle` | 🟢 绿色 | 静态 | "AI 已空闲" |
| `permission.ask` | `waiting` | 🟡 黄色 | 静态 | "需要手动操作" |
| `session.status: { type: "retry" }` | `waiting` | 🟡 黄色 | 静态 | "等待重试..." |
| `session.error` | `error` | 🔴 红色 | 静态 | "发生错误" |
| opencode 断开 | `disconnected` | ⚪ 灰色 | 静态 | "连接已断开" |

## 组件设计

### 1. 插件核心 (src/index.ts)

职责：
- 注册 opencode hooks
- 解析事件并映射为内部状态
- 写入状态文件
- 启动/管理子进程

核心函数：
```typescript
function mapEventToStatus(event: Event): AgentStatus
function writeStateFile(status: AgentStatus): void
function spawnTrayProcess(): ChildProcess
```

### 2. 状态管理 (src/state.ts)

状态文件格式 (`~/.config/opencode/agent-pulse-state.json`)：
```json
{
  "status": "thinking",
  "label": "AI 正在思考...",
  "timestamp": 1750108800000,
  "sessionID": "abc-123"
}
```

### 3. 托盘进程 (tray/index.js)

职责：
- 初始化 systray
- 监听状态文件变化
- 切换图标
- 发送通知和声音
- 右键菜单

右键菜单项：
- 当前状态：显示文本
- 最近日志：显示状态变化历史
- 打开配置：打开配置 JSON
- 退出：关闭托盘进程

### 4. 通知模块 (tray/notifier.js)

```javascript
function notify(status, message) {
  // Windows Toast
  nodeNotifier.notify({
    title: "Agent Pulse",
    message: message,
    icon: getIconForStatus(status),
    sound: false // 我们用自定义声音
  });
  
  // 自定义 WAV 提示音
  if (config.soundEnabled) {
    playSound(path.join(__dirname, "assets", "ping.wav"));
  }
}
```

### 5. 配置模块

配置文件 (`~/.config/opencode/agent-pulse.json`)：
```json
{
  "notification": {
    "enabled": true,
    "sound": true,
    "filter": "all" // "all" | "attention" | "none"
  },
  "tray": {
    "showLabel": true
  }
}
```

- `filter: all` - 所有状态变化都通知
- `filter: attention` - 只通知 waiting / error
- `filter: none` - 关闭通知

## 数据流

```
opencode 内部事件
    │
    ▼
┌───────────────┐
│  event hook   │
└───────────────┘
    │
    ▼
┌───────────────┐
│ mapEventToStatus
│ writeStateFile
└───────────────┘
    │
    │ (文件写入)
    ▼
┌───────────────┐
│  fs.watch     │
└───────────────┘
    │
    ▼
┌───────────────┐
│  读取新状态    │
│  更新 systray  │
│  发送通知      │
│  播放声音      │
└───────────────┘
```

## 错误处理

| 场景 | 处理 |
|---|---|
| 状态文件写入失败 | 记录到 stderr，继续运行 |
| 子进程崩溃 | 插件检测到 exit，尝试重启一次 |
| 子进程启动失败 | 插件降级为仅日志输出 |
| 图标文件缺失 | 使用内置 base64 默认图标 |
| 通知失败 | 静默失败，不影响托盘图标 |

## 目录结构

```
agent-pulse/
├── package.json              # 插件 npm 包
├── tsconfig.json             # TypeScript 配置
├── src/
│   ├── index.ts              # 插件入口
│   ├── hooks.ts              # opencode hook 注册
│   ├── state.ts              # 状态文件读写
│   └── config.ts             # 配置读取
├── tray/
│   ├── index.js              # 托盘进程入口
│   ├── tray.js               # systray 图标管理
│   ├── notifier.js           # 通知 + 声音
│   └── config.js             # 配置读取
├── assets/
│   ├── icons/
│   │   ├── green.ico         # 绿色图标
│   │   ├── yellow.ico        # 黄色图标
│   │   ├── red.ico           # 红色图标
│   │   └── gray.ico          # 灰色图标
│   └── ping.wav              # 提示音
├── docs/
│   └── design.md             # 本文件
└── README.md
```

## 依赖

### 插件依赖 (dependencies)
- `@opencode-ai/plugin` - opencode 插件 API
- `bun` - 运行时 (opencode 使用 bun)

### 托盘进程依赖 (dependencies)
- `systray` - 系统托盘图标
- `node-notifier` - Windows Toast 通知
- `play-sound` - 播放 WAV

## 使用方式

### 1. 安装

```bash
cd D:\code\agent-pulse
npm install
```

### 2. 配置 opencode

编辑 `~/.config/opencode/opencode.json`：

```json
{
  "plugin": [
    "D:/code/agent-pulse"
  ]
}
```

### 3. 运行

```bash
opencode
# 托盘图标自动出现
```

## 扩展预留

- 悬浮窗：后续可加入 `tray/floating-window.js` 作为可选组件
- 多会话：当前只处理单会话，后续可扩展为会话列表
- 历史日志：状态文件可扩展为 `agent-pulse-log.jsonl` 保存完整历史

## 非功能需求

- **启动时间**：插件加载 < 100ms，子进程启动 < 500ms
- **资源占用**：内存 < 30MB（含子进程）
- **响应延迟**：状态变化到图标更新 < 200ms
- **无侵入**：不影响 opencode 正常功能，失败时静默降级
