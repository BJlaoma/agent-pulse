import type { Event } from "@opencode-ai/sdk";
import type { AgentState } from "./state.js";

export function mapEventToState(event: Event): AgentState | null {
  const timestamp = Date.now();

  switch (event.type) {
    case "session.status": {
      const status = event.properties.status;
      if (status.type === "busy") {
        return {
          status: "thinking",
          label: "AI 正在思考...",
          body: "正在处理你的请求，请稍候...",
          timestamp,
          sessionID: event.properties.sessionID,
        };
      } else if (status.type === "idle") {
        return {
          status: "idle",
          label: "AI 已完成",
          body: "回复已完成，可以继续对话",
          timestamp,
          sessionID: event.properties.sessionID,
        };
      } else if (status.type === "retry") {
        return {
          status: "waiting",
          label: "等待重试...",
          body: "AI 请求重试操作",
          timestamp,
          sessionID: event.properties.sessionID,
        };
      }
      return null;
    }

    case ("permission.asked" as any): {
      const props = (event as any).properties || {};
      const permissionTitle = props.title || props.permission || "权限确认";
      return {
        status: "waiting",
        label: "需要权限确认",
        body: `请求: ${permissionTitle}`,
        timestamp,
        sessionID: props.sessionID || "unknown",
      };
    }

    case "permission.replied": {
      return {
        status: "idle",
        label: "AI 已完成",
        body: "权限已处理，回复已完成",
        timestamp,
        sessionID: event.properties.sessionID,
      };
    }

    case "session.error": {
      const props = (event as any).properties || {};
      const errorMsg = props.error || props.message || "未知错误";
      return {
        status: "error",
        label: "发生错误",
        body: `错误信息: ${errorMsg}`,
        timestamp,
        sessionID: props.sessionID,
      };
    }

    default:
      return null;
  }
}

export function getDisconnectedState(): AgentState {
  return {
    status: "disconnected",
    label: "连接已断开",
    body: "opencode 已断开连接",
    timestamp: Date.now(),
  };
}
