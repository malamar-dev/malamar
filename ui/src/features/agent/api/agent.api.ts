import { apiClient } from '@/lib/api-client';

import type { Agent, CreateAgentInput, UpdateAgentInput } from '../types/agent.types';

export const agentApi = {
  list: (workspaceId: string) => apiClient.get<Agent[]>(`/workspaces/${workspaceId}/agents`),

  create: (workspaceId: string, data: CreateAgentInput) =>
    apiClient.post<Agent>(`/workspaces/${workspaceId}/agents`, data),

  update: (id: string, data: UpdateAgentInput) => apiClient.put<Agent>(`/agents/${id}`, data),

  delete: (id: string) => apiClient.delete<void>(`/agents/${id}`),

  reorder: (workspaceId: string, agentIds: string[]) =>
    apiClient.put<void>(`/workspaces/${workspaceId}/agents/reorder`, { agent_ids: agentIds }),
};
