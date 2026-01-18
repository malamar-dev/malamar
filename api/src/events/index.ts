// Routes
export { eventsRoutes } from './routes.ts';

// Emitter
export type { EventHandler, Unsubscribe } from './emitter.ts';
export { clearSubscribers, emit, getSubscriberCount, subscribe } from './emitter.ts';

// Registry
export type { SseStreamController } from './registry.ts';
export {
  addConnection,
  clearConnections,
  formatSseMessage,
  getConnectionCount,
  initSseRegistry,
  shutdownSseRegistry,
} from './registry.ts';

// Types
export type {
  AgentExecutionFinishedPayload,
  AgentExecutionStartedPayload,
  AnySseEvent,
  BaseEventPayload,
  ChatMessageAddedPayload,
  ChatProcessingFinishedPayload,
  ChatProcessingStartedPayload,
  SseConnectionConfig,
  SseEvent,
  SseEventPayloadMap,
  SseEventType,
  TaskCommentAddedPayload,
  TaskErrorOccurredPayload,
  TaskStatusChangedPayload,
} from './types.ts';
export { DEFAULT_SSE_CONFIG, isSseEventType, SSE_EVENT_TYPES } from './types.ts';
