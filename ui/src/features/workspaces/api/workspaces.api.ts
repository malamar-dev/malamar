import { apiClient } from "@/lib/api-client.ts";

import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  Workspace,
  WorkspacesResponse,
} from "../types/workspace.types.ts";

export const workspacesApi = {
  /**
   * Fetches all workspaces.
   * @returns List of all workspaces
   */
  list: () => apiClient.get<WorkspacesResponse>("/workspaces"),

  /**
   * Fetches a single workspace by its ID.
   * @param id - The workspace ID
   * @returns The workspace details
   */
  get: (id: string) => apiClient.get<Workspace>(`/workspaces/${id}`),

  /**
   * Creates a new workspace.
   * @param input - The workspace creation data
   * @returns The newly created workspace
   */
  create: (input: CreateWorkspaceInput) =>
    apiClient.post<Workspace>("/workspaces", input),

  /**
   * Updates an existing workspace.
   * @param id - The workspace ID to update
   * @param input - The updated workspace data
   * @returns The updated workspace
   */
  update: (id: string, input: UpdateWorkspaceInput) =>
    apiClient.put<Workspace>(`/workspaces/${id}`, input),
};
