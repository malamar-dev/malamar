import { existsSync, statSync } from "node:fs";

import { err, generateId, ok, type Result } from "../shared";
import * as repository from "./repository";
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  Workspace,
} from "./types";

/**
 * Validates that a working directory path exists and is a directory.
 * Returns an error message if invalid, null if valid.
 */
function validateWorkingDirectory(
  path: string | null | undefined,
): string | null {
  if (!path) {
    return null; // null/undefined is allowed
  }

  if (!existsSync(path)) {
    return "The specified path does not exist or is not a valid directory";
  }

  const stat = statSync(path);
  if (!stat.isDirectory()) {
    return "The specified path does not exist or is not a valid directory";
  }

  return null;
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
 */
export function createWorkspace(
  input: CreateWorkspaceInput,
): Result<Workspace> {
  const validationError = validateWorkingDirectory(input.workingDirectory);
  if (validationError) {
    return err(validationError, "VALIDATION_ERROR");
  }

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
 */
export function updateWorkspace(
  id: string,
  input: UpdateWorkspaceInput,
): Result<Workspace> {
  const validationError = validateWorkingDirectory(input.workingDirectory);
  if (validationError) {
    return err(validationError, "VALIDATION_ERROR");
  }

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
