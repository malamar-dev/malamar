import { apiClient } from "@/lib/api-client.ts";

import type { WorkspacesResponse } from "../types/workspace.types.ts";

export const workspacesApi = {
  list: () => apiClient.get<WorkspacesResponse>("/workspaces"),
};
