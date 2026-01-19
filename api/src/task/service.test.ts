import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Database } from 'bun:sqlite';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';

import { closeDb, initDb, resetDb, runMigrations } from '../core/database.ts';
import { NotFoundError } from '../core/errors.ts';
import { generateId, now } from '../shared/index.ts';
import * as service from './service.ts';

let testDbPath: string | null = null;
let workspaceId: string;

function setupTestDb() {
  const testDir = join(tmpdir(), 'malamar-task-service-test');
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
  const db = initDb(testDbPath!);
  db.exec('DELETE FROM task_queue');
  db.exec('DELETE FROM task_logs');
  db.exec('DELETE FROM task_comments');
  db.exec('DELETE FROM tasks');
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

describe('task service', () => {
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

  describe('createTask', () => {
    test('creates task with queue item and log', () => {
      const task = service.createTask({ workspaceId, summary: 'Test Task' });

      expect(task.summary).toBe('Test Task');
      expect(task.status).toBe('todo');

      const logs = service.getLogs(task.id);
      expect(logs).toHaveLength(1);
      expect(logs[0]?.eventType).toBe('task_created');
    });
  });

  describe('getTask', () => {
    test('returns task when found', () => {
      const created = service.createTask({ workspaceId, summary: 'Test' });
      const found = service.getTask(created.id);
      expect(found.summary).toBe('Test');
    });

    test('throws NotFoundError when not found', () => {
      expect(() => service.getTask('nonexistent')).toThrow(NotFoundError);
    });
  });

  describe('updateTask', () => {
    test('updates task', () => {
      const created = service.createTask({ workspaceId, summary: 'Original' });
      const updated = service.updateTask(created.id, { summary: 'Updated' });
      expect(updated.summary).toBe('Updated');
    });

    test('logs status change', () => {
      const created = service.createTask({ workspaceId, summary: 'Test' });
      service.updateTask(created.id, { status: 'in_progress' });

      const logs = service.getLogs(created.id);
      expect(logs.some((l) => l.eventType === 'status_changed')).toBe(true);
    });
  });

  describe('deleteTask', () => {
    test('deletes task', () => {
      const created = service.createTask({ workspaceId, summary: 'Delete Me' });
      service.deleteTask(created.id);
      expect(() => service.getTask(created.id)).toThrow(NotFoundError);
    });
  });

  describe('addComment', () => {
    test('adds comment and log', () => {
      const task = service.createTask({ workspaceId, summary: 'Test' });
      const comment = service.addComment(task.id, 'Test comment');

      expect(comment.content).toBe('Test comment');

      const comments = service.getComments(task.id);
      expect(comments).toHaveLength(1);

      const logs = service.getLogs(task.id);
      expect(logs.some((l) => l.eventType === 'comment_added')).toBe(true);
    });
  });

  describe('prioritizeTask', () => {
    test('prioritizes task and logs', () => {
      const task = service.createTask({ workspaceId, summary: 'Test' });
      service.prioritizeTask(task.id);

      const logs = service.getLogs(task.id);
      expect(logs.some((l) => l.eventType === 'task_prioritized')).toBe(true);
    });
  });

  describe('cancelTask', () => {
    test('cancels task with comment and log', () => {
      const task = service.createTask({ workspaceId, summary: 'Test' });
      service.cancelTask(task.id);

      const updated = service.getTask(task.id);
      expect(updated.status).toBe('in_review');

      const comments = service.getComments(task.id);
      expect(comments.some((c) => c.content.includes('cancelled'))).toBe(true);

      const logs = service.getLogs(task.id);
      expect(logs.some((l) => l.eventType === 'task_cancelled')).toBe(true);
    });
  });

  describe('deleteDoneTasks', () => {
    test('deletes only done tasks', () => {
      service.createTask({ workspaceId, summary: 'Task 1' });
      const task2 = service.createTask({ workspaceId, summary: 'Task 2' });
      service.updateTask(task2.id, { status: 'done' });

      const deleted = service.deleteDoneTasks(workspaceId);
      expect(deleted).toBe(1);

      const remaining = service.listTasks(workspaceId);
      expect(remaining).toHaveLength(1);
    });
  });
});
