import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Database } from 'bun:sqlite';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { initDb, resetDb } from '../core/database.ts';
import { NotFoundError } from '../core/errors.ts';
import * as service from './service.ts';

describe('workspace service', () => {
  let db: Database;

  beforeEach(() => {
    resetDb();
    db = initDb(':memory:');
    // Run migrations
    const migration001 = readFileSync(
      join(process.cwd(), 'migrations/001_workspaces_agents.sql'),
      'utf-8'
    );
    db.exec(migration001);
  });

  afterEach(() => {
    db.close();
    resetDb();
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
