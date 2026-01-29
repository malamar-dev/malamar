import { useQuery } from "@tanstack/react-query";

import { tasksApi } from "../api/tasks.api.ts";

/**
 * Hook for fetching activity logs for a task.
 */
export const useLogs = (taskId: string) => {
  return useQuery({
    queryKey: ["tasks", taskId, "logs"],
    queryFn: () => tasksApi.getLogs(taskId),
    enabled: !!taskId,
  });
};
