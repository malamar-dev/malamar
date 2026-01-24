import { apiClient } from "@/lib/api-client.ts";

import type {
  Agent,
  AgentsResponse,
  CreateAgentInput,
  ReorderAgentsInput,
  UpdateAgentInput,
} from "../types/agent.types.ts";

export const agentsApi = {
  /**
   * Fetches all agents for a workspace.
   * @param workspaceId - The workspace ID to fetch agents for
   * @returns List of agents in the workspace
   */
  list: (workspaceId: string) =>
    apiClient.get<AgentsResponse>(`/workspaces/${workspaceId}/agents`),

  /**
   * Creates a new agent in a workspace.
   * @param workspaceId - The workspace ID to create the agent in
   * @param input - The agent creation data
   * @returns The newly created agent
   */
  create: (workspaceId: string, input: CreateAgentInput) =>
    apiClient.post<Agent>(`/workspaces/${workspaceId}/agents`, input),

  /**
   * Updates an existing agent.
   * @param agentId - The agent ID to update
   * @param input - The updated agent data
   * @returns The updated agent
   */
  update: (agentId: string, input: UpdateAgentInput) =>
    apiClient.put<Agent>(`/agents/${agentId}`, input),

  /**
   * Deletes an agent.
   * @param agentId - The agent ID to delete
   */
  delete: (agentId: string) => apiClient.delete(`/agents/${agentId}`),

  /**
   * Reorders agents within a workspace.
   * @param workspaceId - The workspace ID containing the agents
   * @param input - The new agent order (array of agent IDs)
   * @returns The updated list of agents
   */
  reorder: (workspaceId: string, input: ReorderAgentsInput) =>
    apiClient.put<AgentsResponse>(
      `/workspaces/${workspaceId}/agents/reorder`,
      input,
    ),
};
