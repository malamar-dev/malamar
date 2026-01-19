import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';

import { closeDb, initDb, resetDb, runMigrations } from '../core/database.ts';
import { NotFoundError } from '../core/errors.ts';
import * as service from './service.ts';

let testDbPath: string | null = null;

function setupTestDb() {
  const testDir = join(tmpdir(), 'malamar-workspace-service-test');
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
  closeDb();
  resetDb();
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
  // Re-establish the singleton to point to our test database
  // This is necessary because other parallel tests may have switched it
  const db = initDb(testDbPath!);
  db.exec('DELETE FROM agents');
  db.exec('DELETE FROM workspaces');
}

describe('workspace service', () => {
  beforeAll(() => {
    setupTestDb();
  });

  afterAll(() => {
    cleanupTestDb();
  });

  beforeEach(() => {
    // First re-establish the singleton, then clear tables
    initDb(testDbPath!);
    clearTables();
  });

  describe('createWorkspace', () => {
    test('creates a workspace', () => {
      const workspace = service.createWorkspace({ title: 'Test' });
      expect(workspace.title).toBe('Test');
      expect(workspace.id).toHaveLength(21);
    });
  });

  describe('getWorkspace', () => {
    test('returns workspace when found', () => {
      const created = service.createWorkspace({ title: 'Test' });
      const found = service.getWorkspace(created.id);
      expect(found.title).toBe('Test');
    });

    test('throws NotFoundError when not found', () => {
      expect(() => service.getWorkspace('nonexistent')).toThrow(NotFoundError);
    });
  });

  describe('listWorkspaces', () => {
    test('returns empty array when no workspaces', () => {
      const workspaces = service.listWorkspaces();
      expect(workspaces).toEqual([]);
    });

    test('returns all workspaces', () => {
      service.createWorkspace({ title: 'First' });
      service.createWorkspace({ title: 'Second' });
      const workspaces = service.listWorkspaces();
      expect(workspaces).toHaveLength(2);
    });
  });

  describe('searchWorkspaces', () => {
    test('finds workspaces by title', () => {
      service.createWorkspace({ title: 'Project Alpha' });
      service.createWorkspace({ title: 'Project Beta' });
      service.createWorkspace({ title: 'Other' });

      const results = service.searchWorkspaces('Project');
      expect(results).toHaveLength(2);
    });
  });

  describe('updateWorkspace', () => {
    test('updates workspace', () => {
      const created = service.createWorkspace({ title: 'Original' });
      const updated = service.updateWorkspace(created.id, { title: 'Updated' });
      expect(updated.title).toBe('Updated');
    });

    test('throws NotFoundError when not found', () => {
      expect(() => service.updateWorkspace('nonexistent', { title: 'Test' })).toThrow(
        NotFoundError
      );
    });
  });

  describe('deleteWorkspace', () => {
    test('deletes workspace', () => {
      const created = service.createWorkspace({ title: 'Delete Me' });
      service.deleteWorkspace(created.id);
      expect(() => service.getWorkspace(created.id)).toThrow(NotFoundError);
    });

    test('throws NotFoundError when not found', () => {
      expect(() => service.deleteWorkspace('nonexistent')).toThrow(NotFoundError);
    });
  });
});
