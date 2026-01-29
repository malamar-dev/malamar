import { getDatabase } from "../core";
import type {
  ActorType,
  PaginatedResult,
  Task,
  TaskComment,
  TaskCommentRow,
  TaskLog,
  TaskLogRow,
  TaskQueue,
  TaskQueueRow,
  TaskQueueStatus,
  TaskRow,
  TaskStatus,
} from "./types";

// =============================================================================
// Row-to-Entity Converters
// =============================================================================

/**
 * Convert a database row to a Task entity.
 */
function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    summary: row.summary,
    description: row.description,
    status: row.status as TaskStatus,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Convert a database row to a TaskComment entity.
 */
function rowToComment(row: TaskCommentRow): TaskComment {
  return {
    id: row.id,
    taskId: row.task_id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    agentId: row.agent_id,
    content: row.content,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Convert a database row to a TaskLog entity.
 */
function rowToLog(row: TaskLogRow): TaskLog {
  let metadata: Record<string, unknown> | null = null;
  if (row.metadata) {
    try {
      metadata = JSON.parse(row.metadata) as Record<string, unknown>;
    } catch {
      metadata = null;
    }
  }

  return {
    id: row.id,
    taskId: row.task_id,
    workspaceId: row.workspace_id,
    eventType: row.event_type,
    actorType: row.actor_type as ActorType,
    actorId: row.actor_id,
    metadata,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Convert a database row to a TaskQueue entity.
 */
function rowToQueueItem(row: TaskQueueRow): TaskQueue {
  return {
    id: row.id,
    taskId: row.task_id,
    workspaceId: row.workspace_id,
    status: row.status as TaskQueueStatus,
    isPriority: row.is_priority === 1,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// =============================================================================
// Task Operations
// =============================================================================

/**
 * Find a task by ID.
 * Returns null if not found.
 */
export function findById(id: string): Task | null {
  const db = getDatabase();
  const row = db
    .query<TaskRow, [string]>(`SELECT * FROM tasks WHERE id = ?`)
    .get(id);
  return row ? rowToTask(row) : null;
}

/**
 * Count total tasks for a workspace.
 */
export function countByWorkspaceId(workspaceId: string): number {
  const db = getDatabase();
  const result = db
    .query<
      { count: number },
      [string]
    >(`SELECT COUNT(*) as count FROM tasks WHERE workspace_id = ?`)
    .get(workspaceId);
  return result?.count ?? 0;
}

/**
 * Find tasks for a workspace with pagination.
 * Returns tasks sorted by updated_at DESC (newest first).
 */
export function findByWorkspaceId(
  workspaceId: string,
  offset: number,
  limit: number,
): PaginatedResult<Task> {
  const db = getDatabase();

  const total = countByWorkspaceId(workspaceId);

  const rows = db
    .query<TaskRow, [string, number, number]>(
      `SELECT * FROM tasks
       WHERE workspace_id = ?
       ORDER BY updated_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(workspaceId, limit, offset);

  return {
    items: rows.map(rowToTask),
    total,
    offset,
    limit,
    hasMore: offset + rows.length < total,
  };
}

/**
 * Create a new task in the database.
 * Returns the created Task entity.
 */
export function create(
  id: string,
  workspaceId: string,
  summary: string,
  description: string,
): Task {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare(
    `
    INSERT INTO tasks (id, workspace_id, summary, description, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'todo', ?, ?)
  `,
  ).run(id, workspaceId, summary, description, now, now);

  return findById(id)!;
}

/**
 * Update a task.
 * Returns the updated Task entity or null if not found.
 */
export function update(
  id: string,
  data: { summary?: string; description?: string; status?: TaskStatus },
): Task | null {
  const db = getDatabase();
  const now = new Date().toISOString();

  const task = findById(id);
  if (!task) {
    return null;
  }

  const summary = data.summary ?? task.summary;
  const description = data.description ?? task.description;
  const status = data.status ?? task.status;

  db.prepare(
    `UPDATE tasks SET summary = ?, description = ?, status = ?, updated_at = ? WHERE id = ?`,
  ).run(summary, description, status, now, id);

  return findById(id);
}

/**
 * Delete a task by ID.
 * Returns true if deleted, false if not found.
 */
export function deleteById(id: string): boolean {
  const db = getDatabase();
  const result = db.prepare(`DELETE FROM tasks WHERE id = ?`).run(id);
  return result.changes > 0;
}

/**
 * Delete all done tasks for a workspace.
 * Returns the count of deleted tasks.
 */
export function deleteAllDoneByWorkspaceId(workspaceId: string): number {
  const db = getDatabase();
  const result = db
    .prepare(`DELETE FROM tasks WHERE workspace_id = ? AND status = 'done'`)
    .run(workspaceId);
  return result.changes;
}

// =============================================================================
// Task Comment Operations
// =============================================================================

/**
 * Count total comments for a task.
 */
export function countCommentsByTaskId(taskId: string): number {
  const db = getDatabase();
  const result = db
    .query<
      { count: number },
      [string]
    >(`SELECT COUNT(*) as count FROM task_comments WHERE task_id = ?`)
    .get(taskId);
  return result?.count ?? 0;
}

/**
 * Find comments for a task with pagination.
 * Returns comments sorted by created_at DESC (newest first).
 */
export function findCommentsByTaskId(
  taskId: string,
  offset: number,
  limit: number,
): PaginatedResult<TaskComment> {
  const db = getDatabase();

  const total = countCommentsByTaskId(taskId);

  const rows = db
    .query<TaskCommentRow, [string, number, number]>(
      `SELECT * FROM task_comments
       WHERE task_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(taskId, limit, offset);

  return {
    items: rows.map(rowToComment),
    total,
    offset,
    limit,
    hasMore: offset + rows.length < total,
  };
}

/**
 * Create a new comment for a task.
 * Returns the created TaskComment entity.
 */
export function createComment(
  id: string,
  taskId: string,
  workspaceId: string,
  content: string,
  userId: string | null,
  agentId: string | null,
): TaskComment {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare(
    `
    INSERT INTO task_comments (id, task_id, workspace_id, user_id, agent_id, content, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(id, taskId, workspaceId, userId, agentId, content, now, now);

  // Also update the task's updated_at timestamp
  db.prepare(`UPDATE tasks SET updated_at = ? WHERE id = ?`).run(now, taskId);

  return findCommentById(id)!;
}

/**
 * Find a comment by ID.
 * Returns null if not found.
 */
export function findCommentById(id: string): TaskComment | null {
  const db = getDatabase();
  const row = db
    .query<TaskCommentRow, [string]>(`SELECT * FROM task_comments WHERE id = ?`)
    .get(id);
  return row ? rowToComment(row) : null;
}

// =============================================================================
// Task Log Operations
// =============================================================================

/**
 * Count total logs for a task.
 */
export function countLogsByTaskId(taskId: string): number {
  const db = getDatabase();
  const result = db
    .query<
      { count: number },
      [string]
    >(`SELECT COUNT(*) as count FROM task_logs WHERE task_id = ?`)
    .get(taskId);
  return result?.count ?? 0;
}

/**
 * Find logs for a task with pagination.
 * Returns logs sorted by created_at DESC (newest first).
 */
export function findLogsByTaskId(
  taskId: string,
  offset: number,
  limit: number,
): PaginatedResult<TaskLog> {
  const db = getDatabase();

  const total = countLogsByTaskId(taskId);

  const rows = db
    .query<TaskLogRow, [string, number, number]>(
      `SELECT * FROM task_logs
       WHERE task_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(taskId, limit, offset);

  return {
    items: rows.map(rowToLog),
    total,
    offset,
    limit,
    hasMore: offset + rows.length < total,
  };
}

/**
 * Create a new log entry for a task.
 * Returns the created TaskLog entity.
 */
export function createLog(
  id: string,
  taskId: string,
  workspaceId: string,
  eventType: string,
  actorType: ActorType,
  actorId: string | null,
  metadata: Record<string, unknown> | null,
): TaskLog {
  const db = getDatabase();
  const now = new Date().toISOString();
  const metadataJson = metadata ? JSON.stringify(metadata) : null;

  db.prepare(
    `
    INSERT INTO task_logs (id, task_id, workspace_id, event_type, actor_type, actor_id, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    id,
    taskId,
    workspaceId,
    eventType,
    actorType,
    actorId,
    metadataJson,
    now,
  );

  return findLogById(id)!;
}

/**
 * Find a log entry by ID.
 * Returns null if not found.
 */
export function findLogById(id: string): TaskLog | null {
  const db = getDatabase();
  const row = db
    .query<TaskLogRow, [string]>(`SELECT * FROM task_logs WHERE id = ?`)
    .get(id);
  return row ? rowToLog(row) : null;
}

// =============================================================================
// Task Queue Operations
// =============================================================================

/**
 * Find a queue item by task ID.
 * Returns the most recent queue item or null if none exists.
 */
export function findQueueItemByTaskId(taskId: string): TaskQueue | null {
  const db = getDatabase();
  const row = db
    .query<
      TaskQueueRow,
      [string]
    >(`SELECT * FROM task_queue WHERE task_id = ? ORDER BY created_at DESC LIMIT 1`)
    .get(taskId);
  return row ? rowToQueueItem(row) : null;
}

/**
 * Find an active queue item by task ID (queued or in_progress).
 * Returns null if no active item exists.
 */
export function findActiveQueueItemByTaskId(taskId: string): TaskQueue | null {
  const db = getDatabase();
  const row = db
    .query<
      TaskQueueRow,
      [string]
    >(`SELECT * FROM task_queue WHERE task_id = ? AND status IN ('queued', 'in_progress') ORDER BY created_at DESC LIMIT 1`)
    .get(taskId);
  return row ? rowToQueueItem(row) : null;
}

/**
 * Create a new queue item for a task.
 * Returns the created TaskQueue entity.
 */
export function createQueueItem(
  id: string,
  taskId: string,
  workspaceId: string,
): TaskQueue {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare(
    `
    INSERT INTO task_queue (id, task_id, workspace_id, status, is_priority, created_at, updated_at)
    VALUES (?, ?, ?, 'queued', 0, ?, ?)
  `,
  ).run(id, taskId, workspaceId, now, now);

  return findQueueItemById(id)!;
}

/**
 * Find a queue item by ID.
 * Returns null if not found.
 */
export function findQueueItemById(id: string): TaskQueue | null {
  const db = getDatabase();
  const row = db
    .query<TaskQueueRow, [string]>(`SELECT * FROM task_queue WHERE id = ?`)
    .get(id);
  return row ? rowToQueueItem(row) : null;
}

/**
 * Update a queue item's priority.
 * Returns true if updated, false if not found.
 */
export function updateQueueItemPriority(
  taskId: string,
  isPriority: boolean,
): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `UPDATE task_queue SET is_priority = ?, updated_at = ? WHERE task_id = ? AND status IN ('queued', 'in_progress')`,
    )
    .run(isPriority ? 1 : 0, now, taskId);
  return result.changes > 0;
}

/**
 * Update a queue item's status.
 * Returns true if updated, false if not found.
 */
export function updateQueueItemStatus(
  taskId: string,
  status: TaskQueueStatus,
): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `UPDATE task_queue SET status = ?, updated_at = ? WHERE task_id = ? AND status IN ('queued', 'in_progress')`,
    )
    .run(status, now, taskId);
  return result.changes > 0;
}

// =============================================================================
// Workspace Activity
// =============================================================================

/**
 * Update workspace last_activity_at timestamp.
 */
export function updateWorkspaceActivity(workspaceId: string): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE workspaces SET last_activity_at = ?, updated_at = ? WHERE id = ?`,
  ).run(now, now, workspaceId);
}

// =============================================================================
// Agent Lookups
// =============================================================================

/**
 * Get agent name by ID.
 * Returns null if not found.
 */
export function getAgentName(agentId: string): string | null {
  const db = getDatabase();
  const result = db
    .query<{ name: string }, [string]>(`SELECT name FROM agents WHERE id = ?`)
    .get(agentId);
  return result?.name ?? null;
}
