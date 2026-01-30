/**
 * Workspace entity as returned by the API.
 */
export interface Workspace {
  id: string;
  title: string;
  description: string;
  workingDirectory: string | null;
  retentionDays: number;
  notifyOnError: boolean;
  notifyOnInReview: boolean;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Database row representation of a workspace.
 */
export interface WorkspaceRow {
  id: string;
  title: string;
  description: string;
  working_directory: string | null;
  retention_days: number;
  notify_on_error: number; // SQLite stores boolean as 0/1
  notify_on_in_review: number; // SQLite stores boolean as 0/1
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a new workspace.
 */
export interface CreateWorkspaceInput {
  title: string;
  description?: string;
  workingDirectory?: string | null;
}

/**
 * Input for updating an existing workspace.
 */
export interface UpdateWorkspaceInput {
  title: string;
  description?: string;
  workingDirectory?: string | null;
  retentionDays?: number;
  notifyOnError?: boolean;
  notifyOnInReview?: boolean;
}
