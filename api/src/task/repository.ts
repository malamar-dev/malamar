import type { Database } from 'bun:sqlite';

import { getDb } from '../core/database.ts';
import type { QueueStatus, TaskStatus } from '../core/types.ts';
import { generateId, now } from '../shared/index.ts';
import type {
  CreateTaskCommentInput,
  CreateTaskInput,
  CreateTaskLogInput,
  CreateTaskQueueItemInput,
  Task,
  TaskComment,
  TaskCommentRow,
  TaskLog,
  TaskLogRow,
  TaskQueueItem,
  TaskQueueItemRow,
  TaskRow,
  UpdateTaskInput,
} from './types.ts';
import { rowToTask, rowToTaskComment, rowToTaskLog, rowToTaskQueueItem } from './types.ts';

// ============================================
// Task Repository
// ============================================

export function findByWorkspaceId(workspaceId: string, db: Database = getDb()): Task[] {
  const rows = db
    .query<TaskRow, [string]>('SELECT * FROM tasks WHERE workspace_id = ? ORDER BY updated_at DESC')
    .all(workspaceId);
  return rows.map(rowToTask);
}

export function findById(id: string, db: Database = getDb()): Task | null {
  const row = db.query<TaskRow, [string]>('SELECT * FROM tasks WHERE id = ?').get(id);
  return row ? rowToTask(row) : null;
}

export function create(input: CreateTaskInput, db: Database = getDb()): Task {
  const id = generateId();
  const timestamp = now();

  const row: TaskRow = {
    id,
    workspace_id: input.workspaceId,
    summary: input.summary,
    description: input.description ?? '',
    status: 'todo',
    created_at: timestamp,
    updated_at: timestamp,
  };

  db.query(
    `INSERT INTO tasks (id, workspace_id, summary, description, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.id,
    row.workspace_id,
    row.summary,
    row.description,
    row.status,
    row.created_at,
    row.updated_at
  );

  return rowToTask(row);
}

export function update(id: string, input: UpdateTaskInput, db: Database = getDb()): Task | null {
  const existing = findById(id, db);
  if (!existing) {
    return null;
  }

  const timestamp = now();
  const updates: string[] = ['updated_at = ?'];
  const values: (string | number)[] = [timestamp];

  if (input.summary !== undefined) {
    updates.push('summary = ?');
    values.push(input.summary);
  }
  if (input.description !== undefined) {
    updates.push('description = ?');
    values.push(input.description);
  }
  if (input.status !== undefined) {
    updates.push('status = ?');
    values.push(input.status);
  }

  values.push(id);
  db.query(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  return findById(id, db);
}

export function remove(id: string, db: Database = getDb()): boolean {
  const result = db.query('DELETE FROM tasks WHERE id = ?').run(id);
  return result.changes > 0;
}

export function updateStatus(id: string, status: TaskStatus, db: Database = getDb()): void {
  const timestamp = now();
  db.query('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?').run(status, timestamp, id);
}

export function deleteDoneByWorkspace(workspaceId: string, db: Database = getDb()): number {
  const result = db
    .query('DELETE FROM tasks WHERE workspace_id = ? AND status = ?')
    .run(workspaceId, 'done');
  return result.changes;
}

// ============================================
// Task Comment Repository
// ============================================

export function findCommentsByTaskId(taskId: string, db: Database = getDb()): TaskComment[] {
  const rows = db
    .query<
      TaskCommentRow,
      [string]
    >('SELECT * FROM task_comments WHERE task_id = ? ORDER BY created_at ASC')
    .all(taskId);
  return rows.map(rowToTaskComment);
}

export function createComment(input: CreateTaskCommentInput, db: Database = getDb()): TaskComment {
  const id = generateId();
  const timestamp = now();

  const row: TaskCommentRow = {
    id,
    task_id: input.taskId,
    workspace_id: input.workspaceId,
    user_id: input.userId ?? null,
    agent_id: input.agentId ?? null,
    content: input.content,
    created_at: timestamp,
    updated_at: timestamp,
  };

  db.query(
    `INSERT INTO task_comments (id, task_id, workspace_id, user_id, agent_id, content, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.id,
    row.task_id,
    row.workspace_id,
    row.user_id,
    row.agent_id,
    row.content,
    row.created_at,
    row.updated_at
  );

  return rowToTaskComment(row);
}

// ============================================
// Task Log Repository
// ============================================

export function findLogsByTaskId(taskId: string, db: Database = getDb()): TaskLog[] {
  const rows = db
    .query<
      TaskLogRow,
      [string]
    >('SELECT * FROM task_logs WHERE task_id = ? ORDER BY created_at ASC')
    .all(taskId);
  return rows.map(rowToTaskLog);
}

export function createLog(input: CreateTaskLogInput, db: Database = getDb()): TaskLog {
  const id = generateId();
  const timestamp = now();

  const row: TaskLogRow = {
    id,
    task_id: input.taskId,
    workspace_id: input.workspaceId,
    event_type: input.eventType,
    actor_type: input.actorType,
    actor_id: input.actorId ?? null,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    created_at: timestamp,
  };

  db.query(
    `INSERT INTO task_logs (id, task_id, workspace_id, event_type, actor_type, actor_id, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.id,
    row.task_id,
    row.workspace_id,
    row.event_type,
    row.actor_type,
    row.actor_id,
    row.metadata,
    row.created_at
  );

  return rowToTaskLog(row);
}

// ============================================
// Task Queue Repository
// ============================================

export function findQueuedByWorkspace(
  workspaceId: string,
  db: Database = getDb()
): TaskQueueItem[] {
  const rows = db
    .query<
      TaskQueueItemRow,
      [string, string]
    >('SELECT * FROM task_queue WHERE workspace_id = ? AND status = ? ORDER BY is_priority DESC, updated_at DESC')
    .all(workspaceId, 'queued');
  return rows.map(rowToTaskQueueItem);
}

export function findQueueItemByTaskId(
  taskId: string,
  db: Database = getDb()
): TaskQueueItem | null {
  const row = db
    .query<
      TaskQueueItemRow,
      [string, string]
    >('SELECT * FROM task_queue WHERE task_id = ? AND status = ?')
    .get(taskId, 'queued');
  return row ? rowToTaskQueueItem(row) : null;
}

export function createQueueItem(
  input: CreateTaskQueueItemInput,
  db: Database = getDb()
): TaskQueueItem {
  const id = generateId();
  const timestamp = now();

  const row: TaskQueueItemRow = {
    id,
    task_id: input.taskId,
    workspace_id: input.workspaceId,
    status: 'queued',
    is_priority: input.isPriority ? 1 : 0,
    created_at: timestamp,
    updated_at: timestamp,
  };

  db.query(
    `INSERT INTO task_queue (id, task_id, workspace_id, status, is_priority, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.id,
    row.task_id,
    row.workspace_id,
    row.status,
    row.is_priority,
    row.created_at,
    row.updated_at
  );

  return rowToTaskQueueItem(row);
}

export function updateQueueStatus(id: string, status: QueueStatus, db: Database = getDb()): void {
  const timestamp = now();
  db.query('UPDATE task_queue SET status = ?, updated_at = ? WHERE id = ?').run(
    status,
    timestamp,
    id
  );
}

export function setQueuePriority(
  taskId: string,
  isPriority: boolean,
  db: Database = getDb()
): void {
  const timestamp = now();
  db.query(
    'UPDATE task_queue SET is_priority = ?, updated_at = ? WHERE task_id = ? AND status = ?'
  ).run(isPriority ? 1 : 0, timestamp, taskId, 'queued');
}

export function deleteOldQueueItems(days: number, db: Database = getDb()): number {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const result = db
    .query('DELETE FROM task_queue WHERE (status = ? OR status = ?) AND updated_at < ?')
    .run('completed', 'failed', cutoffDate);
  return result.changes;
}

export function updateQueueItemTimestamp(taskId: string, db: Database = getDb()): void {
  const timestamp = now();
  db.query('UPDATE task_queue SET updated_at = ? WHERE task_id = ? AND status = ?').run(
    timestamp,
    taskId,
    'queued'
  );
}
