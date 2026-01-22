import { describe, expect, test } from "bun:test";

import { getBaseUrl } from "../helpers";

interface WorkspaceResponse {
  id: string;
  title: string;
  description: string;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

interface WorkspacesListResponse {
  workspaces: WorkspaceResponse[];
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

describe("Workspace endpoints", () => {
  let createdWorkspaceId: string;

  test("GET /api/workspaces returns empty list initially", async () => {
    const response = await fetch(`${getBaseUrl()}/api/workspaces`);
    expect(response.status).toBe(200);

    const body = (await response.json()) as WorkspacesListResponse;
    expect(Array.isArray(body.workspaces)).toBe(true);
  });

  test("POST /api/workspaces creates a workspace", async () => {
    const response = await fetch(`${getBaseUrl()}/api/workspaces`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test Workspace",
        description: "A test workspace for E2E testing",
      }),
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as WorkspaceResponse;

    expect(body.id).toBeDefined();
    expect(body.id.length).toBe(21); // nanoid default length
    expect(body.title).toBe("Test Workspace");
    expect(body.description).toBe("A test workspace for E2E testing");
    expect(body.lastActivityAt).toBeDefined();
    expect(body.createdAt).toBeDefined();
    expect(body.updatedAt).toBeDefined();

    createdWorkspaceId = body.id;
  });

  test("POST /api/workspaces creates workspace with default description", async () => {
    const response = await fetch(`${getBaseUrl()}/api/workspaces`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Minimal Workspace",
      }),
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as WorkspaceResponse;

    expect(body.title).toBe("Minimal Workspace");
    expect(body.description).toBe("");
  });

  test("POST /api/workspaces returns 400 for missing title", async () => {
    const response = await fetch(`${getBaseUrl()}/api/workspaces`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: "No title provided",
      }),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as ErrorResponse;
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  test("POST /api/workspaces returns 400 for empty title", async () => {
    const response = await fetch(`${getBaseUrl()}/api/workspaces`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "",
      }),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as ErrorResponse;
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  test("GET /api/workspaces/:id returns workspace", async () => {
    const response = await fetch(
      `${getBaseUrl()}/api/workspaces/${createdWorkspaceId}`,
    );
    expect(response.status).toBe(200);

    const body = (await response.json()) as WorkspaceResponse;
    expect(body.id).toBe(createdWorkspaceId);
    expect(body.title).toBe("Test Workspace");
  });

  test("GET /api/workspaces/:id returns 404 for unknown ID", async () => {
    const response = await fetch(
      `${getBaseUrl()}/api/workspaces/nonexistent123456789`,
    );
    expect(response.status).toBe(404);

    const body = (await response.json()) as ErrorResponse;
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toBe("Workspace not found");
  });

  test("GET /api/workspaces lists created workspaces", async () => {
    const response = await fetch(`${getBaseUrl()}/api/workspaces`);
    expect(response.status).toBe(200);

    const body = (await response.json()) as WorkspacesListResponse;
    expect(body.workspaces.length).toBeGreaterThanOrEqual(2);

    const workspace = body.workspaces.find((w) => w.id === createdWorkspaceId);
    expect(workspace).toBeDefined();
    expect(workspace?.title).toBe("Test Workspace");
  });

  test("GET /api/workspaces?q= searches by title", async () => {
    const response = await fetch(`${getBaseUrl()}/api/workspaces?q=Test`);
    expect(response.status).toBe(200);

    const body = (await response.json()) as WorkspacesListResponse;
    expect(body.workspaces.length).toBeGreaterThanOrEqual(1);
    expect(body.workspaces.every((w) => w.title.includes("Test"))).toBe(true);
  });

  test("GET /api/workspaces?q= returns empty for non-matching search", async () => {
    const response = await fetch(
      `${getBaseUrl()}/api/workspaces?q=NonExistentWorkspace`,
    );
    expect(response.status).toBe(200);

    const body = (await response.json()) as WorkspacesListResponse;
    expect(body.workspaces.length).toBe(0);
  });

  test("GET /api/workspaces returns workspaces sorted by lastActivityAt DESC", async () => {
    // Create a third workspace to have more data points
    await fetch(`${getBaseUrl()}/api/workspaces`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Third Workspace" }),
    });

    const response = await fetch(`${getBaseUrl()}/api/workspaces`);
    const body = (await response.json()) as WorkspacesListResponse;

    // Verify descending order by lastActivityAt
    for (let i = 0; i < body.workspaces.length - 1; i++) {
      const current = new Date(body.workspaces[i]!.lastActivityAt).getTime();
      const next = new Date(body.workspaces[i + 1]!.lastActivityAt).getTime();
      expect(current).toBeGreaterThanOrEqual(next);
    }
  });

  test("PUT /api/workspaces/:id updates workspace title", async () => {
    const response = await fetch(
      `${getBaseUrl()}/api/workspaces/${createdWorkspaceId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Updated Workspace Title",
          description: "A test workspace for E2E testing",
        }),
      },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as WorkspaceResponse;

    expect(body.id).toBe(createdWorkspaceId);
    expect(body.title).toBe("Updated Workspace Title");
    expect(body.description).toBe("A test workspace for E2E testing");
  });

  test("PUT /api/workspaces/:id updates workspace description", async () => {
    const response = await fetch(
      `${getBaseUrl()}/api/workspaces/${createdWorkspaceId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Updated Workspace Title",
          description: "Updated description",
        }),
      },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as WorkspaceResponse;

    expect(body.id).toBe(createdWorkspaceId);
    expect(body.description).toBe("Updated description");
  });

  test("PUT /api/workspaces/:id updates both title and description", async () => {
    const response = await fetch(
      `${getBaseUrl()}/api/workspaces/${createdWorkspaceId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Both Updated",
          description: "Both fields updated",
        }),
      },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as WorkspaceResponse;

    expect(body.id).toBe(createdWorkspaceId);
    expect(body.title).toBe("Both Updated");
    expect(body.description).toBe("Both fields updated");
  });

  test("PUT /api/workspaces/:id returns 400 for empty title", async () => {
    const response = await fetch(
      `${getBaseUrl()}/api/workspaces/${createdWorkspaceId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "",
          description: "Some description",
        }),
      },
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as ErrorResponse;
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  test("PUT /api/workspaces/:id returns 400 for title > 255 chars", async () => {
    const longTitle = "a".repeat(256);
    const response = await fetch(
      `${getBaseUrl()}/api/workspaces/${createdWorkspaceId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: longTitle,
          description: "Some description",
        }),
      },
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as ErrorResponse;
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  test("PUT /api/workspaces/:id returns 400 for description > 1000 chars", async () => {
    const longDescription = "a".repeat(1001);
    const response = await fetch(
      `${getBaseUrl()}/api/workspaces/${createdWorkspaceId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Valid Title",
          description: longDescription,
        }),
      },
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as ErrorResponse;
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  test("PUT /api/workspaces/:id returns 404 for unknown workspace", async () => {
    const response = await fetch(
      `${getBaseUrl()}/api/workspaces/nonexistent123456789`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Some Title",
          description: "Some description",
        }),
      },
    );

    expect(response.status).toBe(404);
    const body = (await response.json()) as ErrorResponse;
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toBe("Workspace not found");
  });
});
