import { existsSync, statSync } from "node:fs";

import { err, generateId, ok, type Result } from "../shared";
import * as repository from "./repository";
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  Workspace,
} from "./types";

/**
 * Checks if a working directory path exists and is a directory.
 * Returns true if the path is valid (exists and is a directory), false otherwise.
 * Note: Non-existent paths are allowed (user may create the directory later).
 */
export function isValidWorkingDirectory(
  path: string | null | undefined,
): boolean {
  if (!path) {
    return true; // null/undefined is valid (temp folder mode)
  }

  if (!existsSync(path)) {
    return false; // Path doesn't exist, but we allow saving
  }

  const stat = statSync(path);
  return stat.isDirectory();
}

/**
 * List all workspaces, optionally filtered by search query.
 */
export function listWorkspaces(searchQuery?: string): Workspace[] {
  return repository.findAll(searchQuery);
}

/**
 * Get a workspace by ID.
 */
export function getWorkspace(id: string): Result<Workspace> {
  const workspace = repository.findById(id);
  if (!workspace) {
    return err("Workspace not found", "NOT_FOUND");
  }
  return ok(workspace);
}

/**
 * Create a new workspace.
 * Note: Working directory validation is intentionally not blocking - paths may be created later.
 */
export function createWorkspace(
  input: CreateWorkspaceInput,
): Result<Workspace> {
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
  return ok(repository.create(workspace));
}

/**
 * Update an existing workspace.
 * Note: Working directory validation is intentionally not blocking - paths may be created later.
 */
export function updateWorkspace(
  id: string,
  input: UpdateWorkspaceInput,
): Result<Workspace> {
  const now = new Date();
  const workspace = repository.update(
    id,
    input.title,
    input.description ?? "",
    input.workingDirectory ?? null,
    now,
  );

  if (!workspace) {
    return err("Workspace not found", "NOT_FOUND");
  }

  return ok(workspace);
}

/**
 * Delete a workspace by ID.
 * This will cascade delete all related entities (agents, tasks, chats, etc.).
 */
export function deleteWorkspace(id: string): Result<void> {
  const deleted = repository.remove(id);

  if (!deleted) {
    return err("Workspace not found", "NOT_FOUND");
  }

  return ok(undefined);
}
