/**
 * Workspace entity as returned by the API.
 */
export interface Workspace {
  id: string;
  title: string;
  description: string;
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
}
