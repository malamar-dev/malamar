import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import type { Agent } from '../src/agent/types.ts';
import type { Workspace } from '../src/workspace/types.ts';
import {
  del,
  get,
  getDb,
  post,
  put,
  resetDbConnection,
  startServer,
  stopServer,
} from './helpers/index.ts';

interface AgentResponse {
  data: Agent;
}

interface AgentListResponse {
  data: Agent[];
}

interface WorkspaceResponse {
  data: Workspace;
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

interface SuccessResponse {
  success: boolean;
}

describe('Agent E2E Tests', () => {
  let testWorkspaceId: string;

  beforeAll(async () => {
    await startServer();

    // Create a workspace for agent tests
    const { data } = await post<WorkspaceResponse>('/api/workspaces', {
      title: 'Agent Test Workspace',
    });
    testWorkspaceId = data.data.id;
  });

  afterAll(async () => {
    await stopServer();
  });

  describe('POST /api/workspaces/:id/agents', () => {
    test('should create an agent with required fields', async () => {
      const { status, data } = await post<AgentResponse>(
        `/api/workspaces/${testWorkspaceId}/agents`,
        {
          name: 'Test Agent',
          instruction: 'You are a test agent',
          cliType: 'claude',
        }
      );

      expect(status).toBe(201);
      expect(data.data.name).toBe('Test Agent');
      expect(data.data.instruction).toBe('You are a test agent');
      expect(data.data.cliType).toBe('claude');
      expect(data.data.id).toBeDefined();
      expect(data.data.workspaceId).toBe(testWorkspaceId);
      expect(data.data.order).toBeGreaterThanOrEqual(1);
    });

    test('should create an agent with all CLI types', async () => {
      const cliTypes = ['claude', 'gemini', 'codex', 'opencode'] as const;

      for (const cliType of cliTypes) {
        const { status, data } = await post<AgentResponse>(
          `/api/workspaces/${testWorkspaceId}/agents`,
          {
            name: `Agent ${cliType}`,
            instruction: `Test for ${cliType}`,
            cliType,
          }
        );

        expect(status).toBe(201);
        expect(data.data.cliType).toBe(cliType);
      }
    });

    test('should create an agent with custom order', async () => {
      const { status, data } = await post<AgentResponse>(
        `/api/workspaces/${testWorkspaceId}/agents`,
        {
          name: 'Ordered Agent',
          instruction: 'Agent with custom order',
          cliType: 'claude',
          order: 99,
        }
      );

      expect(status).toBe(201);
      expect(data.data.order).toBe(99);
    });

    test('should fail without name', async () => {
      const { status } = await post<unknown>(`/api/workspaces/${testWorkspaceId}/agents`, {
        instruction: 'Test instruction',
        cliType: 'claude',
      });

      expect(status).toBe(400);
    });

    test('should fail without instruction', async () => {
      const { status } = await post<unknown>(`/api/workspaces/${testWorkspaceId}/agents`, {
        name: 'No Instruction Agent',
        cliType: 'claude',
      });

      expect(status).toBe(400);
    });

    test('should fail without cliType', async () => {
      const { status } = await post<unknown>(`/api/workspaces/${testWorkspaceId}/agents`, {
        name: 'No CLI Agent',
        instruction: 'Test instruction',
      });

      expect(status).toBe(400);
    });

    test('should fail with invalid cliType', async () => {
      const { status } = await post<unknown>(`/api/workspaces/${testWorkspaceId}/agents`, {
        name: 'Invalid CLI Agent',
        instruction: 'Test instruction',
        cliType: 'invalid-cli',
      });

      expect(status).toBe(400);
    });

    test('should fail with zero order', async () => {
      const { status } = await post<unknown>(`/api/workspaces/${testWorkspaceId}/agents`, {
        name: 'Zero Order Agent',
        instruction: 'Test instruction',
        cliType: 'claude',
        order: 0,
      });

      expect(status).toBe(400);
    });

    test('should fail with negative order', async () => {
      const { status } = await post<unknown>(`/api/workspaces/${testWorkspaceId}/agents`, {
        name: 'Negative Order Agent',
        instruction: 'Test instruction',
        cliType: 'claude',
        order: -5,
      });

      expect(status).toBe(400);
    });

    test('should verify agent exists in database', async () => {
      const { data: createData } = await post<AgentResponse>(
        `/api/workspaces/${testWorkspaceId}/agents`,
        {
          name: 'DB Verify Agent',
          instruction: 'Test for DB verification',
          cliType: 'claude',
        }
      );

      resetDbConnection();
      const db = getDb();
      const row = db
        .query<{ id: string; name: string; workspace_id: string }, [string]>(
          'SELECT id, name, workspace_id FROM agents WHERE id = ?'
        )
        .get(createData.data.id);

      expect(row).not.toBeNull();
      expect(row?.name).toBe('DB Verify Agent');
      expect(row?.workspace_id).toBe(testWorkspaceId);
    });

    test('should fail with duplicate name in same workspace', async () => {
      const uniqueName = `Unique Agent ${Date.now()}`;

      // Create first agent
      const { status: firstStatus } = await post<AgentResponse>(
        `/api/workspaces/${testWorkspaceId}/agents`,
        {
          name: uniqueName,
          instruction: 'First agent',
          cliType: 'claude',
        }
      );
      expect(firstStatus).toBe(201);

      // Try to create second agent with same name
      const { status, data } = await post<ErrorResponse>(
        `/api/workspaces/${testWorkspaceId}/agents`,
        {
          name: uniqueName,
          instruction: 'Second agent',
          cliType: 'claude',
        }
      );

      expect(status).toBe(409);
      expect(data.error.code).toBe('CONFLICT');
    });

    test('should allow same name in different workspaces', async () => {
      // Create another workspace
      const { data: wsData } = await post<WorkspaceResponse>('/api/workspaces', {
        title: 'Second Workspace For Agent Test',
      });
      const secondWorkspaceId = wsData.data.id;

      const sharedName = `Shared Name ${Date.now()}`;

      // Create agent in first workspace
      const { status: firstStatus } = await post<AgentResponse>(
        `/api/workspaces/${testWorkspaceId}/agents`,
        {
          name: sharedName,
          instruction: 'First workspace agent',
          cliType: 'claude',
        }
      );
      expect(firstStatus).toBe(201);

      // Create agent with same name in second workspace
      const { status: secondStatus } = await post<AgentResponse>(
        `/api/workspaces/${secondWorkspaceId}/agents`,
        {
          name: sharedName,
          instruction: 'Second workspace agent',
          cliType: 'claude',
        }
      );
      expect(secondStatus).toBe(201);

      // Clean up second workspace
      await del(`/api/workspaces/${secondWorkspaceId}`);
    });
  });

  describe('GET /api/workspaces/:id/agents', () => {
    test('should list agents in workspace', async () => {
      // Create a fresh workspace with known agents
      const { data: wsData } = await post<WorkspaceResponse>('/api/workspaces', {
        title: 'List Agents Workspace',
      });
      const workspaceId = wsData.data.id;

      // Create agents
      await post<AgentResponse>(`/api/workspaces/${workspaceId}/agents`, {
        name: 'List Agent 1',
        instruction: 'First agent',
        cliType: 'claude',
      });
      await post<AgentResponse>(`/api/workspaces/${workspaceId}/agents`, {
        name: 'List Agent 2',
        instruction: 'Second agent',
        cliType: 'gemini',
      });

      const { status, data } = await get<AgentListResponse>(
        `/api/workspaces/${workspaceId}/agents`
      );

      expect(status).toBe(200);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(2);
      expect(data.data.some((a) => a.name === 'List Agent 1')).toBe(true);
      expect(data.data.some((a) => a.name === 'List Agent 2')).toBe(true);

      // Clean up
      await del(`/api/workspaces/${workspaceId}`);
    });

    test('should return empty array for workspace with no agents', async () => {
      // Create a fresh workspace
      const { data: wsData } = await post<WorkspaceResponse>('/api/workspaces', {
        title: 'Empty Agents Workspace',
      });
      const workspaceId = wsData.data.id;

      const { status, data } = await get<AgentListResponse>(
        `/api/workspaces/${workspaceId}/agents`
      );

      expect(status).toBe(200);
      expect(data.data.length).toBe(0);

      // Clean up
      await del(`/api/workspaces/${workspaceId}`);
    });

    test('should return agents ordered by order field', async () => {
      // Create a fresh workspace
      const { data: wsData } = await post<WorkspaceResponse>('/api/workspaces', {
        title: 'Ordered Agents Workspace',
      });
      const workspaceId = wsData.data.id;

      // Create agents in reverse order
      await post<AgentResponse>(`/api/workspaces/${workspaceId}/agents`, {
        name: 'Third',
        instruction: 'Third agent',
        cliType: 'claude',
        order: 3,
      });
      await post<AgentResponse>(`/api/workspaces/${workspaceId}/agents`, {
        name: 'First',
        instruction: 'First agent',
        cliType: 'claude',
        order: 1,
      });
      await post<AgentResponse>(`/api/workspaces/${workspaceId}/agents`, {
        name: 'Second',
        instruction: 'Second agent',
        cliType: 'claude',
        order: 2,
      });

      const { status, data } = await get<AgentListResponse>(
        `/api/workspaces/${workspaceId}/agents`
      );

      expect(status).toBe(200);
      expect(data.data.length).toBe(3);
      expect(data.data[0]?.name).toBe('First');
      expect(data.data[1]?.name).toBe('Second');
      expect(data.data[2]?.name).toBe('Third');

      // Clean up
      await del(`/api/workspaces/${workspaceId}`);
    });
  });

  describe('PUT /api/agents/:id', () => {
    test('should update agent name', async () => {
      const { data: createData } = await post<AgentResponse>(
        `/api/workspaces/${testWorkspaceId}/agents`,
        {
          name: 'Original Name',
          instruction: 'Test instruction',
          cliType: 'claude',
        }
      );

      const { status, data } = await put<AgentResponse>(`/api/agents/${createData.data.id}`, {
        name: 'Updated Name',
      });

      expect(status).toBe(200);
      expect(data.data.name).toBe('Updated Name');
      expect(data.data.instruction).toBe('Test instruction'); // unchanged
    });

    test('should update agent instruction', async () => {
      const { data: createData } = await post<AgentResponse>(
        `/api/workspaces/${testWorkspaceId}/agents`,
        {
          name: 'Instruction Update Agent',
          instruction: 'Original instruction',
          cliType: 'claude',
        }
      );

      const { status, data } = await put<AgentResponse>(`/api/agents/${createData.data.id}`, {
        instruction: 'Updated instruction',
      });

      expect(status).toBe(200);
      expect(data.data.instruction).toBe('Updated instruction');
      expect(data.data.name).toBe('Instruction Update Agent'); // unchanged
    });

    test('should update agent cliType', async () => {
      const { data: createData } = await post<AgentResponse>(
        `/api/workspaces/${testWorkspaceId}/agents`,
        {
          name: 'CLI Update Agent',
          instruction: 'Test instruction',
          cliType: 'claude',
        }
      );

      const { status, data } = await put<AgentResponse>(`/api/agents/${createData.data.id}`, {
        cliType: 'gemini',
      });

      expect(status).toBe(200);
      expect(data.data.cliType).toBe('gemini');
    });

    test('should update multiple fields', async () => {
      const { data: createData } = await post<AgentResponse>(
        `/api/workspaces/${testWorkspaceId}/agents`,
        {
          name: 'Multi Update Agent',
          instruction: 'Original instruction',
          cliType: 'claude',
        }
      );

      const { status, data } = await put<AgentResponse>(`/api/agents/${createData.data.id}`, {
        name: 'New Name',
        instruction: 'New instruction',
        cliType: 'codex',
      });

      expect(status).toBe(200);
      expect(data.data.name).toBe('New Name');
      expect(data.data.instruction).toBe('New instruction');
      expect(data.data.cliType).toBe('codex');
    });

    test('should return 404 for non-existent agent', async () => {
      const { status, data } = await put<ErrorResponse>('/api/agents/nonexistent-id', {
        name: 'New Name',
      });

      expect(status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    test('should fail when updating to duplicate name', async () => {
      const uniqueSuffix = Date.now();

      // Create two agents
      const { data: firstData } = await post<AgentResponse>(
        `/api/workspaces/${testWorkspaceId}/agents`,
        {
          name: `First Agent ${uniqueSuffix}`,
          instruction: 'First agent',
          cliType: 'claude',
        }
      );
      await post<AgentResponse>(`/api/workspaces/${testWorkspaceId}/agents`, {
        name: `Second Agent ${uniqueSuffix}`,
        instruction: 'Second agent',
        cliType: 'claude',
      });

      // Try to update first agent to have second agent's name
      const { status, data } = await put<ErrorResponse>(`/api/agents/${firstData.data.id}`, {
        name: `Second Agent ${uniqueSuffix}`,
      });

      expect(status).toBe(409);
      expect(data.error.code).toBe('CONFLICT');
    });

    test('should allow updating to same name (no change)', async () => {
      const { data: createData } = await post<AgentResponse>(
        `/api/workspaces/${testWorkspaceId}/agents`,
        {
          name: 'Same Name Agent',
          instruction: 'Test instruction',
          cliType: 'claude',
        }
      );

      const { status, data } = await put<AgentResponse>(`/api/agents/${createData.data.id}`, {
        name: 'Same Name Agent', // Same name
        instruction: 'Updated instruction',
      });

      expect(status).toBe(200);
      expect(data.data.name).toBe('Same Name Agent');
      expect(data.data.instruction).toBe('Updated instruction');
    });
  });

  describe('DELETE /api/agents/:id', () => {
    test('should delete an agent', async () => {
      const { data: createData } = await post<AgentResponse>(
        `/api/workspaces/${testWorkspaceId}/agents`,
        {
          name: 'To Be Deleted',
          instruction: 'Will be deleted',
          cliType: 'claude',
        }
      );

      const { status, data } = await del<SuccessResponse>(`/api/agents/${createData.data.id}`);

      expect(status).toBe(200);
      expect(data.success).toBe(true);

      // Verify it's gone from database
      resetDbConnection();
      const db = getDb();
      const row = db
        .query<{ id: string }, [string]>('SELECT id FROM agents WHERE id = ?')
        .get(createData.data.id);
      expect(row).toBeNull();
    });

    test('should return 404 for non-existent agent', async () => {
      const { status, data } = await del<ErrorResponse>('/api/agents/nonexistent-id');

      expect(status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/workspaces/:id/agents/reorder', () => {
    test('should reorder agents', async () => {
      // Create a fresh workspace
      const { data: wsData } = await post<WorkspaceResponse>('/api/workspaces', {
        title: 'Reorder Agents Workspace',
      });
      const workspaceId = wsData.data.id;

      // Create three agents
      const { data: a1 } = await post<AgentResponse>(`/api/workspaces/${workspaceId}/agents`, {
        name: 'Agent A',
        instruction: 'First agent',
        cliType: 'claude',
      });
      const { data: a2 } = await post<AgentResponse>(`/api/workspaces/${workspaceId}/agents`, {
        name: 'Agent B',
        instruction: 'Second agent',
        cliType: 'claude',
      });
      const { data: a3 } = await post<AgentResponse>(`/api/workspaces/${workspaceId}/agents`, {
        name: 'Agent C',
        instruction: 'Third agent',
        cliType: 'claude',
      });

      // Reorder: C, A, B
      const { status, data } = await put<SuccessResponse>(
        `/api/workspaces/${workspaceId}/agents/reorder`,
        {
          agentIds: [a3.data.id, a1.data.id, a2.data.id],
        }
      );

      expect(status).toBe(200);
      expect(data.success).toBe(true);

      // Verify new order
      const { data: listData } = await get<AgentListResponse>(
        `/api/workspaces/${workspaceId}/agents`
      );

      expect(listData.data[0]?.name).toBe('Agent C');
      expect(listData.data[1]?.name).toBe('Agent A');
      expect(listData.data[2]?.name).toBe('Agent B');

      // Clean up
      await del(`/api/workspaces/${workspaceId}`);
    });

    test('should fail with empty agentIds', async () => {
      const { status } = await put<unknown>(
        `/api/workspaces/${testWorkspaceId}/agents/reorder`,
        {
          agentIds: [],
        }
      );

      expect(status).toBe(400);
    });

    test('should fail without agentIds', async () => {
      const { status } = await put<unknown>(
        `/api/workspaces/${testWorkspaceId}/agents/reorder`,
        {}
      );

      expect(status).toBe(400);
    });

    test('should handle partial reorder (subset of agents)', async () => {
      // Create a fresh workspace
      const { data: wsData } = await post<WorkspaceResponse>('/api/workspaces', {
        title: 'Partial Reorder Workspace',
      });
      const workspaceId = wsData.data.id;

      // Create three agents
      const { data: a1 } = await post<AgentResponse>(`/api/workspaces/${workspaceId}/agents`, {
        name: 'Agent X',
        instruction: 'First agent',
        cliType: 'claude',
      });
      const { data: a2 } = await post<AgentResponse>(`/api/workspaces/${workspaceId}/agents`, {
        name: 'Agent Y',
        instruction: 'Second agent',
        cliType: 'claude',
      });
      await post<AgentResponse>(`/api/workspaces/${workspaceId}/agents`, {
        name: 'Agent Z',
        instruction: 'Third agent',
        cliType: 'claude',
      });

      // Reorder only two agents (swap X and Y)
      const { status } = await put<SuccessResponse>(
        `/api/workspaces/${workspaceId}/agents/reorder`,
        {
          agentIds: [a2.data.id, a1.data.id],
        }
      );

      expect(status).toBe(200);

      // Clean up
      await del(`/api/workspaces/${workspaceId}`);
    });
  });

  describe('Cascade Delete', () => {
    test('should delete agents when workspace is deleted', async () => {
      // Create a workspace
      const { data: wsData } = await post<WorkspaceResponse>('/api/workspaces', {
        title: 'Cascade Delete Workspace',
      });
      const workspaceId = wsData.data.id;

      // Create agents
      const { data: agentData } = await post<AgentResponse>(
        `/api/workspaces/${workspaceId}/agents`,
        {
          name: 'Cascade Agent',
          instruction: 'Will be cascade deleted',
          cliType: 'claude',
        }
      );
      const agentId = agentData.data.id;

      // Verify agent exists
      resetDbConnection();
      const dbBefore = getDb();
      const agentBefore = dbBefore
        .query<{ id: string }, [string]>('SELECT id FROM agents WHERE id = ?')
        .get(agentId);
      expect(agentBefore).not.toBeNull();

      // Delete workspace
      await del(`/api/workspaces/${workspaceId}`);

      // Verify agent is deleted
      resetDbConnection();
      const dbAfter = getDb();
      const agentAfter = dbAfter
        .query<{ id: string }, [string]>('SELECT id FROM agents WHERE id = ?')
        .get(agentId);
      expect(agentAfter).toBeNull();
    });
  });
});
