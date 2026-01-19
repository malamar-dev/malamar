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
    onSuccess: (_, { id }) => {
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
    onSuccess: (_, { taskId }) => {
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
