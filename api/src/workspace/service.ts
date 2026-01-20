import { generateId } from "../shared";
import * as repository from "./repository";
import type { CreateWorkspaceInput, Workspace } from "./types";

/**
 * List all workspaces, optionally filtered by search query.
 */
export function listWorkspaces(searchQuery?: string): Workspace[] {
  return repository.findAll(searchQuery);
}

/**
 * Get a workspace by ID.
 * Returns null if not found.
 */
export function getWorkspace(id: string): Workspace | null {
  return repository.findById(id);
}

/**
 * Create a new workspace.
 */
export function createWorkspace(input: CreateWorkspaceInput): Workspace {
  const now = new Date();
  const workspace: Workspace = {
    id: generateId(),
    title: input.title,
    description: input.description ?? "",
    lastActivityAt: now, // Initialize to created_at (never NULL)
    createdAt: now,
    updatedAt: now,
  };
  return repository.create(workspace);
}
