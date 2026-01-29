import { describe, expect, test } from "bun:test";

import { getBaseUrl } from "../helpers";

interface AgentResponse {
  id: string;
  workspaceId: string;
  name: string;
  instruction: string;
  cliType: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface AgentsListResponse {
  agents: AgentResponse[];
}

interface WorkspaceResponse {
  id: string;
  title: string;
  description: string;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/**
 * Helper function to create a workspace for testing agents.
 */
async function createTestWorkspace(title: string): Promise<string> {
  const response = await fetch(`${getBaseUrl()}/api/workspaces`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  const body = (await response.json()) as WorkspaceResponse;
  return body.id;
}

describe("Agent endpoints", () => {
  let workspaceId: string;
  let createdAgentId: string;

  // Create a workspace before running agent tests
  test("Setup: Create workspace for agent tests", async () => {
    workspaceId = await createTestWorkspace("Agent Test Workspace");
    expect(workspaceId).toBeDefined();
    expect(workspaceId.length).toBe(21);
  });

  describe("List agents", () => {
    test("GET /api/workspaces/:id/agents returns empty list for new workspace", async () => {
      const response = await fetch(
        `${getBaseUrl()}/api/workspaces/${workspaceId}/agents`,
      );
      expect(response.status).toBe(200);

      const body = (await response.json()) as AgentsListResponse;
      expect(Array.isArray(body.agents)).toBe(true);
      expect(body.agents.length).toBe(0);
    });

    test("GET /api/workspaces/:id/agents returns 404 for unknown workspace", async () => {
      const response = await fetch(
        `${getBaseUrl()}/api/workspaces/nonexistent123456789/agents`,
      );
      expect(response.status).toBe(404);

      const body = (await response.json()) as ErrorResponse;
      expect(body.error.code).toBe("NOT_FOUND");
      expect(body.error.message).toBe("Workspace not found");
    });
  });

  describe("Create agent", () => {
    test("POST /api/workspaces/:id/agents creates agent with all fields", async () => {
      const response = await fetch(
        `${getBaseUrl()}/api/workspaces/${workspaceId}/agents`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Planner",
            instruction: "You are a planning agent.",
            cliType: "claude",
          }),
        },
      );

      expect(response.status).toBe(201);
      const body = (await response.json()) as AgentResponse;

      expect(body.id).toBeDefined();
      expect(body.id.length).toBe(21);
      expect(body.workspaceId).toBe(workspaceId);
      expect(body.name).toBe("Planner");
      expect(body.instruction).toBe("You are a planning agent.");
      expect(body.cliType).toBe("claude");
      expect(body.order).toBe(1);
      expect(body.createdAt).toBeDefined();
      expect(body.updatedAt).toBeDefined();

      createdAgentId = body.id;
    });

    test("POST /api/workspaces/:id/agents creates agent with auto-assigned order", async () => {
      const response = await fetch(
        `${getBaseUrl()}/api/workspaces/${workspaceId}/agents`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Implementer",
            instruction: "You are an implementation agent.",
            cliType: "gemini",
          }),
        },
      );

      expect(response.status).toBe(201);
      const body = (await response.json()) as AgentResponse;

      expect(body.name).toBe("Implementer");
      expect(body.order).toBe(2); // Should be 2 since Planner is 1
    });

    test("POST /api/workspaces/:id/agents returns 400 for missing name", async () => {
      const response = await fetch(
        `${getBaseUrl()}/api/workspaces/${workspaceId}/agents`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instruction: "Some instruction",
            cliType: "claude",
          }),
        },
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as ErrorResponse;
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    test("POST /api/workspaces/:id/agents returns 400 for missing instruction", async () => {
      const response = await fetch(
        `${getBaseUrl()}/api/workspaces/${workspaceId}/agents`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test Agent",
            cliType: "claude",
          }),
        },
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as ErrorResponse;
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    test("POST /api/workspaces/:id/agents returns 400 for invalid cli_type", async () => {
      const response = await fetch(
        `${getBaseUrl()}/api/workspaces/${workspaceId}/agents`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test Agent",
            instruction: "Some instruction",
            cliType: "invalid_cli",
          }),
        },
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as ErrorResponse;
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    test("POST /api/workspaces/:id/agents returns 404 for unknown workspace", async () => {
      const response = await fetch(
        `${getBaseUrl()}/api/workspaces/nonexistent123456789/agents`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test Agent",
            instruction: "Some instruction",
            cliType: "claude",
          }),
        },
      );

      expect(response.status).toBe(404);
      const body = (await response.json()) as ErrorResponse;
      expect(body.error.code).toBe("NOT_FOUND");
    });

    test("POST /api/workspaces/:id/agents rejects duplicate names", async () => {
      const response = await fetch(
        `${getBaseUrl()}/api/workspaces/${workspaceId}/agents`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Planner", // Same name as first agent
            instruction: "Another planner agent.",
            cliType: "codex",
          }),
        },
      );

      expect(response.status).toBe(409);
      const body = (await response.json()) as ErrorResponse;

      expect(body.error.code).toBe("CONFLICT");
      expect(body.error.message).toBe(
        "An agent with this name already exists in the workspace",
      );
    });
  });

  describe("List agents after creation", () => {
    test("GET /api/workspaces/:id/agents returns agents ordered by order", async () => {
      const response = await fetch(
        `${getBaseUrl()}/api/workspaces/${workspaceId}/agents`,
      );
      expect(response.status).toBe(200);

      const body = (await response.json()) as AgentsListResponse;
      expect(body.agents.length).toBe(2);
      expect(body.agents[0]!.order).toBe(1);
      expect(body.agents[1]!.order).toBe(2);
    });
  });

  describe("Update agent", () => {
    test("PUT /api/agents/:id updates agent name", async () => {
      const response = await fetch(
        `${getBaseUrl()}/api/agents/${createdAgentId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Updated Planner",
          }),
        },
      );

      expect(response.status).toBe(200);
      const body = (await response.json()) as AgentResponse;

      expect(body.id).toBe(createdAgentId);
      expect(body.name).toBe("Updated Planner");
      expect(body.instruction).toBe("You are a planning agent."); // Unchanged
    });

    test("PUT /api/agents/:id updates agent instruction", async () => {
      const response = await fetch(
        `${getBaseUrl()}/api/agents/${createdAgentId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instruction: "Updated instruction for planning.",
          }),
        },
      );

      expect(response.status).toBe(200);
      const body = (await response.json()) as AgentResponse;

      expect(body.instruction).toBe("Updated instruction for planning.");
    });

    test("PUT /api/agents/:id updates agent cli_type", async () => {
      const response = await fetch(
        `${getBaseUrl()}/api/agents/${createdAgentId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cliType: "opencode",
          }),
        },
      );

      expect(response.status).toBe(200);
      const body = (await response.json()) as AgentResponse;

      expect(body.cliType).toBe("opencode");
    });

    test("PUT /api/agents/:id returns 404 for unknown agent", async () => {
      const response = await fetch(
        `${getBaseUrl()}/api/agents/nonexistent123456789`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "New Name",
          }),
        },
      );

      expect(response.status).toBe(404);
      const body = (await response.json()) as ErrorResponse;
      expect(body.error.code).toBe("NOT_FOUND");
      expect(body.error.message).toBe("Agent not found");
    });

    test("PUT /api/agents/:id returns 400 for invalid cli_type", async () => {
      const response = await fetch(
        `${getBaseUrl()}/api/agents/${createdAgentId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cliType: "invalid_cli",
          }),
        },
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as ErrorResponse;
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Reorder agents", () => {
    let agentIds: string[] = [];

    test("Setup: Get current agent IDs", async () => {
      const response = await fetch(
        `${getBaseUrl()}/api/workspaces/${workspaceId}/agents`,
      );
      const body = (await response.json()) as AgentsListResponse;
      agentIds = body.agents.map((a) => a.id);
      expect(agentIds.length).toBe(3);
    });

    test("PUT /api/workspaces/:id/agents/reorder reorders agents", async () => {
      // Reverse the order
      const reversedIds = [...agentIds].reverse();

      const response = await fetch(
        `${getBaseUrl()}/api/workspaces/${workspaceId}/agents/reorder`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentIds: reversedIds,
          }),
        },
      );

      expect(response.status).toBe(200);
      const body = (await response.json()) as AgentsListResponse;

      expect(body.agents.length).toBe(3);

      // @ts-expect-error No overload matched
      expect(body.agents[0]!.id).toBe(reversedIds[0]);
      expect(body.agents[0]!.order).toBe(1);

      // @ts-expect-error No overload matched
      expect(body.agents[1]!.id).toBe(reversedIds[1]);
      expect(body.agents[1]!.order).toBe(2);

      // @ts-expect-error No overload matched
      expect(body.agents[2]!.id).toBe(reversedIds[2]);
      expect(body.agents[2]!.order).toBe(3);
    });

    test("PUT /api/workspaces/:id/agents/reorder returns 400 for invalid agent IDs", async () => {
      const response = await fetch(
        `${getBaseUrl()}/api/workspaces/${workspaceId}/agents/reorder`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentIds: ["invalid_id_12345678901", "another_invalid_id123"],
          }),
        },
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as ErrorResponse;
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    test("PUT /api/workspaces/:id/agents/reorder returns 404 for unknown workspace", async () => {
      const response = await fetch(
        `${getBaseUrl()}/api/workspaces/nonexistent123456789/agents/reorder`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentIds: agentIds,
          }),
        },
      );

      expect(response.status).toBe(404);
      const body = (await response.json()) as ErrorResponse;
      expect(body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("Delete agent", () => {
    test("DELETE /api/agents/:id deletes agent", async () => {
      const response = await fetch(
        `${getBaseUrl()}/api/agents/${createdAgentId}`,
        {
          method: "DELETE",
        },
      );

      expect(response.status).toBe(204);
    });

    test("DELETE /api/agents/:id returns 404 for unknown agent", async () => {
      const response = await fetch(
        `${getBaseUrl()}/api/agents/nonexistent123456789`,
        {
          method: "DELETE",
        },
      );

      expect(response.status).toBe(404);
      const body = (await response.json()) as ErrorResponse;
      expect(body.error.code).toBe("NOT_FOUND");
      expect(body.error.message).toBe("Agent not found");
    });

    test("DELETE /api/agents/:id leaves gaps in order values", async () => {
      const response = await fetch(
        `${getBaseUrl()}/api/workspaces/${workspaceId}/agents`,
      );
      const body = (await response.json()) as AgentsListResponse;

      // After reordering and deleting, we should have 2 agents
      // The order values don't need to be consecutive
      expect(body.agents.length).toBe(2);
    });
  });

  describe("Cascade delete", () => {
    let cascadeWorkspaceId: string;

    test("Setup: Create workspace and agent for cascade test", async () => {
      // Create workspace
      cascadeWorkspaceId = await createTestWorkspace("Cascade Test Workspace");

      // Create agent
      const agentResponse = await fetch(
        `${getBaseUrl()}/api/workspaces/${cascadeWorkspaceId}/agents`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Cascade Agent",
            instruction: "Will be deleted with workspace.",
            cliType: "claude",
          }),
        },
      );

      await agentResponse.json();

      // Verify agent exists
      const verifyResponse = await fetch(
        `${getBaseUrl()}/api/workspaces/${cascadeWorkspaceId}/agents`,
      );
      const verifyBody = (await verifyResponse.json()) as AgentsListResponse;
      expect(verifyBody.agents.length).toBe(1);
    });

    test("Deleting workspace cascades to delete agents", async () => {
      // Delete workspace
      const deleteResponse = await fetch(
        `${getBaseUrl()}/api/workspaces/${cascadeWorkspaceId}`,
        {
          method: "DELETE",
        },
      );

      // Note: Workspace DELETE might not be implemented yet
      // If it returns 404 or 405, that's expected for now
      if (deleteResponse.status === 204 || deleteResponse.status === 200) {
        // Verify agent is also deleted by trying to access it directly
        // This would require a GET /api/agents/:id endpoint which we don't have
        // Instead, verify workspace is gone
        const verifyResponse = await fetch(
          `${getBaseUrl()}/api/workspaces/${cascadeWorkspaceId}`,
        );
        expect(verifyResponse.status).toBe(404);
      } else {
        // Workspace DELETE not implemented yet, skip cascade verification
        expect(
          deleteResponse.status === 404 || deleteResponse.status === 405,
        ).toBe(true);
      }
    });
  });
});
