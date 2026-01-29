import { useMutation, useQueryClient } from "@tanstack/react-query";

import { tasksApi } from "../api/tasks.api.ts";

/**
 * Hook for prioritizing a task (moves to front of queue).
 */
export const usePrioritizeTask = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => tasksApi.prioritize(taskId),
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", updatedTask.id] });
    },
  });
};
