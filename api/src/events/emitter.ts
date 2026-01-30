import { EventEmitter } from "node:events";

import type { SSEEventData, SSEEventType } from "./types";

/**
 * Singleton EventEmitter for pub/sub pattern.
 * Used to broadcast SSE events to all connected clients.
 */
class SSEEventEmitter extends EventEmitter {
  private static instance: SSEEventEmitter;

  private constructor() {
    super();
    // Allow unlimited listeners for SSE connections
    this.setMaxListeners(0);
  }

  static getInstance(): SSEEventEmitter {
    if (!SSEEventEmitter.instance) {
      SSEEventEmitter.instance = new SSEEventEmitter();
    }
    return SSEEventEmitter.instance;
  }

  /**
   * Emit an SSE event to all connected clients.
   */
  emitSSE(eventType: SSEEventType, data: SSEEventData): void {
    this.emit("sse", { eventType, data });
  }
}

// Export singleton instance
export const sseEmitter = SSEEventEmitter.getInstance();

// Convenience functions for emitting events
export function emitTaskStatusChanged(data: {
  taskId: string;
  taskSummary: string;
  oldStatus: string;
  newStatus: string;
  workspaceId: string;
}): void {
  sseEmitter.emitSSE("task.status_changed", {
    taskId: data.taskId,
    taskSummary: data.taskSummary,
    oldStatus: data.oldStatus,
    newStatus: data.newStatus,
    workspaceId: data.workspaceId,
  });
}

export function emitTaskCommentAdded(data: {
  taskId: string;
  taskSummary: string;
  authorName: string;
  workspaceId: string;
}): void {
  sseEmitter.emitSSE("task.comment_added", {
    taskId: data.taskId,
    taskSummary: data.taskSummary,
    authorName: data.authorName,
    workspaceId: data.workspaceId,
  });
}

export function emitTaskErrorOccurred(data: {
  taskId: string;
  taskSummary: string;
  errorMessage: string;
  workspaceId: string;
}): void {
  sseEmitter.emitSSE("task.error_occurred", {
    taskId: data.taskId,
    taskSummary: data.taskSummary,
    errorMessage: data.errorMessage,
    workspaceId: data.workspaceId,
  });
}

export function emitAgentExecutionStarted(data: {
  taskId: string;
  taskSummary: string;
  agentName: string;
  workspaceId: string;
}): void {
  sseEmitter.emitSSE("agent.execution_started", {
    taskId: data.taskId,
    taskSummary: data.taskSummary,
    agentName: data.agentName,
    workspaceId: data.workspaceId,
  });
}

export function emitAgentExecutionFinished(data: {
  taskId: string;
  taskSummary: string;
  agentName: string;
  workspaceId: string;
}): void {
  sseEmitter.emitSSE("agent.execution_finished", {
    taskId: data.taskId,
    taskSummary: data.taskSummary,
    agentName: data.agentName,
    workspaceId: data.workspaceId,
  });
}

export function emitChatMessageAdded(data: {
  chatId: string;
  chatTitle: string;
  authorType: "user" | "agent" | "system";
  workspaceId: string;
}): void {
  sseEmitter.emitSSE("chat.message_added", {
    chatId: data.chatId,
    chatTitle: data.chatTitle,
    authorType: data.authorType,
    workspaceId: data.workspaceId,
  });
}

export function emitChatProcessingStarted(data: {
  chatId: string;
  chatTitle: string;
  agentName: string;
  workspaceId: string;
}): void {
  sseEmitter.emitSSE("chat.processing_started", {
    chatId: data.chatId,
    chatTitle: data.chatTitle,
    agentName: data.agentName,
    workspaceId: data.workspaceId,
  });
}

export function emitChatProcessingFinished(data: {
  chatId: string;
  chatTitle: string;
  agentName: string;
  workspaceId: string;
}): void {
  sseEmitter.emitSSE("chat.processing_finished", {
    chatId: data.chatId,
    chatTitle: data.chatTitle,
    agentName: data.agentName,
    workspaceId: data.workspaceId,
  });
}
