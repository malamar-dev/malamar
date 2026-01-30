import { sseEmitter } from "./emitter";

export {
  emitAgentExecutionFinished,
  emitAgentExecutionStarted,
  emitChatMessageAdded,
  emitChatProcessingFinished,
  emitChatProcessingStarted,
  emitTaskCommentAdded,
  emitTaskErrorOccurred,
  emitTaskStatusChanged,
  sseEmitter,
} from "./emitter";
export { eventsRouter } from "./routes";
export type {
  AgentExecutionFinishedEvent,
  AgentExecutionStartedEvent,
  ChatMessageAddedEvent,
  ChatProcessingFinishedEvent,
  ChatProcessingStartedEvent,
  SSEEventData,
  SSEEventType,
  TaskCommentAddedEvent,
  TaskErrorOccurredEvent,
  TaskStatusChangedEvent,
} from "./types";

/**
 * Close all active SSE connections.
 * Called during graceful shutdown.
 */
export function closeSSEConnections(): void {
  sseEmitter.closeAllConnections();
}
