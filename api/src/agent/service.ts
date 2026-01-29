import { err, generateId, ok, type Result } from "../shared";
import * as workspaceRepository from "../workspace/repository";
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
 */
export function getAgent(id: string): Result<Agent> {
  const agent = repository.findById(id);
  if (!agent) {
    return err("Agent not found", "NOT_FOUND");
  }
  return ok(agent);
}

/**
 * Create a new agent in a workspace.
 */
export function createAgent(
  workspaceId: string,
  input: CreateAgentInput,
): Result<Agent> {
  // Validate workspace exists
  const workspace = workspaceRepository.findById(workspaceId);
  if (!workspace) {
    return err("Workspace not found", "NOT_FOUND");
  }

  // Check for duplicate name in workspace
  if (repository.existsByNameInWorkspace(workspaceId, input.name)) {
    return err(
      "An agent with this name already exists in the workspace",
      "CONFLICT",
    );
  }

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

  return ok(repository.create(agent));
}

/**
 * Update an existing agent.
 */
export function updateAgent(
  id: string,
  input: UpdateAgentInput,
): Result<Agent> {
  // First get the existing agent to check workspace and name
  const existingAgent = repository.findById(id);
  if (!existingAgent) {
    return err("Agent not found", "NOT_FOUND");
  }

  // If name is being changed, check for duplicate
  if (
    input.name &&
    input.name !== existingAgent.name &&
    repository.existsByNameInWorkspace(
      existingAgent.workspaceId,
      input.name,
      id,
    )
  ) {
    return err(
      "An agent with this name already exists in the workspace",
      "CONFLICT",
    );
  }

  const agent = repository.update(id, input);
  if (!agent) {
    return err("Agent not found", "NOT_FOUND");
  }
  return ok(agent);
}

/**
 * Delete an agent by ID.
 */
export function deleteAgent(id: string): Result<boolean> {
  const deleted = repository.deleteById(id);
  if (!deleted) {
    return err("Agent not found", "NOT_FOUND");
  }
  return ok(true);
}

/**
 * Reorder agents in a workspace.
 */
export function reorderAgents(
  workspaceId: string,
  agentIds: string[],
): Result<Agent[]> {
  // Validate workspace exists
  const workspace = workspaceRepository.findById(workspaceId);
  if (!workspace) {
    return err("Workspace not found", "NOT_FOUND");
  }

  // Validate all agent IDs belong to the workspace
  if (!repository.validateAgentIds(workspaceId, agentIds)) {
    return err(
      "One or more agent IDs are invalid or do not belong to this workspace",
      "VALIDATION_ERROR",
    );
  }

  return ok(repository.reorder(workspaceId, agentIds));
}
