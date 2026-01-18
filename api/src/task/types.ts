import type { ActorType, QueueStatus, TaskStatus } from '../core/types.ts';

/**
 * Task entity as returned from the database
 */
export interface TaskRow {
  id: string;
  workspace_id: string;
  summary: string;
  description: string;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Task entity with normalized types
 */
export interface Task {
  id: string;
  workspaceId: string;
  summary: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating a new task
 */
export interface CreateTaskInput {
  workspaceId: string;
  summary: string;
  description?: string;
}

/**
 * Input for updating an existing task
 */
export interface UpdateTaskInput {
  summary?: string;
  description?: string;
  status?: TaskStatus;
}

/**
 * Convert database row to Task entity
 */
export function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    summary: row.summary,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Task Comment entity as returned from the database
 */
export interface TaskCommentRow {
  id: string;
  task_id: string;
  workspace_id: string;
  user_id: string | null;
  agent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

/**
 * Task Comment entity with normalized types
 */
export interface TaskComment {
  id: string;
  taskId: string;
  workspaceId: string;
  userId: string | null;
  agentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating a task comment
 */
export interface CreateTaskCommentInput {
  taskId: string;
  workspaceId: string;
  userId?: string | null;
  agentId?: string | null;
  content: string;
}

/**
 * Convert database row to TaskComment entity
 */
export function rowToTaskComment(row: TaskCommentRow): TaskComment {
  return {
    id: row.id,
    taskId: row.task_id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    agentId: row.agent_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Task Log entity as returned from the database
 */
export interface TaskLogRow {
  id: string;
  task_id: string;
  workspace_id: string;
  event_type: string;
  actor_type: ActorType;
  actor_id: string | null;
  metadata: string | null;
  created_at: string;
}

/**
 * Task Log entity with normalized types
 */
export interface TaskLog {
  id: string;
  taskId: string;
  workspaceId: string;
  eventType: TaskEventType;
  actorType: ActorType;
  actorId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

/**
 * Task event types for activity log
 */
export type TaskEventType =
  | 'task_created'
  | 'status_changed'
  | 'comment_added'
  | 'agent_started'
  | 'agent_finished'
  | 'task_cancelled'
  | 'task_prioritized'
  | 'task_deprioritized';

/**
 * Input for creating a task log
 */
export interface CreateTaskLogInput {
  taskId: string;
  workspaceId: string;
  eventType: TaskEventType;
  actorType: ActorType;
  actorId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Convert database row to TaskLog entity
 */
export function rowToTaskLog(row: TaskLogRow): TaskLog {
  return {
    id: row.id,
    taskId: row.task_id,
    workspaceId: row.workspace_id,
    eventType: row.event_type as TaskEventType,
    actorType: row.actor_type,
    actorId: row.actor_id,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
    createdAt: row.created_at,
  };
}

/**
 * Task Queue Item entity as returned from the database
 */
export interface TaskQueueItemRow {
  id: string;
  task_id: string;
  workspace_id: string;
  status: QueueStatus;
  is_priority: number;
  created_at: string;
  updated_at: string;
}

/**
 * Task Queue Item entity with normalized types
 */
export interface TaskQueueItem {
  id: string;
  taskId: string;
  workspaceId: string;
  status: QueueStatus;
  isPriority: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating a task queue item
 */
export interface CreateTaskQueueItemInput {
  taskId: string;
  workspaceId: string;
  isPriority?: boolean;
}

/**
 * Convert database row to TaskQueueItem entity
 */
export function rowToTaskQueueItem(row: TaskQueueItemRow): TaskQueueItem {
  return {
    id: row.id,
    taskId: row.task_id,
    workspaceId: row.workspace_id,
    status: row.status,
    isPriority: row.is_priority === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
