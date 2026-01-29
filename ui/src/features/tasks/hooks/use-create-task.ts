import { useMutation, useQueryClient } from "@tanstack/react-query";

import { tasksApi } from "../api/tasks.api.ts";
import type { CreateTaskInput } from "../types/task.types.ts";

/**
 * Hook for creating a new task.
 */
export const useCreateTask = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTaskInput) => tasksApi.create(workspaceId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
    },
  });
};
