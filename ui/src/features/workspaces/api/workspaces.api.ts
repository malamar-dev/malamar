import { apiClient } from "@/lib/api-client.ts";

import type {
  CreateWorkspaceInput,
  Workspace,
  WorkspacesResponse,
} from "../types/workspace.types.ts";

export const workspacesApi = {
  list: () => apiClient.get<WorkspacesResponse>("/workspaces"),
  create: (input: CreateWorkspaceInput) =>
    apiClient.post<Workspace>("/workspaces", input),
};
