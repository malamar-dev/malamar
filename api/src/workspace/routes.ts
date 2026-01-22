import { Hono } from "hono";

import { createErrorResponse } from "../shared";
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
  const workspace = service.getWorkspace(id);

  if (!workspace) {
    return c.json(createErrorResponse("NOT_FOUND", "Workspace not found"), 404);
  }

  return c.json(serializeWorkspace(workspace));
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

  const workspace = service.createWorkspace(parsed.data);

  return c.json(serializeWorkspace(workspace), 201);
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

  const workspace = service.updateWorkspace(id, parsed.data);

  if (!workspace) {
    return c.json(createErrorResponse("NOT_FOUND", "Workspace not found"), 404);
  }

  return c.json(serializeWorkspace(workspace));
});
