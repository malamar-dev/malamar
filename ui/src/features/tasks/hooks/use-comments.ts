import { useQuery } from "@tanstack/react-query";

import { tasksApi } from "../api/tasks.api.ts";

/**
 * Hook for fetching comments for a task.
 */
export const useComments = (taskId: string) => {
  return useQuery({
    queryKey: ["tasks", taskId, "comments"],
    queryFn: () => tasksApi.getComments(taskId),
    enabled: !!taskId,
  });
};
