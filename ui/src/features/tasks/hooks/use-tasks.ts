import { useQuery } from "@tanstack/react-query";

import { tasksApi } from "../api/tasks.api.ts";

/**
 * Hook for fetching all tasks for a workspace.
 */
export const useTasks = (workspaceId: string) => {
  return useQuery({
    queryKey: ["tasks", workspaceId],
    queryFn: () => tasksApi.list(workspaceId),
    enabled: !!workspaceId,
  });
};
