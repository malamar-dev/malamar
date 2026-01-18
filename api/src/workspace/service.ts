import { NotFoundError } from '../core/errors.ts';
import * as repository from './repository.ts';
import type { CreateWorkspaceInput, UpdateWorkspaceInput, Workspace } from './types.ts';

export function listWorkspaces(): Workspace[] {
  return repository.findAll();
}

export function searchWorkspaces(query: string): Workspace[] {
  return repository.search(query);
}

export function getWorkspace(id: string): Workspace {
  const workspace = repository.findById(id);
  if (!workspace) {
    throw new NotFoundError(`Workspace not found: ${id}`);
  }
  return workspace;
}

export function createWorkspace(input: CreateWorkspaceInput): Workspace {
  return repository.create(input);
}

export function updateWorkspace(id: string, input: UpdateWorkspaceInput): Workspace {
  const updated = repository.update(id, input);
  if (!updated) {
    throw new NotFoundError(`Workspace not found: ${id}`);
  }
  return updated;
}

export function deleteWorkspace(id: string): void {
  // TODO: Kill any active subprocesses for this workspace first
  // For now, just delete - subprocess management will be added later
  const deleted = repository.remove(id);
  if (!deleted) {
    throw new NotFoundError(`Workspace not found: ${id}`);
  }
}
