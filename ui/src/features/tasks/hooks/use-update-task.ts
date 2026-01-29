import { useMutation, useQueryClient } from "@tanstack/react-query";

import { tasksApi } from "../api/tasks.api.ts";
import type { UpdateTaskInput } from "../types/task.types.ts";

/**
 * Hook for updating a task.
 */
export const useUpdateTask = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      input,
    }: {
      taskId: string;
      input: UpdateTaskInput;
    }) => tasksApi.update(taskId, input),
    onSuccess: (updatedTask) => {
      // Invalidate tasks list
      queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
      // Invalidate single task query
      queryClient.invalidateQueries({ queryKey: ["tasks", updatedTask.id] });
    },
  });
};
