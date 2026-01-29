import { useMutation, useQueryClient } from "@tanstack/react-query";

import { tasksApi } from "../api/tasks.api.ts";

interface PrioritizeTaskInput {
  taskId: string;
  isPriority: boolean;
}

/**
 * Hook for prioritizing or deprioritizing a task.
 */
export const usePrioritizeTask = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, isPriority }: PrioritizeTaskInput) =>
      tasksApi.prioritize(taskId, isPriority),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", variables.taskId] });
    },
  });
};
