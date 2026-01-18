import type { WorkingDirectoryMode } from '../core/types.ts';

/**
 * Workspace entity as returned from the database
 */
export interface WorkspaceRow {
  id: string;
  title: string;
  description: string;
  working_directory_mode: WorkingDirectoryMode;
  working_directory_path: string | null;
  auto_delete_done_tasks: number; // SQLite stores boolean as 0/1
  retention_days: number;
  notify_on_error: number;
  notify_on_in_review: number;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Workspace entity with normalized types
 */
export interface Workspace {
  id: string;
  title: string;
  description: string;
  workingDirectoryMode: WorkingDirectoryMode;
  workingDirectoryPath: string | null;
  autoDeleteDoneTasks: boolean;
  retentionDays: number;
  notifyOnError: boolean;
  notifyOnInReview: boolean;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating a new workspace
 */
export interface CreateWorkspaceInput {
  title: string;
  description?: string;
  workingDirectoryMode?: WorkingDirectoryMode;
  workingDirectoryPath?: string | null;
  autoDeleteDoneTasks?: boolean;
  retentionDays?: number;
  notifyOnError?: boolean;
  notifyOnInReview?: boolean;
}

/**
 * Input for updating an existing workspace
 */
export interface UpdateWorkspaceInput {
  title?: string;
  description?: string;
  workingDirectoryMode?: WorkingDirectoryMode;
  workingDirectoryPath?: string | null;
  autoDeleteDoneTasks?: boolean;
  retentionDays?: number;
  notifyOnError?: boolean;
  notifyOnInReview?: boolean;
}

/**
 * Convert database row to Workspace entity
 */
export function rowToWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    workingDirectoryMode: row.working_directory_mode,
    workingDirectoryPath: row.working_directory_path,
    autoDeleteDoneTasks: row.auto_delete_done_tasks === 1,
    retentionDays: row.retention_days,
    notifyOnError: row.notify_on_error === 1,
    notifyOnInReview: row.notify_on_in_review === 1,
    lastActivityAt: row.last_activity_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
