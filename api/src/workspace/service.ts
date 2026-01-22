import { existsSync, statSync } from "node:fs";

import { generateId } from "../shared";
import * as repository from "./repository";
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  Workspace,
} from "./types";

/**
 * Validates that a working directory path exists and is a directory.
 * Throws an error if validation fails.
 */
function validateWorkingDirectory(path: string | null | undefined): void {
  if (!path) {
    return; // null/undefined is allowed
  }

  if (!existsSync(path)) {
    throw new Error(
      "The specified path does not exist or is not a valid directory",
    );
  }

  const stat = statSync(path);
  if (!stat.isDirectory()) {
    throw new Error(
      "The specified path does not exist or is not a valid directory",
    );
  }
}

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
  validateWorkingDirectory(input.workingDirectory);

  const now = new Date();
  const workspace: Workspace = {
    id: generateId(),
    title: input.title,
    description: input.description ?? "",
    workingDirectory: input.workingDirectory ?? null,
    lastActivityAt: now, // Initialize to created_at (never NULL)
    createdAt: now,
    updatedAt: now,
  };
  return repository.create(workspace);
}

/**
 * Update an existing workspace.
 * Returns the updated workspace, or null if not found.
 */
export function updateWorkspace(
  id: string,
  input: UpdateWorkspaceInput,
): Workspace | null {
  validateWorkingDirectory(input.workingDirectory);

  const now = new Date();
  return repository.update(
    id,
    input.title,
    input.description ?? "",
    input.workingDirectory ?? null,
    now,
  );
}
