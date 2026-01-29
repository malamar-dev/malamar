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
 * Returns comments sorted by created_at ASC (oldest first for reading flow).
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
       ORDER BY created_at ASC
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
 * Returns logs sorted by created_at ASC (oldest first for timeline view).
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
       ORDER BY created_at ASC
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
 * Updates the most recent queue item for the task, regardless of status.
 * Returns true if updated, false if not found.
 */
export function updateQueueItemPriority(
  taskId: string,
  isPriority: boolean,
): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();
  // Find the most recent queue item and update its priority
  const result = db
    .prepare(
      `UPDATE task_queue SET is_priority = ?, updated_at = ?
       WHERE id = (SELECT id FROM task_queue WHERE task_id = ? ORDER BY created_at DESC LIMIT 1)`,
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

// =============================================================================
// Queue Processor Support
// =============================================================================

/**
 * Find workspace IDs that have queued task queue items.
 * Only includes workspaces where the associated task is in "todo" or "in_progress" status.
 */
export function findWorkspacesWithQueuedItems(): string[] {
  const db = getDatabase();
  const rows = db
    .query<{ workspace_id: string }, []>(
      `SELECT DISTINCT tq.workspace_id
       FROM task_queue tq
       JOIN tasks t ON tq.task_id = t.id
       WHERE tq.status = 'queued'
       AND t.status IN ('todo', 'in_progress')`,
    )
    .all();
  return rows.map((row) => row.workspace_id);
}

/**
 * Pick the next queue item for a workspace using the pickup algorithm.
 * Order:
 * 1. Priority items first (is_priority = 1)
 * 2. Task with most recent completed/failed queue item (continue working on same task)
 * 3. LIFO fallback (most recently updated queued item)
 *
 * Only considers items where task status is "todo" or "in_progress".
 */
export function pickNextQueueItem(workspaceId: string): TaskQueue | null {
  const db = getDatabase();

  // Step 1: Try to find a priority item
  const priorityRow = db
    .query<TaskQueueRow, [string]>(
      `SELECT tq.*
       FROM task_queue tq
       JOIN tasks t ON tq.task_id = t.id
       WHERE tq.workspace_id = ?
       AND tq.status = 'queued'
       AND tq.is_priority = 1
       AND t.status IN ('todo', 'in_progress')
       ORDER BY tq.updated_at DESC
       LIMIT 1`,
    )
    .get(workspaceId);

  if (priorityRow) {
    return rowToQueueItem(priorityRow);
  }

  // Step 2: Find task with most recently processed queue item and pick its queued item
  const recentTaskRow = db
    .query<{ task_id: string }, [string]>(
      `SELECT task_id
       FROM task_queue
       WHERE workspace_id = ?
       AND status IN ('completed', 'failed')
       ORDER BY updated_at DESC
       LIMIT 1`,
    )
    .get(workspaceId);

  if (recentTaskRow) {
    const recentlyProcessedRow = db
      .query<TaskQueueRow, [string, string]>(
        `SELECT tq.*
         FROM task_queue tq
         JOIN tasks t ON tq.task_id = t.id
         WHERE tq.task_id = ?
         AND tq.workspace_id = ?
         AND tq.status = 'queued'
         AND t.status IN ('todo', 'in_progress')
         LIMIT 1`,
      )
      .get(recentTaskRow.task_id, workspaceId);

    if (recentlyProcessedRow) {
      return rowToQueueItem(recentlyProcessedRow);
    }
  }

  // Step 3: LIFO fallback - most recently updated queued item
  const lifoRow = db
    .query<TaskQueueRow, [string]>(
      `SELECT tq.*
       FROM task_queue tq
       JOIN tasks t ON tq.task_id = t.id
       WHERE tq.workspace_id = ?
       AND tq.status = 'queued'
       AND t.status IN ('todo', 'in_progress')
       ORDER BY tq.updated_at DESC
       LIMIT 1`,
    )
    .get(workspaceId);

  return lifoRow ? rowToQueueItem(lifoRow) : null;
}

/**
 * Atomically claim a queue item.
 * Updates status from 'queued' to 'in_progress'.
 * Returns the claimed item if successful, null if already claimed by another processor.
 */
export function claimQueueItem(queueId: string): TaskQueue | null {
  const db = getDatabase();
  const now = new Date().toISOString();

  // Atomic update: only succeeds if status is still 'queued'
  const result = db
    .prepare(
      `UPDATE task_queue
       SET status = 'in_progress', updated_at = ?
       WHERE id = ? AND status = 'queued'`,
    )
    .run(now, queueId);

  // Check if we actually updated a row
  if (result.changes === 0) {
    return null; // Someone else claimed it
  }

  return findQueueItemById(queueId);
}

/**
 * Update a queue item's status by ID.
 * Returns true if updated, false if not found.
 */
export function updateQueueStatusById(
  queueId: string,
  status: TaskQueueStatus,
): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();
  const result = db
    .prepare(`UPDATE task_queue SET status = ?, updated_at = ? WHERE id = ?`)
    .run(status, now, queueId);
  return result.changes > 0;
}

/**
 * Find all comments for a task ordered ASC (oldest first).
 * Used for generating CLI context.
 */
export function findAllCommentsByTaskId(taskId: string): TaskComment[] {
  const db = getDatabase();
  const rows = db
    .query<
      TaskCommentRow,
      [string]
    >(`SELECT * FROM task_comments WHERE task_id = ? ORDER BY created_at ASC`)
    .all(taskId);
  return rows.map(rowToComment);
}

/**
 * Find all logs for a task ordered ASC (oldest first).
 * Used for generating CLI context.
 */
export function findAllLogsByTaskId(taskId: string): TaskLog[] {
  const db = getDatabase();
  const rows = db
    .query<
      TaskLogRow,
      [string]
    >(`SELECT * FROM task_logs WHERE task_id = ? ORDER BY created_at ASC`)
    .all(taskId);
  return rows.map(rowToLog);
}

/**
 * Demote other in-progress tasks to todo for a workspace.
 * Excludes the given task ID.
 * Per spec: only one task per workspace should be "In Progress" at a time.
 */
export function demoteOtherInProgressTasks(
  workspaceId: string,
  excludeTaskId: string,
): void {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE tasks
     SET status = 'todo', updated_at = ?
     WHERE workspace_id = ?
     AND status = 'in_progress'
     AND id != ?`,
  ).run(now, workspaceId, excludeTaskId);
}

/**
 * Reset in-progress queue items to queued.
 * Called on startup for crash recovery.
 */
export function resetInProgressQueueItems(): void {
  const db = getDatabase();
  const now = new Date().toISOString();

  const result = db
    .prepare(
      `UPDATE task_queue SET status = 'queued', updated_at = ? WHERE status = 'in_progress'`,
    )
    .run(now);

  if (result.changes > 0) {
    console.log(
      `[TaskRepository] Reset ${result.changes} in-progress queue items to queued`,
    );
  }
}
