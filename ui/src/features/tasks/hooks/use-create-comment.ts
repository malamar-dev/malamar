import { useMutation, useQueryClient } from "@tanstack/react-query";

import { tasksApi } from "../api/tasks.api.ts";
import type { CreateCommentInput } from "../types/task.types.ts";

/**
 * Hook for adding a comment to a task.
 */
export const useCreateComment = (taskId: string, workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCommentInput) =>
      tasksApi.createComment(taskId, input),
    onSuccess: () => {
      // Invalidate comments list
      queryClient.invalidateQueries({
        queryKey: ["tasks", taskId, "comments"],
      });
      // Invalidate activity logs (comment_added event)
      queryClient.invalidateQueries({ queryKey: ["tasks", taskId, "logs"] });
      // Invalidate tasks list (comment triggers queue item)
      queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
    },
  });
};
