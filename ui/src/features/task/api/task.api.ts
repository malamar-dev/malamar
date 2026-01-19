import { apiClient } from '@/lib/api-client';

import type {
  CreateTaskInput,
  Task,
  TaskComment,
  TaskLog,
  UpdateTaskInput,
} from '../types/task.types';

export const taskApi = {
  list: (workspaceId: string) => apiClient.get<Task[]>(`/workspaces/${workspaceId}/tasks`),

  get: (id: string) => apiClient.get<Task>(`/tasks/${id}`),

  create: (workspaceId: string, data: CreateTaskInput) =>
    apiClient.post<Task>(`/workspaces/${workspaceId}/tasks`, data),

  update: (id: string, data: UpdateTaskInput) => apiClient.put<Task>(`/tasks/${id}`, data),

  delete: (id: string) => apiClient.delete<void>(`/tasks/${id}`),

  prioritize: (id: string) => apiClient.post<Task>(`/tasks/${id}/prioritize`),

  deprioritize: (id: string) => apiClient.post<Task>(`/tasks/${id}/deprioritize`),

  cancel: (id: string) => apiClient.post<Task>(`/tasks/${id}/cancel`),

  deleteDone: (workspaceId: string) =>
    apiClient.delete<void>(`/workspaces/${workspaceId}/tasks/done`),

  getComments: (id: string) => apiClient.get<TaskComment[]>(`/tasks/${id}/comments`),

  addComment: (id: string, content: string) =>
    apiClient.post<TaskComment>(`/tasks/${id}/comments`, { content }),

  getLogs: (id: string) => apiClient.get<TaskLog[]>(`/tasks/${id}/logs`),
};
