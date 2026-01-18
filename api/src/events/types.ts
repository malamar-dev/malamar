import type { TaskStatus } from '../core/types.ts';

/**
 * SSE event types for real-time updates
 *
 * Events are broadcast to all connected clients without workspace scoping.
 * Client-side filtering handles noise if needed.
 */
export type SseEventType =
  | 'task.status_changed'
  | 'task.comment_added'
  | 'task.error_occurred'
  | 'agent.execution_started'
  | 'agent.execution_finished'
  | 'chat.message_added'
  | 'chat.processing_started'
  | 'chat.processing_finished';

export const SSE_EVENT_TYPES: SseEventType[] = [
  'task.status_changed',
  'task.comment_added',
  'task.error_occurred',
  'agent.execution_started',
  'agent.execution_finished',
  'chat.message_added',
  'chat.processing_started',
  'chat.processing_finished',
];

/**
 * Type guard for SSE event types
 */
export function isSseEventType(value: string): value is SseEventType {
  return SSE_EVENT_TYPES.includes(value as SseEventType);
}

/**
 * Base event payload with common fields
 */
export interface BaseEventPayload {
  workspaceId: string;
}

/**
 * Task status changed event payload
 */
export interface TaskStatusChangedPayload extends BaseEventPayload {
  taskId: string;
  taskSummary: string;
  oldStatus: TaskStatus;
  newStatus: TaskStatus;
}

/**
 * Task comment added event payload
 */
export interface TaskCommentAddedPayload extends BaseEventPayload {
  taskId: string;
  taskSummary: string;
  authorName: string;
}

/**
 * Task error occurred event payload
 */
export interface TaskErrorOccurredPayload extends BaseEventPayload {
  taskId: string;
  taskSummary: string;
  errorMessage: string;
}

/**
 * Agent execution started event payload
 */
export interface AgentExecutionStartedPayload extends BaseEventPayload {
  taskId: string;
  taskSummary: string;
  agentName: string;
}

/**
 * Agent execution finished event payload
 */
export interface AgentExecutionFinishedPayload extends BaseEventPayload {
  taskId: string;
  taskSummary: string;
  agentName: string;
}

/**
 * Chat message added event payload
 */
export interface ChatMessageAddedPayload extends BaseEventPayload {
  chatId: string;
  chatTitle: string;
  authorType: 'user' | 'agent' | 'system';
}

/**
 * Chat processing started event payload
 */
export interface ChatProcessingStartedPayload extends BaseEventPayload {
  chatId: string;
  chatTitle: string;
  agentName: string;
}

/**
 * Chat processing finished event payload
 */
export interface ChatProcessingFinishedPayload extends BaseEventPayload {
  chatId: string;
  chatTitle: string;
  agentName: string;
}

/**
 * Map of event types to their payload types
 */
export interface SseEventPayloadMap {
  'task.status_changed': TaskStatusChangedPayload;
  'task.comment_added': TaskCommentAddedPayload;
  'task.error_occurred': TaskErrorOccurredPayload;
  'agent.execution_started': AgentExecutionStartedPayload;
  'agent.execution_finished': AgentExecutionFinishedPayload;
  'chat.message_added': ChatMessageAddedPayload;
  'chat.processing_started': ChatProcessingStartedPayload;
  'chat.processing_finished': ChatProcessingFinishedPayload;
}

/**
 * Generic SSE event structure
 */
export interface SseEvent<T extends SseEventType = SseEventType> {
  type: T;
  data: SseEventPayloadMap[T];
}

/**
 * Union type for all possible SSE events
 */
export type AnySseEvent =
  | SseEvent<'task.status_changed'>
  | SseEvent<'task.comment_added'>
  | SseEvent<'task.error_occurred'>
  | SseEvent<'agent.execution_started'>
  | SseEvent<'agent.execution_finished'>
  | SseEvent<'chat.message_added'>
  | SseEvent<'chat.processing_started'>
  | SseEvent<'chat.processing_finished'>;

/**
 * SSE connection configuration
 */
export interface SseConnectionConfig {
  /**
   * Retry interval hint for client auto-reconnect (in milliseconds)
   */
  retryMs: number;
}

/**
 * Default SSE connection configuration
 */
export const DEFAULT_SSE_CONFIG: SseConnectionConfig = {
  retryMs: 3000,
};
