export interface Workspace {
  id: string;
  title: string;
  description: string;
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
}

export interface UpdateWorkspaceInput {
  title: string;
  description?: string;
}
