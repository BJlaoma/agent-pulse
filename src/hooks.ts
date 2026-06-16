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
          timestamp,
          sessionID: event.properties.sessionID,
        };
      } else if (status.type === "idle") {
        return {
          status: "idle",
          label: "AI 已空闲",
          timestamp,
          sessionID: event.properties.sessionID,
        };
      } else if (status.type === "retry") {
        return {
          status: "waiting",
          label: "等待重试...",
          timestamp,
          sessionID: event.properties.sessionID,
        };
      }
      return null;
    }

    case "permission.updated": {
      return {
        status: "waiting",
        label: "需要手动操作",
        timestamp,
        sessionID: event.properties.sessionID,
      };
    }

    case "session.error": {
      return {
        status: "error",
        label: "发生错误",
        timestamp,
        sessionID: event.properties.sessionID,
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
    timestamp: Date.now(),
  };
}
