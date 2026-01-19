import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Database } from 'bun:sqlite';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { closeDb, resetDb } from '../core/database.ts';
import * as repository from './repository.ts';

describe('workspace repository', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(':memory:');
    // Run migrations
    const migration001 = readFileSync(
      join(process.cwd(), 'migrations/001_workspaces_agents.sql'),
      'utf-8'
    );
    db.exec(migration001);
  });

  afterEach(() => {
    closeDb();
    resetDb();
    db.close();
  });

  describe('create', () => {
    test('creates a workspace with minimal input', () => {
      const workspace = repository.create({ title: 'Test Workspace' }, db);

      expect(workspace.id).toHaveLength(21);
      expect(workspace.title).toBe('Test Workspace');
      expect(workspace.description).toBe('');
      expect(workspace.workingDirectoryMode).toBe('temp');
      expect(workspace.workingDirectoryPath).toBeNull();
      expect(workspace.autoDeleteDoneTasks).toBe(true);
      expect(workspace.retentionDays).toBe(7);
      expect(workspace.notifyOnError).toBe(true);
      expect(workspace.notifyOnInReview).toBe(true);
    });

    test('creates a workspace with full input', () => {
      const workspace = repository.create(
        {
          title: 'Full Workspace',
          description: 'A test workspace',
          workingDirectoryMode: 'static',
          workingDirectoryPath: '/path/to/project',
          autoDeleteDoneTasks: false,
          retentionDays: 14,
          notifyOnError: false,
          notifyOnInReview: false,
        },
        db
      );

      expect(workspace.title).toBe('Full Workspace');
      expect(workspace.description).toBe('A test workspace');
      expect(workspace.workingDirectoryMode).toBe('static');
      expect(workspace.workingDirectoryPath).toBe('/path/to/project');
      expect(workspace.autoDeleteDoneTasks).toBe(false);
      expect(workspace.retentionDays).toBe(14);
      expect(workspace.notifyOnError).toBe(false);
      expect(workspace.notifyOnInReview).toBe(false);
    });
  });

  describe('findById', () => {
    test('returns workspace when found', () => {
      const created = repository.create({ title: 'Find Me' }, db);
      const found = repository.findById(created.id, db);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.title).toBe('Find Me');
    });

    test('returns null when not found', () => {
      const found = repository.findById('nonexistent-id', db);
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    test('returns empty array when no workspaces', () => {
      const workspaces = repository.findAll(db);
      expect(workspaces).toEqual([]);
    });

    test('returns all workspaces', () => {
      repository.create({ title: 'First' }, db);
      repository.create({ title: 'Second' }, db);
      repository.create({ title: 'Third' }, db);

      const workspaces = repository.findAll(db);
      expect(workspaces).toHaveLength(3);
      // Verify all titles are present
      const titles = workspaces.map((w) => w.title);
      expect(titles).toContain('First');
      expect(titles).toContain('Second');
      expect(titles).toContain('Third');
    });
  });

  describe('search', () => {
    test('finds workspaces by title substring', () => {
      repository.create({ title: 'Project Alpha' }, db);
      repository.create({ title: 'Project Beta' }, db);
      repository.create({ title: 'Other Work' }, db);

      const results = repository.search('Project', db);
      expect(results).toHaveLength(2);
    });

    test('returns empty array when no matches', () => {
      repository.create({ title: 'Something' }, db);
      const results = repository.search('Nothing', db);
      expect(results).toEqual([]);
    });

    test('search is case-insensitive', () => {
      repository.create({ title: 'My Project' }, db);
      const results = repository.search('project', db);
      expect(results).toHaveLength(1);
    });
  });

  describe('update', () => {
    test('updates workspace title', () => {
      const created = repository.create({ title: 'Original' }, db);
      const updated = repository.update(created.id, { title: 'Updated' }, db);

      expect(updated?.title).toBe('Updated');
    });

    test('updates multiple fields', () => {
      const created = repository.create({ title: 'Original' }, db);
      const updated = repository.update(
        created.id,
        {
          title: 'New Title',
          description: 'New description',
          retentionDays: 30,
        },
        db
      );

      expect(updated?.title).toBe('New Title');
      expect(updated?.description).toBe('New description');
      expect(updated?.retentionDays).toBe(30);
    });

    test('returns null when workspace not found', () => {
      const updated = repository.update('nonexistent', { title: 'Test' }, db);
      expect(updated).toBeNull();
    });

    test('preserves unchanged fields', () => {
      const created = repository.create(
        {
          title: 'Test',
          description: 'Original description',
          retentionDays: 14,
        },
        db
      );
      const updated = repository.update(created.id, { title: 'Updated' }, db);

      // Updated field changes
      expect(updated?.title).toBe('Updated');
      // Unchanged fields preserved
      expect(updated?.description).toBe('Original description');
      expect(updated?.retentionDays).toBe(14);
    });
  });

  describe('remove', () => {
    test('deletes workspace and returns true', () => {
      const created = repository.create({ title: 'Delete Me' }, db);
      const result = repository.remove(created.id, db);

      expect(result).toBe(true);
      expect(repository.findById(created.id, db)).toBeNull();
    });

    test('returns false when workspace not found', () => {
      const result = repository.remove('nonexistent', db);
      expect(result).toBe(false);
    });
  });

  describe('updateLastActivity', () => {
    test('updates last_activity_at and updated_at fields', () => {
      const created = repository.create({ title: 'Test' }, db);

      // Manually set an old timestamp to test the update
      db.query('UPDATE workspaces SET last_activity_at = ?, updated_at = ? WHERE id = ?').run(
        '2020-01-01T00:00:00.000Z',
        '2020-01-01T00:00:00.000Z',
        created.id
      );

      repository.updateLastActivity(created.id, db);
      const updated = repository.findById(created.id, db);

      expect(updated?.lastActivityAt).not.toBe('2020-01-01T00:00:00.000Z');
      expect(updated?.updatedAt).not.toBe('2020-01-01T00:00:00.000Z');
    });
  });
});
