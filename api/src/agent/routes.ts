import { Hono } from "hono";

import { createErrorResponse, httpStatusFromCode } from "../shared";
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
  const workspaceResult = workspaceService.getWorkspace(workspaceId);
  if (!workspaceResult.ok) {
    return c.json(
      createErrorResponse(workspaceResult.code, workspaceResult.error),
      httpStatusFromCode(workspaceResult.code),
    );
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

  const result = service.createAgent(workspaceId, parsed.data);

  if (!result.ok) {
    return c.json(
      createErrorResponse(result.code, result.error),
      httpStatusFromCode(result.code),
    );
  }

  return c.json(serializeAgent(result.data), 201);
});

/**
 * PUT /workspaces/:workspaceId/agents/reorder - Reorder agents
 */
agentRouter.put("/workspaces/:workspaceId/agents/reorder", async (c) => {
  const workspaceId = c.req.param("workspaceId");

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

  const result = service.reorderAgents(workspaceId, parsed.data.agentIds);

  if (!result.ok) {
    return c.json(
      createErrorResponse(result.code, result.error),
      httpStatusFromCode(result.code),
    );
  }

  return c.json({
    agents: result.data.map(serializeAgent),
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

  const result = service.updateAgent(id, parsed.data);

  if (!result.ok) {
    return c.json(
      createErrorResponse(result.code, result.error),
      httpStatusFromCode(result.code),
    );
  }

  return c.json(serializeAgent(result.data));
});

/**
 * DELETE /agents/:id - Delete agent
 */
agentRouter.delete("/agents/:id", (c) => {
  const id = c.req.param("id");

  const result = service.deleteAgent(id);

  if (!result.ok) {
    return c.json(
      createErrorResponse(result.code, result.error),
      httpStatusFromCode(result.code),
    );
  }

  return c.body(null, 204);
});
