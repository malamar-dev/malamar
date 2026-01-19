import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Database } from 'bun:sqlite';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { closeDb, resetDb } from '../core/database.ts';
import { generateId, now } from '../shared/index.ts';
import * as repository from './repository.ts';

describe('agent repository', () => {
  let db: Database;
  let workspaceId: string;

  beforeEach(() => {
    db = new Database(':memory:');
    // Run migrations
    const migration001 = readFileSync(
      join(process.cwd(), 'migrations/001_workspaces_agents.sql'),
      'utf-8'
    );
    db.exec(migration001);

    // Create a workspace to attach agents to
    workspaceId = generateId();
    const timestamp = now();
    db.query(
      `INSERT INTO workspaces (id, title, description, working_directory_mode, last_activity_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(workspaceId, 'Test Workspace', '', 'temp', timestamp, timestamp, timestamp);
  });

  afterEach(() => {
    closeDb();
    resetDb();
    db.close();
  });

  describe('create', () => {
    test('creates an agent with minimal input', () => {
      const agent = repository.create(
        {
          workspaceId,
          name: 'Planner',
          instruction: 'Plan the work',
          cliType: 'claude',
        },
        db
      );

      expect(agent.id).toHaveLength(21);
      expect(agent.name).toBe('Planner');
      expect(agent.instruction).toBe('Plan the work');
      expect(agent.cliType).toBe('claude');
      expect(agent.order).toBe(1);
      expect(agent.workspaceId).toBe(workspaceId);
    });

    test('auto-increments order', () => {
      repository.create(
        { workspaceId, name: 'First', instruction: 'First', cliType: 'claude' },
        db
      );
      repository.create(
        { workspaceId, name: 'Second', instruction: 'Second', cliType: 'claude' },
        db
      );
      const third = repository.create(
        { workspaceId, name: 'Third', instruction: 'Third', cliType: 'claude' },
        db
      );

      expect(third.order).toBe(3);
    });

    test('allows explicit order', () => {
      const agent = repository.create(
        {
          workspaceId,
          name: 'Custom Order',
          instruction: 'Test',
          cliType: 'claude',
          order: 10,
        },
        db
      );

      expect(agent.order).toBe(10);
    });
  });

  describe('findById', () => {
    test('returns agent when found', () => {
      const created = repository.create(
        { workspaceId, name: 'Test', instruction: 'Test', cliType: 'claude' },
        db
      );
      const found = repository.findById(created.id, db);

      expect(found).not.toBeNull();
      expect(found?.name).toBe('Test');
    });

    test('returns null when not found', () => {
      const found = repository.findById('nonexistent', db);
      expect(found).toBeNull();
    });
  });

  describe('findByWorkspaceId', () => {
    test('returns empty array when no agents', () => {
      const agents = repository.findByWorkspaceId(workspaceId, db);
      expect(agents).toEqual([]);
    });

    test('returns agents ordered by order', () => {
      repository.create(
        { workspaceId, name: 'Third', instruction: '', cliType: 'claude', order: 3 },
        db
      );
      repository.create(
        { workspaceId, name: 'First', instruction: '', cliType: 'claude', order: 1 },
        db
      );
      repository.create(
        { workspaceId, name: 'Second', instruction: '', cliType: 'claude', order: 2 },
        db
      );

      const agents = repository.findByWorkspaceId(workspaceId, db);
      expect(agents).toHaveLength(3);
      expect(agents[0]?.name).toBe('First');
      expect(agents[1]?.name).toBe('Second');
      expect(agents[2]?.name).toBe('Third');
    });
  });

  describe('findByName', () => {
    test('finds agent by name in workspace', () => {
      repository.create(
        { workspaceId, name: 'Unique', instruction: 'Test', cliType: 'claude' },
        db
      );
      const found = repository.findByName(workspaceId, 'Unique', db);

      expect(found).not.toBeNull();
      expect(found?.name).toBe('Unique');
    });

    test('returns null when name not found', () => {
      const found = repository.findByName(workspaceId, 'NonExistent', db);
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    test('updates agent name', () => {
      const created = repository.create(
        { workspaceId, name: 'Original', instruction: 'Test', cliType: 'claude' },
        db
      );
      const updated = repository.update(created.id, { name: 'Updated' }, db);

      expect(updated?.name).toBe('Updated');
    });

    test('updates multiple fields', () => {
      const created = repository.create(
        { workspaceId, name: 'Original', instruction: 'Original', cliType: 'claude' },
        db
      );
      const updated = repository.update(
        created.id,
        { name: 'New Name', instruction: 'New Instruction', cliType: 'gemini' },
        db
      );

      expect(updated?.name).toBe('New Name');
      expect(updated?.instruction).toBe('New Instruction');
      expect(updated?.cliType).toBe('gemini');
    });

    test('returns null when agent not found', () => {
      const updated = repository.update('nonexistent', { name: 'Test' }, db);
      expect(updated).toBeNull();
    });
  });

  describe('remove', () => {
    test('deletes agent and returns true', () => {
      const created = repository.create(
        { workspaceId, name: 'Delete Me', instruction: 'Test', cliType: 'claude' },
        db
      );
      const result = repository.remove(created.id, db);

      expect(result).toBe(true);
      expect(repository.findById(created.id, db)).toBeNull();
    });

    test('returns false when agent not found', () => {
      const result = repository.remove('nonexistent', db);
      expect(result).toBe(false);
    });
  });

  describe('reorder', () => {
    test('reorders agents', () => {
      const first = repository.create(
        { workspaceId, name: 'First', instruction: '', cliType: 'claude' },
        db
      );
      const second = repository.create(
        { workspaceId, name: 'Second', instruction: '', cliType: 'claude' },
        db
      );
      const third = repository.create(
        { workspaceId, name: 'Third', instruction: '', cliType: 'claude' },
        db
      );

      // Reorder to: Third, First, Second
      repository.reorder(workspaceId, [third.id, first.id, second.id], db);

      const agents = repository.findByWorkspaceId(workspaceId, db);
      expect(agents[0]?.name).toBe('Third');
      expect(agents[1]?.name).toBe('First');
      expect(agents[2]?.name).toBe('Second');
    });
  });

  describe('getNextOrder', () => {
    test('returns 1 when no agents exist', () => {
      const order = repository.getNextOrder(workspaceId, db);
      expect(order).toBe(1);
    });

    test('returns max order + 1', () => {
      repository.create(
        { workspaceId, name: 'First', instruction: '', cliType: 'claude', order: 5 },
        db
      );
      const order = repository.getNextOrder(workspaceId, db);
      expect(order).toBe(6);
    });
  });
});
