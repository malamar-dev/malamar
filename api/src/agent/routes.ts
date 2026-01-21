import { Hono } from "hono";

import { createErrorResponse } from "../shared";
import * as workspaceService from "../workspace/service";
import {
  createAgentSchema,
  reorderAgentsSchema,
  updateAgentSchema,
} from "./schemas";
import * as service from "./service";
import type { Agent } from "./types";

export const agentRouter = new Hono();

/**
 * Serialize an agent for API response.
 */
function serializeAgent(agent: Agent) {
  return {
    id: agent.id,
    workspaceId: agent.workspaceId,
    name: agent.name,
    instruction: agent.instruction,
    cliType: agent.cliType,
    order: agent.order,
    createdAt: agent.createdAt.toISOString(),
    updatedAt: agent.updatedAt.toISOString(),
  };
}

/**
 * GET /workspaces/:workspaceId/agents - List agents in workspace
 */
agentRouter.get("/workspaces/:workspaceId/agents", (c) => {
  const workspaceId = c.req.param("workspaceId");

  // Verify workspace exists
  const workspace = workspaceService.getWorkspace(workspaceId);
  if (!workspace) {
    return c.json(createErrorResponse("NOT_FOUND", "Workspace not found"), 404);
  }

  const agents = service.listAgents(workspaceId);

  return c.json({
    agents: agents.map(serializeAgent),
  });
});

/**
 * POST /workspaces/:workspaceId/agents - Create agent
 */
agentRouter.post("/workspaces/:workspaceId/agents", async (c) => {
  const workspaceId = c.req.param("workspaceId");

  // Verify workspace exists
  const workspace = workspaceService.getWorkspace(workspaceId);
  if (!workspace) {
    return c.json(createErrorResponse("NOT_FOUND", "Workspace not found"), 404);
  }

  const body = await c.req.json();
  const parsed = createAgentSchema.safeParse(body);

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

  const agent = service.createAgent(workspaceId, parsed.data);

  return c.json(serializeAgent(agent), 201);
});

/**
 * PUT /workspaces/:workspaceId/agents/reorder - Reorder agents
 */
agentRouter.put("/workspaces/:workspaceId/agents/reorder", async (c) => {
  const workspaceId = c.req.param("workspaceId");

  // Verify workspace exists
  const workspace = workspaceService.getWorkspace(workspaceId);
  if (!workspace) {
    return c.json(createErrorResponse("NOT_FOUND", "Workspace not found"), 404);
  }

  const body = await c.req.json();
  const parsed = reorderAgentsSchema.safeParse(body);

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

  const agents = service.reorderAgents(workspaceId, parsed.data.agentIds);

  if (agents === null) {
    return c.json(
      createErrorResponse(
        "VALIDATION_ERROR",
        "One or more agent IDs are invalid or do not belong to this workspace",
      ),
      400,
    );
  }

  return c.json({
    agents: agents.map(serializeAgent),
  });
});

/**
 * PUT /agents/:id - Update agent
 */
agentRouter.put("/agents/:id", async (c) => {
  const id = c.req.param("id");

  const body = await c.req.json();
  const parsed = updateAgentSchema.safeParse(body);

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

  const agent = service.updateAgent(id, parsed.data);

  if (!agent) {
    return c.json(createErrorResponse("NOT_FOUND", "Agent not found"), 404);
  }

  return c.json(serializeAgent(agent));
});

/**
 * DELETE /agents/:id - Delete agent
 */
agentRouter.delete("/agents/:id", (c) => {
  const id = c.req.param("id");

  const deleted = service.deleteAgent(id);

  if (!deleted) {
    return c.json(createErrorResponse("NOT_FOUND", "Agent not found"), 404);
  }

  return c.body(null, 204);
});
