import { apiClient } from '@/lib/api-client';

import type { CreateWorkspaceInput, UpdateWorkspaceInput, Workspace } from '../types/workspace.types';

export const workspaceApi = {
  list: (query?: string) =>
    apiClient.get<Workspace[]>(`/workspaces${query ? `?q=${encodeURIComponent(query)}` : ''}`),

  get: (id: string) => apiClient.get<Workspace>(`/workspaces/${id}`),

  create: (data: CreateWorkspaceInput) => apiClient.post<Workspace>('/workspaces', data),

  update: (id: string, data: UpdateWorkspaceInput) =>
    apiClient.put<Workspace>(`/workspaces/${id}`, data),

  delete: (id: string) => apiClient.delete<void>(`/workspaces/${id}`),
};
