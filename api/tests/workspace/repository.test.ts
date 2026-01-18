import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test';

import * as agentRepository from '../../src/agent/repository.ts';
import * as workspaceRepository from '../../src/workspace/repository.ts';
import { cleanupTestDb, clearTables, getTestDb, setupTestDb } from '../helpers/index.ts';

describe('workspace repository integration', () => {
  beforeAll(() => {
    setupTestDb();
  });

  afterEach(() => {
    clearTables();
  });

  afterAll(() => {
    cleanupTestDb();
  });

  describe('CRUD operations with real SQLite', () => {
    test('creates, reads, updates, and deletes a workspace', () => {
      const db = getTestDb();

      // Create
      const created = workspaceRepository.create({ title: 'Integration Test Workspace' }, db);
      expect(created.id).toHaveLength(21);
      expect(created.title).toBe('Integration Test Workspace');

      // Read
      const found = workspaceRepository.findById(created.id, db);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.title).toBe('Integration Test Workspace');

      // Update
      const updated = workspaceRepository.update(created.id, { title: 'Updated Title' }, db);
      expect(updated?.title).toBe('Updated Title');

      // Verify update persisted
      const refetched = workspaceRepository.findById(created.id, db);
      expect(refetched?.title).toBe('Updated Title');

      // Delete
      const deleted = workspaceRepository.remove(created.id, db);
      expect(deleted).toBe(true);

      // Verify deletion
      const afterDelete = workspaceRepository.findById(created.id, db);
      expect(afterDelete).toBeNull();
    });

    test('handles multiple workspaces correctly', () => {
      const db = getTestDb();

      const workspace1 = workspaceRepository.create({ title: 'First Workspace' }, db);
      const workspace2 = workspaceRepository.create({ title: 'Second Workspace' }, db);
      const workspace3 = workspaceRepository.create({ title: 'Third Workspace' }, db);

      const all = workspaceRepository.findAll(db);
      expect(all).toHaveLength(3);

      // Verify each workspace can be retrieved individually
      expect(workspaceRepository.findById(workspace1.id, db)?.title).toBe('First Workspace');
      expect(workspaceRepository.findById(workspace2.id, db)?.title).toBe('Second Workspace');
      expect(workspaceRepository.findById(workspace3.id, db)?.title).toBe('Third Workspace');
    });

    test('creates workspace with all fields', () => {
      const db = getTestDb();

      const workspace = workspaceRepository.create(
        {
          title: 'Full Workspace',
          description: 'A complete workspace',
          workingDirectoryMode: 'static',
          workingDirectoryPath: '/path/to/project',
          autoDeleteDoneTasks: false,
          retentionDays: 30,
          notifyOnError: false,
          notifyOnInReview: false,
        },
        db
      );

      const found = workspaceRepository.findById(workspace.id, db);
      expect(found).not.toBeNull();
      expect(found?.title).toBe('Full Workspace');
      expect(found?.description).toBe('A complete workspace');
      expect(found?.workingDirectoryMode).toBe('static');
      expect(found?.workingDirectoryPath).toBe('/path/to/project');
      expect(found?.autoDeleteDoneTasks).toBe(false);
      expect(found?.retentionDays).toBe(30);
      expect(found?.notifyOnError).toBe(false);
      expect(found?.notifyOnInReview).toBe(false);
    });
  });

  describe('cascade delete behavior', () => {
    test('deleting a workspace cascades to its agents', () => {
      const db = getTestDb();

      // Create workspace
      const workspace = workspaceRepository.create({ title: 'Workspace with Agents' }, db);

      // Create agents in the workspace
      const agent1 = agentRepository.create(
        {
          workspaceId: workspace.id,
          name: 'Agent 1',
          instruction: 'Instructions for agent 1',
          cliType: 'claude',
        },
        db
      );

      const agent2 = agentRepository.create(
        {
          workspaceId: workspace.id,
          name: 'Agent 2',
          instruction: 'Instructions for agent 2',
          cliType: 'claude',
        },
        db
      );

      // Verify agents exist
      expect(agentRepository.findById(agent1.id, db)).not.toBeNull();
      expect(agentRepository.findById(agent2.id, db)).not.toBeNull();
      expect(agentRepository.findByWorkspaceId(workspace.id, db)).toHaveLength(2);

      // Delete workspace
      workspaceRepository.remove(workspace.id, db);

      // Verify agents are also deleted
      expect(agentRepository.findById(agent1.id, db)).toBeNull();
      expect(agentRepository.findById(agent2.id, db)).toBeNull();
      expect(agentRepository.findByWorkspaceId(workspace.id, db)).toHaveLength(0);
    });

    test('deleting one workspace does not affect agents in other workspaces', () => {
      const db = getTestDb();

      // Create two workspaces
      const workspace1 = workspaceRepository.create({ title: 'Workspace 1' }, db);
      const workspace2 = workspaceRepository.create({ title: 'Workspace 2' }, db);

      // Create agents in each workspace
      const agent1 = agentRepository.create(
        {
          workspaceId: workspace1.id,
          name: 'Agent in Workspace 1',
          instruction: 'Instructions',
          cliType: 'claude',
        },
        db
      );

      const agent2 = agentRepository.create(
        {
          workspaceId: workspace2.id,
          name: 'Agent in Workspace 2',
          instruction: 'Instructions',
          cliType: 'claude',
        },
        db
      );

      // Delete first workspace
      workspaceRepository.remove(workspace1.id, db);

      // Verify agent1 is deleted
      expect(agentRepository.findById(agent1.id, db)).toBeNull();

      // Verify agent2 still exists
      expect(agentRepository.findById(agent2.id, db)).not.toBeNull();
      expect(agentRepository.findByWorkspaceId(workspace2.id, db)).toHaveLength(1);
    });
  });

  describe('search functionality', () => {
    test('searches workspaces by title substring', () => {
      const db = getTestDb();

      workspaceRepository.create({ title: 'Project Alpha' }, db);
      workspaceRepository.create({ title: 'Project Beta' }, db);
      workspaceRepository.create({ title: 'Other Work' }, db);
      workspaceRepository.create({ title: 'Alpha Testing' }, db);

      // Search for "Project"
      const projectResults = workspaceRepository.search('Project', db);
      expect(projectResults).toHaveLength(2);
      expect(projectResults.some((w) => w.title === 'Project Alpha')).toBe(true);
      expect(projectResults.some((w) => w.title === 'Project Beta')).toBe(true);

      // Search for "Alpha"
      const alphaResults = workspaceRepository.search('Alpha', db);
      expect(alphaResults).toHaveLength(2);
      expect(alphaResults.some((w) => w.title === 'Project Alpha')).toBe(true);
      expect(alphaResults.some((w) => w.title === 'Alpha Testing')).toBe(true);
    });

    test('search is case-insensitive', () => {
      const db = getTestDb();

      workspaceRepository.create({ title: 'My Project' }, db);
      workspaceRepository.create({ title: 'Another PROJECT' }, db);

      const lowerResults = workspaceRepository.search('project', db);
      expect(lowerResults).toHaveLength(2);

      const upperResults = workspaceRepository.search('PROJECT', db);
      expect(upperResults).toHaveLength(2);

      const mixedResults = workspaceRepository.search('PrOjEcT', db);
      expect(mixedResults).toHaveLength(2);
    });

    test('returns empty array when no matches found', () => {
      const db = getTestDb();

      workspaceRepository.create({ title: 'Something' }, db);
      workspaceRepository.create({ title: 'Else' }, db);

      const results = workspaceRepository.search('NotFound', db);
      expect(results).toEqual([]);
    });

    test('searches handle special characters', () => {
      const db = getTestDb();

      workspaceRepository.create({ title: 'Test (2024)' }, db);
      workspaceRepository.create({ title: 'Test-Project' }, db);

      const parenthesesResults = workspaceRepository.search('(2024)', db);
      expect(parenthesesResults).toHaveLength(1);

      const hyphenResults = workspaceRepository.search('Test-Project', db);
      expect(hyphenResults).toHaveLength(1);
    });
  });

  describe('ordering', () => {
    test('findAll returns workspaces ordered by last activity descending', () => {
      const db = getTestDb();

      // Create workspaces with different timestamps
      const workspace1 = workspaceRepository.create({ title: 'First' }, db);
      workspaceRepository.create({ title: 'Second' }, db);
      workspaceRepository.create({ title: 'Third' }, db);

      // Update activity on workspace1 to make it most recent using ISO timestamp
      const futureTimestamp = new Date(Date.now() + 60000).toISOString();
      db.exec(`UPDATE workspaces SET last_activity_at = '${futureTimestamp}' WHERE id = '${workspace1.id}'`);

      const all = workspaceRepository.findAll(db);

      // First workspace should now be first (most recent activity)
      expect(all[0]?.id).toBe(workspace1.id);
    });
  });

  describe('updateLastActivity', () => {
    test('updates both last_activity_at and updated_at', () => {
      const db = getTestDb();

      const workspace = workspaceRepository.create({ title: 'Test' }, db);
      const originalActivityAt = workspace.lastActivityAt;
      const originalUpdatedAt = workspace.updatedAt;

      // Wait a tiny bit to ensure timestamp difference
      Bun.sleepSync(10);

      workspaceRepository.updateLastActivity(workspace.id, db);

      const updated = workspaceRepository.findById(workspace.id, db);
      expect(updated?.lastActivityAt).not.toBe(originalActivityAt);
      expect(updated?.updatedAt).not.toBe(originalUpdatedAt);
    });
  });

  describe('concurrent access', () => {
    test('handles rapid sequential operations correctly', () => {
      const db = getTestDb();

      // Create multiple workspaces rapidly
      const workspaces = [];
      for (let i = 0; i < 10; i++) {
        workspaces.push(workspaceRepository.create({ title: `Workspace ${i}` }, db));
      }

      // Verify all were created
      expect(workspaceRepository.findAll(db)).toHaveLength(10);

      // Update all workspaces
      for (const workspace of workspaces) {
        workspaceRepository.update(workspace.id, { description: 'Updated' }, db);
      }

      // Verify all updates persisted
      const all = workspaceRepository.findAll(db);
      expect(all.every((w) => w.description === 'Updated')).toBe(true);
    });
  });
});
