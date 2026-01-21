import { generateId } from "../shared";
import * as repository from "./repository";
import type { Agent, CreateAgentInput, UpdateAgentInput } from "./types";

/**
 * List all agents for a workspace.
 */
export function listAgents(workspaceId: string): Agent[] {
  return repository.findByWorkspaceId(workspaceId);
}

/**
 * Get an agent by ID.
 * Returns null if not found.
 */
export function getAgent(id: string): Agent | null {
  return repository.findById(id);
}

/**
 * Create a new agent in a workspace.
 */
export function createAgent(
  workspaceId: string,
  input: CreateAgentInput,
): Agent {
  const now = new Date();
  const maxOrder = repository.getMaxOrder(workspaceId);

  const agent: Agent = {
    id: generateId(),
    workspaceId,
    name: input.name,
    instruction: input.instruction,
    cliType: input.cliType,
    order: maxOrder + 1,
    createdAt: now,
    updatedAt: now,
  };

  return repository.create(agent);
}

/**
 * Update an existing agent.
 * Returns null if not found.
 */
export function updateAgent(id: string, input: UpdateAgentInput): Agent | null {
  return repository.update(id, input);
}

/**
 * Delete an agent by ID.
 * Returns true if deleted, false if not found.
 */
export function deleteAgent(id: string): boolean {
  return repository.deleteById(id);
}

/**
 * Reorder agents in a workspace.
 * Returns null if any agent ID is invalid.
 */
export function reorderAgents(
  workspaceId: string,
  agentIds: string[],
): Agent[] | null {
  // Validate all agent IDs belong to the workspace
  if (!repository.validateAgentIds(workspaceId, agentIds)) {
    return null;
  }

  return repository.reorder(workspaceId, agentIds);
}
