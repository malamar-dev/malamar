import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test';

import * as agentRepository from '../../src/agent/repository.ts';
import { NotFoundError } from '../../src/core/errors.ts';
import * as workspaceService from '../../src/workspace/service.ts';
import { cleanupTestDb, clearTables, getTestDb, setupTestDb } from '../helpers/index.ts';

describe('workspace service integration', () => {
  beforeAll(() => {
    setupTestDb();
  });

  afterEach(() => {
    clearTables();
  });

  afterAll(() => {
    cleanupTestDb();
  });

  describe('createWorkspace', () => {
    test('creates a workspace with minimal input', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      expect(workspace.id).toHaveLength(21);
      expect(workspace.title).toBe('Test Workspace');
      expect(workspace.description).toBe('');
      expect(workspace.workingDirectoryMode).toBe('temp');
      expect(workspace.autoDeleteDoneTasks).toBe(true);
      expect(workspace.retentionDays).toBe(7);
      expect(workspace.notifyOnError).toBe(true);
      expect(workspace.notifyOnInReview).toBe(true);
    });

    test('creates a workspace with all options', () => {
      const workspace = workspaceService.createWorkspace({
        title: 'Full Workspace',
        description: 'Complete description',
        workingDirectoryMode: 'static',
        workingDirectoryPath: '/custom/path',
        autoDeleteDoneTasks: false,
        retentionDays: 14,
        notifyOnError: false,
        notifyOnInReview: false,
      });

      expect(workspace.title).toBe('Full Workspace');
      expect(workspace.description).toBe('Complete description');
      expect(workspace.workingDirectoryMode).toBe('static');
      expect(workspace.workingDirectoryPath).toBe('/custom/path');
      expect(workspace.autoDeleteDoneTasks).toBe(false);
      expect(workspace.retentionDays).toBe(14);
      expect(workspace.notifyOnError).toBe(false);
      expect(workspace.notifyOnInReview).toBe(false);
    });
  });

  describe('getWorkspace', () => {
    test('returns workspace when it exists', () => {
      const created = workspaceService.createWorkspace({ title: 'Get Test' });
      const retrieved = workspaceService.getWorkspace(created.id);

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.title).toBe('Get Test');
    });

    test('throws NotFoundError when workspace does not exist', () => {
      expect(() => workspaceService.getWorkspace('nonexistent-id')).toThrow(NotFoundError);
    });

    test('throws NotFoundError with descriptive message', () => {
      try {
        workspaceService.getWorkspace('test-missing-id');
        expect.unreachable('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        expect((error as NotFoundError).message).toContain('test-missing-id');
      }
    });
  });

  describe('listWorkspaces', () => {
    test('returns empty array when no workspaces exist', () => {
      const workspaces = workspaceService.listWorkspaces();
      expect(workspaces).toEqual([]);
    });

    test('returns all workspaces', () => {
      workspaceService.createWorkspace({ title: 'First' });
      workspaceService.createWorkspace({ title: 'Second' });
      workspaceService.createWorkspace({ title: 'Third' });

      const workspaces = workspaceService.listWorkspaces();
      expect(workspaces).toHaveLength(3);
    });
  });

  describe('searchWorkspaces', () => {
    test('returns matching workspaces', () => {
      workspaceService.createWorkspace({ title: 'Project Alpha' });
      workspaceService.createWorkspace({ title: 'Project Beta' });
      workspaceService.createWorkspace({ title: 'Other Work' });

      const results = workspaceService.searchWorkspaces('Project');
      expect(results).toHaveLength(2);
      expect(results.some((w) => w.title === 'Project Alpha')).toBe(true);
      expect(results.some((w) => w.title === 'Project Beta')).toBe(true);
    });

    test('returns empty array when no matches', () => {
      workspaceService.createWorkspace({ title: 'Something' });

      const results = workspaceService.searchWorkspaces('Nothing');
      expect(results).toEqual([]);
    });
  });

  describe('updateWorkspace', () => {
    test('updates workspace title', () => {
      const created = workspaceService.createWorkspace({ title: 'Original' });
      const updated = workspaceService.updateWorkspace(created.id, { title: 'Updated' });

      expect(updated.title).toBe('Updated');
    });

    test('updates multiple fields', () => {
      const created = workspaceService.createWorkspace({ title: 'Original' });
      const updated = workspaceService.updateWorkspace(created.id, {
        title: 'New Title',
        description: 'New description',
        retentionDays: 30,
      });

      expect(updated.title).toBe('New Title');
      expect(updated.description).toBe('New description');
      expect(updated.retentionDays).toBe(30);
    });

    test('preserves unchanged fields', () => {
      const created = workspaceService.createWorkspace({
        title: 'Original',
        description: 'Keep this',
        retentionDays: 14,
      });

      const updated = workspaceService.updateWorkspace(created.id, { title: 'Changed' });

      expect(updated.title).toBe('Changed');
      expect(updated.description).toBe('Keep this');
      expect(updated.retentionDays).toBe(14);
    });

    test('throws NotFoundError when workspace does not exist', () => {
      expect(() => workspaceService.updateWorkspace('nonexistent', { title: 'Test' })).toThrow(
        NotFoundError
      );
    });
  });

  describe('deleteWorkspace', () => {
    test('deletes an existing workspace', () => {
      const created = workspaceService.createWorkspace({ title: 'To Delete' });

      workspaceService.deleteWorkspace(created.id);

      expect(() => workspaceService.getWorkspace(created.id)).toThrow(NotFoundError);
    });

    test('throws NotFoundError when workspace does not exist', () => {
      expect(() => workspaceService.deleteWorkspace('nonexistent')).toThrow(NotFoundError);
    });

    test('cascades delete to agents', () => {
      const db = getTestDb();

      // Create workspace
      const workspace = workspaceService.createWorkspace({ title: 'With Agents' });

      // Create agents
      agentRepository.create(
        {
          workspaceId: workspace.id,
          name: 'Agent 1',
          instruction: 'Do things',
          cliType: 'claude',
        },
        db
      );

      agentRepository.create(
        {
          workspaceId: workspace.id,
          name: 'Agent 2',
          instruction: 'Do more things',
          cliType: 'gemini',
        },
        db
      );

      // Verify agents exist
      expect(agentRepository.findByWorkspaceId(workspace.id, db)).toHaveLength(2);

      // Delete workspace
      workspaceService.deleteWorkspace(workspace.id);

      // Verify agents are gone
      expect(agentRepository.findByWorkspaceId(workspace.id, db)).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    test('NotFoundError has correct properties', () => {
      try {
        workspaceService.getWorkspace('missing-id');
        expect.unreachable('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        const notFoundError = error as NotFoundError;
        expect(notFoundError.statusCode).toBe(404);
        expect(notFoundError.code).toBe('NOT_FOUND');
      }
    });
  });

  describe('data integrity', () => {
    test('workspace data persists correctly through service layer', () => {
      const input = {
        title: 'Persistence Test',
        description: 'Testing data persistence',
        workingDirectoryMode: 'static' as const,
        workingDirectoryPath: '/test/path',
        autoDeleteDoneTasks: false,
        retentionDays: 21,
        notifyOnError: false,
        notifyOnInReview: true,
      };

      const created = workspaceService.createWorkspace(input);
      const retrieved = workspaceService.getWorkspace(created.id);

      expect(retrieved.title).toBe(input.title);
      expect(retrieved.description).toBe(input.description);
      expect(retrieved.workingDirectoryMode).toBe(input.workingDirectoryMode);
      expect(retrieved.workingDirectoryPath).toBe(input.workingDirectoryPath);
      expect(retrieved.autoDeleteDoneTasks).toBe(input.autoDeleteDoneTasks);
      expect(retrieved.retentionDays).toBe(input.retentionDays);
      expect(retrieved.notifyOnError).toBe(input.notifyOnError);
      expect(retrieved.notifyOnInReview).toBe(input.notifyOnInReview);
    });

    test('timestamps are set correctly', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Timestamp Test' });

      expect(workspace.createdAt).toBeTruthy();
      expect(workspace.updatedAt).toBeTruthy();
      expect(workspace.lastActivityAt).toBeTruthy();

      // Timestamps should be valid ISO strings
      expect(() => new Date(workspace.createdAt)).not.toThrow();
      expect(() => new Date(workspace.updatedAt)).not.toThrow();
      expect(() => new Date(workspace.lastActivityAt)).not.toThrow();
    });
  });
});
