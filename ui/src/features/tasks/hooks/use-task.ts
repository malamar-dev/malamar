import { useQuery } from "@tanstack/react-query";

import { tasksApi } from "../api/tasks.api.ts";

/**
 * Hook for fetching a single task by ID.
 */
export const useTask = (taskId: string) => {
  return useQuery({
    queryKey: ["tasks", taskId],
    queryFn: () => tasksApi.get(taskId),
    enabled: !!taskId,
  });
};
