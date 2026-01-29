/**
 * Task status enum.
 */
export type TaskStatus = "todo" | "in_progress" | "in_review" | "done";

/**
 * Task queue status enum.
 */
export type TaskQueueStatus = "queued" | "in_progress" | "completed" | "failed";

/**
 * Actor types for task logs.
 */
export type ActorType = "user" | "agent" | "system";

// =============================================================================
// Database Row Types (snake_case)
// =============================================================================

/**
 * Database row representation of a task.
 */
export interface TaskRow {
  id: string;
  workspace_id: string;
  summary: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * Database row representation of a task comment.
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
 * Database row representation of a task log entry.
 */
export interface TaskLogRow {
  id: string;
  task_id: string;
  workspace_id: string;
  event_type: string;
  actor_type: string;
  actor_id: string | null;
  metadata: string | null;
  created_at: string;
}

/**
 * Database row representation of a task queue item.
 */
export interface TaskQueueRow {
  id: string;
  task_id: string;
  workspace_id: string;
  status: string;
  is_priority: number;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Domain Entity Types (camelCase)
// =============================================================================

/**
 * Task entity as returned by the API.
 */
export interface Task {
  id: string;
  workspaceId: string;
  summary: string;
  description: string;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Task comment entity as returned by the API.
 */
export interface TaskComment {
  id: string;
  taskId: string;
  workspaceId: string;
  userId: string | null;
  agentId: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Task log entry entity as returned by the API.
 */
export interface TaskLog {
  id: string;
  taskId: string;
  workspaceId: string;
  eventType: string;
  actorType: ActorType;
  actorId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

/**
 * Task queue item entity as returned by the API.
 */
export interface TaskQueue {
  id: string;
  taskId: string;
  workspaceId: string;
  status: TaskQueueStatus;
  isPriority: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// Pagination Types
// =============================================================================

/**
 * Paginated result wrapper for list queries.
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}
