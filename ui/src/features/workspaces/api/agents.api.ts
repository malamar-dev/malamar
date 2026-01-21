import { apiClient } from "@/lib/api-client.ts";

import type {
  Agent,
  AgentsResponse,
  CreateAgentInput,
  ReorderAgentsInput,
  UpdateAgentInput,
} from "../types/agent.types.ts";

export const agentsApi = {
  list: (workspaceId: string) =>
    apiClient.get<AgentsResponse>(`/workspaces/${workspaceId}/agents`),
  create: (workspaceId: string, input: CreateAgentInput) =>
    apiClient.post<Agent>(`/workspaces/${workspaceId}/agents`, input),
  update: (agentId: string, input: UpdateAgentInput) =>
    apiClient.put<Agent>(`/agents/${agentId}`, input),
  delete: (agentId: string) => apiClient.delete(`/agents/${agentId}`),
  reorder: (workspaceId: string, input: ReorderAgentsInput) =>
    apiClient.put<AgentsResponse>(
      `/workspaces/${workspaceId}/agents/reorder`,
      input,
    ),
};
