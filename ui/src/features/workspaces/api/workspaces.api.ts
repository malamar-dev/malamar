import { apiClient } from "@/lib/api-client.ts";

import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  Workspace,
  WorkspacesResponse,
} from "../types/workspace.types.ts";

export const workspacesApi = {
  list: () => apiClient.get<WorkspacesResponse>("/workspaces"),
  get: (id: string) => apiClient.get<Workspace>(`/workspaces/${id}`),
  create: (input: CreateWorkspaceInput) =>
    apiClient.post<Workspace>("/workspaces", input),
  update: (id: string, input: UpdateWorkspaceInput) =>
    apiClient.put<Workspace>(`/workspaces/${id}`, input),
};
