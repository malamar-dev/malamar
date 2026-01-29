import { getDatabase } from "../core";
import type { Workspace, WorkspaceRow } from "./types";

/**
 * Convert a database row to a Workspace entity.
 */
function rowToWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    workingDirectory: row.working_directory,
    lastActivityAt: new Date(row.last_activity_at),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Find all workspaces, optionally filtered by search query.
 * Results are sorted by last_activity_at DESC.
 */
export function findAll(searchQuery?: string): Workspace[] {
  const db = getDatabase();

  if (searchQuery) {
    const rows = db
      .query<
        WorkspaceRow,
        [string]
      >(`SELECT * FROM workspaces WHERE title LIKE ? ORDER BY last_activity_at DESC`)
      .all(`%${searchQuery}%`);
    return rows.map(rowToWorkspace);
  }

  const rows = db
    .query<
      WorkspaceRow,
      []
    >(`SELECT * FROM workspaces ORDER BY last_activity_at DESC`)
    .all();
  return rows.map(rowToWorkspace);
}

/**
 * Find a workspace by ID.
 * Returns null if not found.
 */
export function findById(id: string): Workspace | null {
  const db = getDatabase();
  const row = db
    .query<WorkspaceRow, [string]>(`SELECT * FROM workspaces WHERE id = ?`)
    .get(id);
  return row ? rowToWorkspace(row) : null;
}

/**
 * Create a new workspace in the database.
 */
export function create(workspace: Workspace): Workspace {
  const db = getDatabase();
  db.prepare(
    `
    INSERT INTO workspaces (id, title, description, working_directory, last_activity_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    workspace.id,
    workspace.title,
    workspace.description,
    workspace.workingDirectory,
    workspace.lastActivityAt.toISOString(),
    workspace.createdAt.toISOString(),
    workspace.updatedAt.toISOString(),
  );
  return workspace;
}

/**
 * Update an existing workspace in the database.
 * Returns the updated workspace, or null if not found.
 */
export function update(
  id: string,
  title: string,
  description: string,
  workingDirectory: string | null,
  updatedAt: Date,
): Workspace | null {
  const db = getDatabase();
  const result = db
    .prepare(
      `
    UPDATE workspaces
    SET title = ?, description = ?, working_directory = ?, updated_at = ?
    WHERE id = ?
  `,
    )
    .run(title, description, workingDirectory, updatedAt.toISOString(), id);

  if (result.changes === 0) {
    return null;
  }

  return findById(id);
}

/**
 * Delete a workspace by ID.
 * Returns true if the workspace was deleted, false if not found.
 * Note: CASCADE DELETE is configured in the schema for related tables.
 */
export function remove(id: string): boolean {
  const db = getDatabase();
  const result = db.prepare(`DELETE FROM workspaces WHERE id = ?`).run(id);
  return result.changes > 0;
}
