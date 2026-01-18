/**
 * Supported CLI types for code agents
 */
export type CliType = 'claude' | 'gemini' | 'codex' | 'opencode';

export const CLI_TYPES: CliType[] = ['claude', 'gemini', 'codex', 'opencode'];

/**
 * Task status in the workflow
 */
export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';

export const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done'];

/**
 * Queue item status for processing
 */
export type QueueStatus = 'queued' | 'in_progress' | 'completed' | 'failed';

export const QUEUE_STATUSES: QueueStatus[] = ['queued', 'in_progress', 'completed', 'failed'];

/**
 * Actor type for activity logs
 */
export type ActorType = 'user' | 'agent' | 'system';

export const ACTOR_TYPES: ActorType[] = ['user', 'agent', 'system'];

/**
 * Working directory mode for workspaces
 */
export type WorkingDirectoryMode = 'static' | 'temp';

export const WORKING_DIRECTORY_MODES: WorkingDirectoryMode[] = ['static', 'temp'];

/**
 * Message role in chats
 */
export type MessageRole = 'user' | 'agent' | 'system';

export const MESSAGE_ROLES: MessageRole[] = ['user', 'agent', 'system'];

/**
 * Type guard helpers
 */
export function isCliType(value: string): value is CliType {
  return CLI_TYPES.includes(value as CliType);
}

export function isTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus);
}

export function isQueueStatus(value: string): value is QueueStatus {
  return QUEUE_STATUSES.includes(value as QueueStatus);
}

export function isActorType(value: string): value is ActorType {
  return ACTOR_TYPES.includes(value as ActorType);
}

export function isWorkingDirectoryMode(value: string): value is WorkingDirectoryMode {
  return WORKING_DIRECTORY_MODES.includes(value as WorkingDirectoryMode);
}

export function isMessageRole(value: string): value is MessageRole {
  return MESSAGE_ROLES.includes(value as MessageRole);
}
