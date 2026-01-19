import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

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

interface WorkspaceResponse {
  data: Workspace;
}

interface WorkspaceListResponse {
  data: Workspace[];
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

describe('Workspace E2E Tests', () => {
  beforeAll(async () => {
    await startServer();
  });

  afterAll(async () => {
    await stopServer();
  });

  describe('POST /api/workspaces', () => {
    test('should create a workspace with minimal fields', async () => {
      const { status, data } = await post<WorkspaceResponse>('/api/workspaces', {
        title: 'Test Workspace',
      });

      expect(status).toBe(201);
      expect(data.data.title).toBe('Test Workspace');
      expect(data.data.id).toBeDefined();
      expect(data.data.description).toBe('');
      expect(data.data.workingDirectoryMode).toBe('temp');
      // Default is true for autoDeleteDoneTasks
      expect(data.data.autoDeleteDoneTasks).toBe(true);
    });

    test('should create a workspace with all fields', async () => {
      const { status, data } = await post<WorkspaceResponse>('/api/workspaces', {
        title: 'Full Workspace',
        description: 'A workspace with all fields',
        workingDirectoryMode: 'static',
        workingDirectoryPath: '/tmp/test-project',
        autoDeleteDoneTasks: true,
        retentionDays: 30,
        notifyOnError: true,
        notifyOnInReview: false,
      });

      expect(status).toBe(201);
      expect(data.data.title).toBe('Full Workspace');
      expect(data.data.description).toBe('A workspace with all fields');
      expect(data.data.workingDirectoryMode).toBe('static');
      expect(data.data.workingDirectoryPath).toBe('/tmp/test-project');
      expect(data.data.autoDeleteDoneTasks).toBe(true);
      expect(data.data.retentionDays).toBe(30);
      expect(data.data.notifyOnError).toBe(true);
      expect(data.data.notifyOnInReview).toBe(false);
    });

    test('should fail without title', async () => {
      const { status } = await post<unknown>('/api/workspaces', {});

      // Zod validator returns 400 for validation errors
      expect(status).toBe(400);
    });

    test('should verify workspace exists in database', async () => {
      const { data: createData } = await post<WorkspaceResponse>('/api/workspaces', {
        title: 'DB Verify Workspace',
      });

      const db = getDb();
      const row = db
        .query<{ id: string; title: string }, [string]>('SELECT id, title FROM workspaces WHERE id = ?')
        .get(createData.data.id);

      expect(row).not.toBeNull();
      expect(row?.title).toBe('DB Verify Workspace');
    });
  });

  describe('GET /api/workspaces', () => {
    test('should list all workspaces', async () => {
      const { status, data } = await get<WorkspaceListResponse>('/api/workspaces');

      expect(status).toBe(200);
      expect(Array.isArray(data.data)).toBe(true);
      // Should include sample workspace created on first startup + test workspaces
      expect(data.data.length).toBeGreaterThan(0);
    });

    test('should search workspaces by title', async () => {
      // Create a workspace with unique title
      await post<WorkspaceResponse>('/api/workspaces', {
        title: 'Searchable Alpha',
      });

      const { status, data } = await get<WorkspaceListResponse>('/api/workspaces?q=Searchable');

      expect(status).toBe(200);
      expect(data.data.length).toBeGreaterThanOrEqual(1);
      expect(data.data.some((w) => w.title === 'Searchable Alpha')).toBe(true);
    });

    test('should return empty array for non-matching search', async () => {
      const { status, data } = await get<WorkspaceListResponse>(
        '/api/workspaces?q=NonExistentWorkspaceXYZ123'
      );

      expect(status).toBe(200);
      expect(data.data.length).toBe(0);
    });
  });

  describe('GET /api/workspaces/:id', () => {
    test('should get a workspace by id', async () => {
      const { data: createData } = await post<WorkspaceResponse>('/api/workspaces', {
        title: 'Get By ID Workspace',
      });

      const { status, data } = await get<WorkspaceResponse>(
        `/api/workspaces/${createData.data.id}`
      );

      expect(status).toBe(200);
      expect(data.data.id).toBe(createData.data.id);
      expect(data.data.title).toBe('Get By ID Workspace');
    });

    test('should return 404 for non-existent workspace', async () => {
      const { status, data } = await get<ErrorResponse>('/api/workspaces/nonexistent-id');

      expect(status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/workspaces/:id', () => {
    test('should update workspace title', async () => {
      const { data: createData } = await post<WorkspaceResponse>('/api/workspaces', {
        title: 'Original Title',
      });

      const { status, data } = await put<WorkspaceResponse>(
        `/api/workspaces/${createData.data.id}`,
        { title: 'Updated Title' }
      );

      expect(status).toBe(200);
      expect(data.data.title).toBe('Updated Title');
    });

    test('should update multiple fields', async () => {
      const { data: createData } = await post<WorkspaceResponse>('/api/workspaces', {
        title: 'Multi Update Workspace',
      });

      const { status, data } = await put<WorkspaceResponse>(
        `/api/workspaces/${createData.data.id}`,
        {
          description: 'Updated description',
          autoDeleteDoneTasks: true,
          retentionDays: 14,
        }
      );

      expect(status).toBe(200);
      expect(data.data.description).toBe('Updated description');
      expect(data.data.autoDeleteDoneTasks).toBe(true);
      expect(data.data.retentionDays).toBe(14);
    });

    test('should return 404 for non-existent workspace', async () => {
      const { status, data } = await put<ErrorResponse>('/api/workspaces/nonexistent-id', {
        title: 'New Title',
      });

      expect(status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/workspaces/:id', () => {
    test('should delete a workspace', async () => {
      const { data: createData } = await post<WorkspaceResponse>('/api/workspaces', {
        title: 'To Be Deleted',
      });

      const { status } = await del<{ success: boolean }>(
        `/api/workspaces/${createData.data.id}`
      );

      expect(status).toBe(200);

      // Verify it's gone
      const { status: getStatus } = await get<ErrorResponse>(
        `/api/workspaces/${createData.data.id}`
      );
      expect(getStatus).toBe(404);
    });

    test('should cascade delete related data', async () => {
      // Create workspace
      const { data: workspaceData } = await post<WorkspaceResponse>('/api/workspaces', {
        title: 'Cascade Delete Test',
      });

      // Create an agent in the workspace
      await post('/api/workspaces/' + workspaceData.data.id + '/agents', {
        name: 'Test Agent',
        instruction: 'Test instruction',
        cliType: 'claude',
      });

      // Verify agent exists in database
      // Reset connection to ensure fresh read
      resetDbConnection();
      const dbBefore = getDb();
      const agentBefore = dbBefore
        .query<{ id: string }, [string]>('SELECT id FROM agents WHERE workspace_id = ?')
        .get(workspaceData.data.id);
      expect(agentBefore).not.toBeNull();

      // Delete workspace
      await del(`/api/workspaces/${workspaceData.data.id}`);

      // Reset connection again for fresh read after delete
      resetDbConnection();
      const dbAfter = getDb();
      const agentAfter = dbAfter
        .query<{ id: string }, [string]>('SELECT id FROM agents WHERE workspace_id = ?')
        .get(workspaceData.data.id);
      expect(agentAfter).toBeNull();
    });

    test('should return 404 for non-existent workspace', async () => {
      const { status, data } = await del<ErrorResponse>('/api/workspaces/nonexistent-id');

      expect(status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });
});
