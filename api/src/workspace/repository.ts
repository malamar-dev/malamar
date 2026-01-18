import type { Database } from 'bun:sqlite';

import { getDb } from '../core/database.ts';
import { generateId, now } from '../shared/index.ts';
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  Workspace,
  WorkspaceRow,
} from './types.ts';
import { rowToWorkspace } from './types.ts';

export function findAll(db: Database = getDb()): Workspace[] {
  const rows = db
    .query<WorkspaceRow, []>('SELECT * FROM workspaces ORDER BY last_activity_at DESC')
    .all();
  return rows.map(rowToWorkspace);
}

export function findById(id: string, db: Database = getDb()): Workspace | null {
  const row = db.query<WorkspaceRow, [string]>('SELECT * FROM workspaces WHERE id = ?').get(id);
  return row ? rowToWorkspace(row) : null;
}

export function search(query: string, db: Database = getDb()): Workspace[] {
  const rows = db
    .query<
      WorkspaceRow,
      [string]
    >('SELECT * FROM workspaces WHERE title LIKE ? ORDER BY last_activity_at DESC')
    .all(`%${query}%`);
  return rows.map(rowToWorkspace);
}

export function create(input: CreateWorkspaceInput, db: Database = getDb()): Workspace {
  const id = generateId();
  const timestamp = now();

  const row: WorkspaceRow = {
    id,
    title: input.title,
    description: input.description ?? '',
    working_directory_mode: input.workingDirectoryMode ?? 'temp',
    working_directory_path: input.workingDirectoryPath ?? null,
    auto_delete_done_tasks: input.autoDeleteDoneTasks !== false ? 1 : 0,
    retention_days: input.retentionDays ?? 7,
    notify_on_error: input.notifyOnError !== false ? 1 : 0,
    notify_on_in_review: input.notifyOnInReview !== false ? 1 : 0,
    last_activity_at: timestamp,
    created_at: timestamp,
    updated_at: timestamp,
  };

  db.query(
    `INSERT INTO workspaces (
      id, title, description, working_directory_mode, working_directory_path,
      auto_delete_done_tasks, retention_days, notify_on_error, notify_on_in_review,
      last_activity_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.id,
    row.title,
    row.description,
    row.working_directory_mode,
    row.working_directory_path,
    row.auto_delete_done_tasks,
    row.retention_days,
    row.notify_on_error,
    row.notify_on_in_review,
    row.last_activity_at,
    row.created_at,
    row.updated_at
  );

  return rowToWorkspace(row);
}

export function update(
  id: string,
  input: UpdateWorkspaceInput,
  db: Database = getDb()
): Workspace | null {
  const existing = findById(id, db);
  if (!existing) {
    return null;
  }

  const timestamp = now();
  const updates: string[] = ['updated_at = ?'];
  const values: (string | number | null)[] = [timestamp];

  if (input.title !== undefined) {
    updates.push('title = ?');
    values.push(input.title);
  }
  if (input.description !== undefined) {
    updates.push('description = ?');
    values.push(input.description);
  }
  if (input.workingDirectoryMode !== undefined) {
    updates.push('working_directory_mode = ?');
    values.push(input.workingDirectoryMode);
  }
  if (input.workingDirectoryPath !== undefined) {
    updates.push('working_directory_path = ?');
    values.push(input.workingDirectoryPath);
  }
  if (input.autoDeleteDoneTasks !== undefined) {
    updates.push('auto_delete_done_tasks = ?');
    values.push(input.autoDeleteDoneTasks ? 1 : 0);
  }
  if (input.retentionDays !== undefined) {
    updates.push('retention_days = ?');
    values.push(input.retentionDays);
  }
  if (input.notifyOnError !== undefined) {
    updates.push('notify_on_error = ?');
    values.push(input.notifyOnError ? 1 : 0);
  }
  if (input.notifyOnInReview !== undefined) {
    updates.push('notify_on_in_review = ?');
    values.push(input.notifyOnInReview ? 1 : 0);
  }

  values.push(id);
  db.query(`UPDATE workspaces SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  return findById(id, db);
}

export function remove(id: string, db: Database = getDb()): boolean {
  const result = db.query('DELETE FROM workspaces WHERE id = ?').run(id);
  return result.changes > 0;
}

export function updateLastActivity(id: string, db: Database = getDb()): void {
  const timestamp = now();
  db.query('UPDATE workspaces SET last_activity_at = ?, updated_at = ? WHERE id = ?').run(
    timestamp,
    timestamp,
    id
  );
}
