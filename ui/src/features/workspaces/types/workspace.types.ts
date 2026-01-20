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
