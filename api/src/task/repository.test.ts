import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Database } from 'bun:sqlite';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { closeDb, resetDb } from '../core/database.ts';
import { generateId, now } from '../shared/index.ts';
import * as repository from './repository.ts';

describe('task repository', () => {
  let db: Database;
  let workspaceId: string;

  beforeEach(() => {
    db = new Database(':memory:');
    // Run migrations
    const migration001 = readFileSync(
      join(process.cwd(), 'migrations/001_workspaces_agents.sql'),
      'utf-8'
    );
    const migration002 = readFileSync(join(process.cwd(), 'migrations/002_tasks.sql'), 'utf-8');
    db.exec(migration001);
    db.exec(migration002);

    // Create a workspace
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

  describe('task CRUD', () => {
    test('creates a task', () => {
      const task = repository.create({ workspaceId, summary: 'Test Task' }, db);

      expect(task.id).toHaveLength(21);
      expect(task.summary).toBe('Test Task');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.workspaceId).toBe(workspaceId);
    });

    test('finds task by id', () => {
      const created = repository.create({ workspaceId, summary: 'Find Me' }, db);
      const found = repository.findById(created.id, db);

      expect(found).not.toBeNull();
      expect(found?.summary).toBe('Find Me');
    });

    test('updates task', () => {
      const created = repository.create({ workspaceId, summary: 'Original' }, db);
      const updated = repository.update(created.id, { summary: 'Updated' }, db);

      expect(updated?.summary).toBe('Updated');
    });

    test('removes task', () => {
      const created = repository.create({ workspaceId, summary: 'Delete Me' }, db);
      const result = repository.remove(created.id, db);

      expect(result).toBe(true);
      expect(repository.findById(created.id, db)).toBeNull();
    });

    test('updates status', () => {
      const created = repository.create({ workspaceId, summary: 'Test' }, db);
      repository.updateStatus(created.id, 'in_progress', db);
      const updated = repository.findById(created.id, db);

      expect(updated?.status).toBe('in_progress');
    });

    test('deletes done tasks by workspace', () => {
      repository.create({ workspaceId, summary: 'Task 1' }, db);
      const task2 = repository.create({ workspaceId, summary: 'Task 2' }, db);
      repository.updateStatus(task2.id, 'done', db);

      const deleted = repository.deleteDoneByWorkspace(workspaceId, db);

      expect(deleted).toBe(1);
      const remaining = repository.findByWorkspaceId(workspaceId, db);
      expect(remaining).toHaveLength(1);
    });
  });

  describe('task comments', () => {
    test('creates and finds comments', () => {
      const task = repository.create({ workspaceId, summary: 'Test' }, db);

      repository.createComment(
        {
          taskId: task.id,
          workspaceId,
          content: 'First comment',
        },
        db
      );

      repository.createComment(
        {
          taskId: task.id,
          workspaceId,
          agentId: 'agent123',
          content: 'Agent comment',
        },
        db
      );

      const comments = repository.findCommentsByTaskId(task.id, db);
      expect(comments).toHaveLength(2);
      expect(comments[0]?.content).toBe('First comment');
      expect(comments[1]?.agentId).toBe('agent123');
    });
  });

  describe('task logs', () => {
    test('creates and finds logs', () => {
      const task = repository.create({ workspaceId, summary: 'Test' }, db);

      repository.createLog(
        {
          taskId: task.id,
          workspaceId,
          eventType: 'task_created',
          actorType: 'user',
          actorId: 'user123',
        },
        db
      );

      repository.createLog(
        {
          taskId: task.id,
          workspaceId,
          eventType: 'status_changed',
          actorType: 'system',
          metadata: { old_status: 'todo', new_status: 'in_progress' },
        },
        db
      );

      const logs = repository.findLogsByTaskId(task.id, db);
      expect(logs).toHaveLength(2);
      expect(logs[0]?.eventType).toBe('task_created');
      expect(logs[1]?.metadata).toEqual({ old_status: 'todo', new_status: 'in_progress' });
    });
  });

  describe('task queue', () => {
    test('creates and finds queue items', () => {
      const task = repository.create({ workspaceId, summary: 'Test' }, db);
      const queueItem = repository.createQueueItem(
        {
          taskId: task.id,
          workspaceId,
        },
        db
      );

      expect(queueItem.status).toBe('queued');
      expect(queueItem.isPriority).toBe(false);

      const found = repository.findQueueItemByTaskId(task.id, db);
      expect(found?.id).toBe(queueItem.id);
    });

    test('finds queued items by workspace', () => {
      const task1 = repository.create({ workspaceId, summary: 'Task 1' }, db);
      const task2 = repository.create({ workspaceId, summary: 'Task 2' }, db);

      repository.createQueueItem({ taskId: task1.id, workspaceId }, db);
      repository.createQueueItem({ taskId: task2.id, workspaceId, isPriority: true }, db);

      const queued = repository.findQueuedByWorkspace(workspaceId, db);
      expect(queued).toHaveLength(2);
      // Priority item should be first
      expect(queued[0]?.taskId).toBe(task2.id);
    });

    test('updates queue status', () => {
      const task = repository.create({ workspaceId, summary: 'Test' }, db);
      const queueItem = repository.createQueueItem({ taskId: task.id, workspaceId }, db);

      repository.updateQueueStatus(queueItem.id, 'in_progress', db);

      // Should not find it as queued anymore
      const found = repository.findQueueItemByTaskId(task.id, db);
      expect(found).toBeNull();
    });

    test('sets queue priority', () => {
      const task = repository.create({ workspaceId, summary: 'Test' }, db);
      repository.createQueueItem({ taskId: task.id, workspaceId }, db);

      repository.setQueuePriority(task.id, true, db);

      const found = repository.findQueueItemByTaskId(task.id, db);
      expect(found?.isPriority).toBe(true);
    });
  });
});
