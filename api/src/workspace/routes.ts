import { Hono } from "hono";

import { createErrorResponse, httpStatusFromCode } from "../shared";
import {
  createWorkspaceSchema,
  listWorkspacesQuerySchema,
  updateWorkspaceSchema,
} from "./schemas";
import * as service from "./service";
import type { Workspace } from "./types";

export const workspaceRouter = new Hono();

/**
 * Serialize a workspace for API response.
 */
function serializeWorkspace(workspace: Workspace) {
  return {
    id: workspace.id,
    title: workspace.title,
    description: workspace.description,
    workingDirectory: workspace.workingDirectory,
    lastActivityAt: workspace.lastActivityAt.toISOString(),
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
  };
}

/**
 * GET / - List all workspaces
 * Supports ?q= for title search
 */
workspaceRouter.get("/", (c) => {
  const queryResult = listWorkspacesQuerySchema.safeParse({
    q: c.req.query("q"),
  });

  const searchQuery = queryResult.success ? queryResult.data.q : undefined;
  const workspaces = service.listWorkspaces(searchQuery);

  return c.json({
    workspaces: workspaces.map(serializeWorkspace),
  });
});

/**
 * GET /:id - Get workspace by ID
 */
workspaceRouter.get("/:id", (c) => {
  const id = c.req.param("id");
  const result = service.getWorkspace(id);

  if (!result.ok) {
    return c.json(
      createErrorResponse(result.code, result.error),
      httpStatusFromCode(result.code),
    );
  }

  return c.json(serializeWorkspace(result.data));
});

/**
 * POST / - Create a new workspace
 */
workspaceRouter.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createWorkspaceSchema.safeParse(body);

  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return c.json(
      createErrorResponse(
        "VALIDATION_ERROR",
        firstError?.message ?? "Invalid input",
      ),
      400,
    );
  }

  const result = service.createWorkspace(parsed.data);

  if (!result.ok) {
    return c.json(
      createErrorResponse(result.code, result.error),
      httpStatusFromCode(result.code),
    );
  }

  return c.json(serializeWorkspace(result.data), 201);
});

/**
 * PUT /:id - Update a workspace
 */
workspaceRouter.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = updateWorkspaceSchema.safeParse(body);

  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return c.json(
      createErrorResponse(
        "VALIDATION_ERROR",
        firstError?.message ?? "Invalid input",
      ),
      400,
    );
  }

  const result = service.updateWorkspace(id, parsed.data);

  if (!result.ok) {
    return c.json(
      createErrorResponse(result.code, result.error),
      httpStatusFromCode(result.code),
    );
  }

  return c.json(serializeWorkspace(result.data));
});
