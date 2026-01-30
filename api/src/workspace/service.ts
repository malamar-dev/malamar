import { existsSync, statSync } from "node:fs";

import * as agentService from "../agent/service";
import { DEFAULT_AGENTS } from "../prompts/defaults";
import { err, generateId, ok, type Result } from "../shared";
import * as repository from "./repository";
import type {
  CreateWorkspaceInput,
  CreateWorkspaceOptions,
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
 * By default, creates default agents (Planner, Implementer, Reviewer, Approver).
 * Pass `options.skipDefaultAgents: true` to skip agent creation.
 */
export function createWorkspace(
  input: CreateWorkspaceInput,
  options?: CreateWorkspaceOptions,
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
  const created = repository.create(workspace);

  // Create default agents unless explicitly skipped
  if (!options?.skipDefaultAgents) {
    for (const agentInput of DEFAULT_AGENTS) {
      agentService.createAgent(created.id, agentInput);
    }
  }

  return ok(created);
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
