export interface Workspace {
  id: string;
  title: string;
  description: string;
  workingDirectory: string | null;
  retentionDays: number;
  notifyOnError: boolean;
  notifyOnInReview: boolean;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspacesResponse {
  workspaces: Workspace[];
}

export interface CreateWorkspaceInput {
  title: string;
  description?: string;
  workingDirectory?: string | null;
}

export interface UpdateWorkspaceInput {
  title: string;
  description?: string;
  workingDirectory?: string | null;
  retentionDays?: number;
  notifyOnError?: boolean;
  notifyOnInReview?: boolean;
}
