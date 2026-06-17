# Agent Pulse

Windows 系统托盘 AI 状态指示器 — 实时显示 opencode 的 AI 状态，支持桌面弹窗通知。

> **仅 Windows.** 需要 Windows 10+。  
> [English](https://github.com/anomalyco/agent-pulse)

## 功能

- **系统托盘图标** — 绿/黄/红/灰 四色显示 AI 状态
- **桌面通知弹窗** — 自定义样式，显示模型名、Token 用量、用户问题
- **滑入动画** + 淡入淡出，点击弹窗可聚焦 opencode
- **设置面板** — GUI 配置所有选项
- **托盘右键菜单** — 暂停、关闭、聚焦 opencode、设置、卸载

## 生命周期

| 操作 | 方式 | 效果 |
|------|------|------|
| **安装** | 在 `opencode.json` 添加 `"agent-pulse"` | 重启后自动安装 |
| **运行** | 启动 opencode | 托盘图标自动出现 |
| **暂停** | 托盘 → "🔔 暂停通知" | 托盘保留，通知停止 |
| **关闭** | 托盘 → "关闭托盘" | 托盘隐藏，下次事件自动恢复 |
| **卸载** | 托盘 → "卸载 Agent Pulse" | 清理配置，重启 opencode 完成 |

## 安装

### npm 安装

```bash
npm install -g agent-pulse
```

在 `opencode.json` 中添加（或在 opencode 对话中让 AI 帮你加）：

```json
{ "plugin": ["agent-pulse"] }
```

重启 opencode 即可。

### 手动安装（免配置）

将文件复制到 `.opencode/plugins/agent-pulse/`，无需修改任何 JSON。

### 本地开发

```bash
git clone https://github.com/anomalyco/agent-pulse
cd agent-pulse && npm install && npm run build
```

```json
{ "plugin": ["D:/code/agent-pulse"] }
```

## 配置

托盘右键 → "⚙ 设置"，或编辑 `~/.config/opencode/agent-pulse.json`：

| 选项 | 可选值 | 默认值 |
|------|--------|--------|
| `enabled` | true/false | true |
| `sound` | true/false | false |
| `filter` | all / attention / none | all |
| `notifyOn` | 状态数组 | 全部五种 |
| `style` | custom / native | native |
| `position` | bottom-right / bottom-left / top-right / top-left | bottom-right |
| `duration` | 毫秒 | 5000 |

## 状态映射

| 状态 | 颜色 | 含义 |
|------|------|------|
| thinking | 🟢 | AI 正在思考 |
| idle | 🟢 | AI 空闲 |
| waiting | 🟡 | 等待用户操作 |
| error | 🔴 | 发生错误 |
| disconnected | ⚪ | opencode 断开连接 |

## 许可证

MIT
