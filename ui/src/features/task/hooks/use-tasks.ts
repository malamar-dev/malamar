import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { taskApi } from '../api/task.api';
import type { CreateTaskInput, UpdateTaskInput } from '../types/task.types';

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (workspaceId: string) => [...taskKeys.lists(), workspaceId] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  comments: (id: string) => [...taskKeys.detail(id), 'comments'] as const,
  logs: (id: string) => [...taskKeys.detail(id), 'logs'] as const,
};

export function useTasks(workspaceId: string) {
  return useQuery({
    queryKey: taskKeys.list(workspaceId),
    queryFn: () => taskApi.list(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => taskApi.get(id),
    enabled: !!id,
  });
}

export function useCreateTask(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskInput) => taskApi.create(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.list(workspaceId) });
    },
  });
}

export function useUpdateTask(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskInput }) => taskApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.list(workspaceId) });
    },
  });
}

export function useDeleteTask(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taskApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.list(workspaceId) });
    },
  });
}

export function usePrioritizeTask(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, prioritize }: { id: string; prioritize: boolean }) =>
      prioritize ? taskApi.prioritize(id) : taskApi.deprioritize(id),
    onMutate: async ({ id, prioritize }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: taskKeys.list(workspaceId) });

      // Snapshot previous value
      const previousTask = queryClient.getQueryData(taskKeys.detail(id));
      const previousTasks = queryClient.getQueryData(taskKeys.list(workspaceId));

      // Optimistically update the task
      queryClient.setQueryData(taskKeys.detail(id), (old: { is_prioritized?: boolean }) =>
        old ? { ...old, is_prioritized: prioritize } : old
      );

      // Optimistically update the task in the list
      queryClient.setQueryData(taskKeys.list(workspaceId), (old: { id: string; is_prioritized?: boolean }[]) =>
        old?.map((task: { id: string; is_prioritized?: boolean }) =>
          task.id === id ? { ...task, is_prioritized: prioritize } : task
        )
      );

      return { previousTask, previousTasks };
    },
    onError: (_, { id }, context) => {
      // Rollback on error
      if (context?.previousTask) {
        queryClient.setQueryData(taskKeys.detail(id), context.previousTask);
      }
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.list(workspaceId), context.previousTasks);
      }
    },
    onSettled: (_, __, { id }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.list(workspaceId) });
    },
  });
}

export function useCancelTask(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taskApi.cancel(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.list(workspaceId) });
    },
  });
}

export function useDeleteDoneTasks(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => taskApi.deleteDone(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.list(workspaceId) });
    },
  });
}

export function useTaskComments(taskId: string) {
  return useQuery({
    queryKey: taskKeys.comments(taskId),
    queryFn: () => taskApi.getComments(taskId),
    enabled: !!taskId,
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, content }: { taskId: string; content: string }) =>
      taskApi.addComment(taskId, content),
    onMutate: async ({ taskId, content }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.comments(taskId) });

      // Snapshot previous value
      const previousComments = queryClient.getQueryData(taskKeys.comments(taskId));

      // Optimistically add the new comment
      queryClient.setQueryData(taskKeys.comments(taskId), (old: unknown[]) => [
        ...(old || []),
        {
          id: `temp-${Date.now()}`,
          task_id: taskId,
          author_type: 'human',
          author_name: 'You',
          content,
          created_at: new Date().toISOString(),
        },
      ]);

      return { previousComments };
    },
    onError: (_, { taskId }, context) => {
      // Rollback on error
      if (context?.previousComments) {
        queryClient.setQueryData(taskKeys.comments(taskId), context.previousComments);
      }
    },
    onSettled: (_, __, { taskId }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: taskKeys.comments(taskId) });
    },
  });
}

export function useTaskLogs(taskId: string) {
  return useQuery({
    queryKey: taskKeys.logs(taskId),
    queryFn: () => taskApi.getLogs(taskId),
    enabled: !!taskId,
  });
}
