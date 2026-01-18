import { ConflictError, NotFoundError } from '../core/errors.ts';
import * as repository from './repository.ts';
import type { Agent, CreateAgentInput, UpdateAgentInput } from './types.ts';

export function listAgents(workspaceId: string): Agent[] {
  return repository.findByWorkspaceId(workspaceId);
}

export function getAgent(id: string): Agent {
  const agent = repository.findById(id);
  if (!agent) {
    throw new NotFoundError(`Agent not found: ${id}`);
  }
  return agent;
}

export function createAgent(input: CreateAgentInput): Agent {
  // Check for unique name within workspace
  const existing = repository.findByName(input.workspaceId, input.name);
  if (existing) {
    throw new ConflictError(`Agent name already exists: ${input.name}`);
  }
  return repository.create(input);
}

export function updateAgent(id: string, input: UpdateAgentInput): Agent {
  const existing = repository.findById(id);
  if (!existing) {
    throw new NotFoundError(`Agent not found: ${id}`);
  }

  // If name is being changed, check for uniqueness
  if (input.name !== undefined && input.name !== existing.name) {
    const nameExists = repository.findByName(existing.workspaceId, input.name);
    if (nameExists) {
      throw new ConflictError(`Agent name already exists: ${input.name}`);
    }
  }

  const updated = repository.update(id, input);
  if (!updated) {
    throw new NotFoundError(`Agent not found: ${id}`);
  }
  return updated;
}

export function deleteAgent(id: string): void {
  const deleted = repository.remove(id);
  if (!deleted) {
    throw new NotFoundError(`Agent not found: ${id}`);
  }
}

export function reorderAgents(workspaceId: string, agentIds: string[]): void {
  repository.reorder(workspaceId, agentIds);
}
