import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Database } from 'bun:sqlite';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';

import { initDb, runMigrations } from '../core/database.ts';
import { ConflictError, NotFoundError } from '../core/errors.ts';
import { generateId, now } from '../shared/index.ts';
import * as service from './service.ts';

let testDbPath: string | null = null;
let workspaceId: string;

function setupTestDb() {
  const testDir = join(tmpdir(), 'malamar-agent-service-test');
  if (!existsSync(testDir)) {
    mkdirSync(testDir, { recursive: true });
  }
  testDbPath = join(testDir, `test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  const db = initDb(testDbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  runMigrations(join(process.cwd(), 'migrations'), db);
  return db;
}

function cleanupTestDb() {
  if (testDbPath && existsSync(testDbPath)) {
    rmSync(testDbPath, { force: true });
    const walPath = `${testDbPath}-wal`;
    const shmPath = `${testDbPath}-shm`;
    if (existsSync(walPath)) rmSync(walPath, { force: true });
    if (existsSync(shmPath)) rmSync(shmPath, { force: true });
  }
  testDbPath = null;
}

function clearTables() {
  const db = initDb(testDbPath!);
  db.exec('DELETE FROM agents');
  db.exec('DELETE FROM workspaces');
}

function createTestWorkspace(db: Database) {
  workspaceId = generateId();
  const timestamp = now();
  db.query(
    `INSERT INTO workspaces (id, title, description, working_directory_mode, last_activity_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(workspaceId, 'Test Workspace', '', 'temp', timestamp, timestamp, timestamp);
}

describe('agent service', () => {
  let db: Database;

  beforeAll(() => {
    db = setupTestDb();
  });

  afterAll(() => {
    cleanupTestDb();
  });

  beforeEach(() => {
    // Re-establish the singleton to point to our test database
    initDb(testDbPath!);
    clearTables();
    createTestWorkspace(db);
  });

  describe('createAgent', () => {
    test('creates an agent', () => {
      const agent = service.createAgent({
        workspaceId,
        name: 'Planner',
        instruction: 'Plan the work',
        cliType: 'claude',
      });

      expect(agent.name).toBe('Planner');
      expect(agent.order).toBe(1);
    });

    test('throws ConflictError for duplicate name', () => {
      service.createAgent({
        workspaceId,
        name: 'Planner',
        instruction: 'Plan',
        cliType: 'claude',
      });

      expect(() =>
        service.createAgent({
          workspaceId,
          name: 'Planner',
          instruction: 'Other',
          cliType: 'claude',
        })
      ).toThrow(ConflictError);
    });
  });

  describe('getAgent', () => {
    test('returns agent when found', () => {
      const created = service.createAgent({
        workspaceId,
        name: 'Test',
        instruction: 'Test',
        cliType: 'claude',
      });
      const found = service.getAgent(created.id);
      expect(found.name).toBe('Test');
    });

    test('throws NotFoundError when not found', () => {
      expect(() => service.getAgent('nonexistent')).toThrow(NotFoundError);
    });
  });

  describe('listAgents', () => {
    test('returns empty array when no agents', () => {
      const agents = service.listAgents(workspaceId);
      expect(agents).toEqual([]);
    });

    test('returns agents in order', () => {
      service.createAgent({ workspaceId, name: 'First', instruction: '', cliType: 'claude' });
      service.createAgent({ workspaceId, name: 'Second', instruction: '', cliType: 'claude' });

      const agents = service.listAgents(workspaceId);
      expect(agents).toHaveLength(2);
      expect(agents[0]?.name).toBe('First');
      expect(agents[1]?.name).toBe('Second');
    });
  });

  describe('updateAgent', () => {
    test('updates agent', () => {
      const created = service.createAgent({
        workspaceId,
        name: 'Original',
        instruction: 'Test',
        cliType: 'claude',
      });
      const updated = service.updateAgent(created.id, { name: 'Updated' });
      expect(updated.name).toBe('Updated');
    });

    test('throws NotFoundError when not found', () => {
      expect(() => service.updateAgent('nonexistent', { name: 'Test' })).toThrow(NotFoundError);
    });

    test('throws ConflictError when renaming to existing name', () => {
      service.createAgent({ workspaceId, name: 'First', instruction: '', cliType: 'claude' });
      const second = service.createAgent({
        workspaceId,
        name: 'Second',
        instruction: '',
        cliType: 'claude',
      });

      expect(() => service.updateAgent(second.id, { name: 'First' })).toThrow(ConflictError);
    });

    test('allows updating to same name', () => {
      const created = service.createAgent({
        workspaceId,
        name: 'Same',
        instruction: 'Original',
        cliType: 'claude',
      });
      const updated = service.updateAgent(created.id, { name: 'Same', instruction: 'Updated' });
      expect(updated.instruction).toBe('Updated');
    });
  });

  describe('deleteAgent', () => {
    test('deletes agent', () => {
      const created = service.createAgent({
        workspaceId,
        name: 'Delete Me',
        instruction: 'Test',
        cliType: 'claude',
      });
      service.deleteAgent(created.id);
      expect(() => service.getAgent(created.id)).toThrow(NotFoundError);
    });

    test('throws NotFoundError when not found', () => {
      expect(() => service.deleteAgent('nonexistent')).toThrow(NotFoundError);
    });
  });

  describe('reorderAgents', () => {
    test('reorders agents', () => {
      const first = service.createAgent({
        workspaceId,
        name: 'First',
        instruction: '',
        cliType: 'claude',
      });
      const second = service.createAgent({
        workspaceId,
        name: 'Second',
        instruction: '',
        cliType: 'claude',
      });

      service.reorderAgents(workspaceId, [second.id, first.id]);

      const agents = service.listAgents(workspaceId);
      expect(agents[0]?.name).toBe('Second');
      expect(agents[1]?.name).toBe('First');
    });
  });
});
