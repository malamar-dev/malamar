/**
 * SSE Event types mirrored from the API.
 * These match the types in api/src/events/types.ts
 */

// Task events
export interface TaskStatusChangedEvent {
  taskId: string;
  taskSummary: string;
  oldStatus: string;
  newStatus: string;
  workspaceId: string;
}

export interface TaskCommentAddedEvent {
  taskId: string;
  taskSummary: string;
  authorName: string;
  workspaceId: string;
}

export interface TaskErrorOccurredEvent {
  taskId: string;
  taskSummary: string;
  errorMessage: string;
  workspaceId: string;
}

// Agent events
export interface AgentExecutionStartedEvent {
  taskId: string;
  taskSummary: string;
  agentName: string;
  workspaceId: string;
}

export interface AgentExecutionFinishedEvent {
  taskId: string;
  taskSummary: string;
  agentName: string;
  workspaceId: string;
}

// Chat events
export interface ChatMessageAddedEvent {
  chatId: string;
  chatTitle: string;
  authorType: "user" | "agent" | "system";
  workspaceId: string;
}

export interface ChatProcessingStartedEvent {
  chatId: string;
  chatTitle: string;
  agentName: string;
  workspaceId: string;
}

export interface ChatProcessingFinishedEvent {
  chatId: string;
  chatTitle: string;
  agentName: string;
  workspaceId: string;
}

// Union type for all SSE events
export type SSEEventType =
  | "task.status_changed"
  | "task.comment_added"
  | "task.error_occurred"
  | "agent.execution_started"
  | "agent.execution_finished"
  | "chat.message_added"
  | "chat.processing_started"
  | "chat.processing_finished";

export type SSEEventData =
  | TaskStatusChangedEvent
  | TaskCommentAddedEvent
  | TaskErrorOccurredEvent
  | AgentExecutionStartedEvent
  | AgentExecutionFinishedEvent
  | ChatMessageAddedEvent
  | ChatProcessingStartedEvent
  | ChatProcessingFinishedEvent;
