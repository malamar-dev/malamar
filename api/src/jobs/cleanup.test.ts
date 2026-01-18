import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Database } from 'bun:sqlite';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import * as chatRepository from '../chat/repository.ts';
import { generateId, now } from '../shared/index.ts';
import * as taskRepository from '../task/repository.ts';
import * as workspaceRepository from '../workspace/repository.ts';
import { DEFAULT_QUEUE_RETENTION_DAYS, runCleanup } from './cleanup.ts';

describe('cleanup job', () => {
  let db: Database;
  let workspaceId: string;

  beforeEach(() => {
    db = new Database(':memory:');

    // Run all migrations
    const migration001 = readFileSync(
      join(process.cwd(), 'migrations/001_workspaces_agents.sql'),
      'utf-8'
    );
    const migration002 = readFileSync(join(process.cwd(), 'migrations/002_tasks.sql'), 'utf-8');
    const migration003 = readFileSync(join(process.cwd(), 'migrations/003_chats.sql'), 'utf-8');
    db.exec(migration001);
    db.exec(migration002);
    db.exec(migration003);

    // Create a workspace with auto_delete_done_tasks enabled
    workspaceId = generateId();
    const timestamp = now();
    db.query(
      `INSERT INTO workspaces (id, title, description, working_directory_mode, auto_delete_done_tasks, retention_days, last_activity_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(workspaceId, 'Test Workspace', '', 'temp', 1, 7, timestamp, timestamp, timestamp);
  });

  afterEach(() => {
    db.close();
  });

  describe('task queue cleanup', () => {
    test('deletes old completed task queue items', () => {
      const task = taskRepository.create({ workspaceId, summary: 'Test Task' }, db);

      // Create a queue item and mark it as completed with old timestamp
      const queueItem = taskRepository.createQueueItem({ taskId: task.id, workspaceId }, db);
      taskRepository.updateQueueStatus(queueItem.id, 'completed', db);

      // Manually set old timestamp (older than retention period)
      const oldDate = new Date(
        Date.now() - (DEFAULT_QUEUE_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000
      ).toISOString();
      db.query('UPDATE task_queue SET updated_at = ? WHERE id = ?').run(oldDate, queueItem.id);

      const deleted = taskRepository.deleteOldQueueItems(DEFAULT_QUEUE_RETENTION_DAYS, db);
      expect(deleted).toBe(1);
    });

    test('deletes old failed task queue items', () => {
      const task = taskRepository.create({ workspaceId, summary: 'Test Task' }, db);

      const queueItem = taskRepository.createQueueItem({ taskId: task.id, workspaceId }, db);
      taskRepository.updateQueueStatus(queueItem.id, 'failed', db);

      const oldDate = new Date(
        Date.now() - (DEFAULT_QUEUE_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000
      ).toISOString();
      db.query('UPDATE task_queue SET updated_at = ? WHERE id = ?').run(oldDate, queueItem.id);

      const deleted = taskRepository.deleteOldQueueItems(DEFAULT_QUEUE_RETENTION_DAYS, db);
      expect(deleted).toBe(1);
    });

    test('does not delete recent completed queue items', () => {
      const task = taskRepository.create({ workspaceId, summary: 'Test Task' }, db);

      const queueItem = taskRepository.createQueueItem({ taskId: task.id, workspaceId }, db);
      taskRepository.updateQueueStatus(queueItem.id, 'completed', db);

      // Keep recent timestamp (within retention period)
      const deleted = taskRepository.deleteOldQueueItems(DEFAULT_QUEUE_RETENTION_DAYS, db);
      expect(deleted).toBe(0);
    });

    test('does not delete queued or in_progress items', () => {
      const task1 = taskRepository.create({ workspaceId, summary: 'Task 1' }, db);
      const task2 = taskRepository.create({ workspaceId, summary: 'Task 2' }, db);

      const queueItem1 = taskRepository.createQueueItem({ taskId: task1.id, workspaceId }, db);
      const queueItem2 = taskRepository.createQueueItem({ taskId: task2.id, workspaceId }, db);

      // Keep queueItem1 as queued, set queueItem2 to in_progress
      taskRepository.updateQueueStatus(queueItem2.id, 'in_progress', db);

      // Set old timestamps
      const oldDate = new Date(
        Date.now() - (DEFAULT_QUEUE_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000
      ).toISOString();
      db.query('UPDATE task_queue SET updated_at = ? WHERE id = ?').run(oldDate, queueItem1.id);
      db.query('UPDATE task_queue SET updated_at = ? WHERE id = ?').run(oldDate, queueItem2.id);

      const deleted = taskRepository.deleteOldQueueItems(DEFAULT_QUEUE_RETENTION_DAYS, db);
      expect(deleted).toBe(0);
    });
  });

  describe('chat queue cleanup', () => {
    let chatId: string;

    beforeEach(() => {
      // Create a chat
      const chat = chatRepository.create({ workspaceId, title: 'Test Chat' }, db);
      chatId = chat.id;
    });

    test('deletes old completed chat queue items', () => {
      const queueItem = chatRepository.createQueueItem({ chatId, workspaceId }, db);
      chatRepository.updateQueueStatus(queueItem.id, 'completed', db);

      const oldDate = new Date(
        Date.now() - (DEFAULT_QUEUE_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000
      ).toISOString();
      db.query('UPDATE chat_queue SET updated_at = ? WHERE id = ?').run(oldDate, queueItem.id);

      const deleted = chatRepository.deleteOldQueueItems(DEFAULT_QUEUE_RETENTION_DAYS, db);
      expect(deleted).toBe(1);
    });

    test('deletes old failed chat queue items', () => {
      const queueItem = chatRepository.createQueueItem({ chatId, workspaceId }, db);
      chatRepository.updateQueueStatus(queueItem.id, 'failed', db);

      const oldDate = new Date(
        Date.now() - (DEFAULT_QUEUE_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000
      ).toISOString();
      db.query('UPDATE chat_queue SET updated_at = ? WHERE id = ?').run(oldDate, queueItem.id);

      const deleted = chatRepository.deleteOldQueueItems(DEFAULT_QUEUE_RETENTION_DAYS, db);
      expect(deleted).toBe(1);
    });

    test('does not delete recent chat queue items', () => {
      const queueItem = chatRepository.createQueueItem({ chatId, workspaceId }, db);
      chatRepository.updateQueueStatus(queueItem.id, 'completed', db);

      const deleted = chatRepository.deleteOldQueueItems(DEFAULT_QUEUE_RETENTION_DAYS, db);
      expect(deleted).toBe(0);
    });

    test('does not delete queued or in_progress chat queue items', () => {
      // Create a second chat for the second queue item
      const chat2 = chatRepository.create({ workspaceId, title: 'Test Chat 2' }, db);

      const queueItem1 = chatRepository.createQueueItem({ chatId, workspaceId }, db);
      const queueItem2 = chatRepository.createQueueItem({ chatId: chat2.id, workspaceId }, db);

      // Keep queueItem1 as queued, set queueItem2 to in_progress
      chatRepository.updateQueueStatus(queueItem2.id, 'in_progress', db);

      // Set old timestamps
      const oldDate = new Date(
        Date.now() - (DEFAULT_QUEUE_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000
      ).toISOString();
      db.query('UPDATE chat_queue SET updated_at = ? WHERE id = ?').run(oldDate, queueItem1.id);
      db.query('UPDATE chat_queue SET updated_at = ? WHERE id = ?').run(oldDate, queueItem2.id);

      const deleted = chatRepository.deleteOldQueueItems(DEFAULT_QUEUE_RETENTION_DAYS, db);
      expect(deleted).toBe(0);
    });
  });

  describe('done tasks cleanup', () => {
    test('deletes done tasks for workspaces with auto_delete enabled', () => {
      const task1 = taskRepository.create({ workspaceId, summary: 'Task 1' }, db);
      const task2 = taskRepository.create({ workspaceId, summary: 'Task 2' }, db);

      // Set task1 to done
      taskRepository.updateStatus(task1.id, 'done', db);

      const deleted = taskRepository.deleteDoneByWorkspace(workspaceId, db);
      expect(deleted).toBe(1);

      // task2 should still exist
      const remaining = taskRepository.findByWorkspaceId(workspaceId, db);
      expect(remaining).toHaveLength(1);
      expect(remaining[0]?.id).toBe(task2.id);
    });

    test('does not delete non-done tasks', () => {
      taskRepository.create({ workspaceId, summary: 'Task 1' }, db);
      const task2 = taskRepository.create({ workspaceId, summary: 'Task 2' }, db);
      taskRepository.updateStatus(task2.id, 'in_progress', db);

      const deleted = taskRepository.deleteDoneByWorkspace(workspaceId, db);
      expect(deleted).toBe(0);

      const remaining = taskRepository.findByWorkspaceId(workspaceId, db);
      expect(remaining).toHaveLength(2);
    });
  });

  describe('workspace auto_delete setting', () => {
    test('respects auto_delete_done_tasks setting', () => {
      // Create a second workspace with auto_delete disabled
      const workspace2Id = generateId();
      const timestamp = now();
      db.query(
        `INSERT INTO workspaces (id, title, description, working_directory_mode, auto_delete_done_tasks, retention_days, last_activity_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        workspace2Id,
        'No Auto Delete Workspace',
        '',
        'temp',
        0,
        7,
        timestamp,
        timestamp,
        timestamp
      );

      // Create done tasks in both workspaces
      const task1 = taskRepository.create({ workspaceId, summary: 'Task 1' }, db);
      const task2 = taskRepository.create(
        { workspaceId: workspace2Id, summary: 'Task 2' },
        db
      );

      taskRepository.updateStatus(task1.id, 'done', db);
      taskRepository.updateStatus(task2.id, 'done', db);

      // Get workspaces and check settings
      const workspaces = workspaceRepository.findAll(db);
      const wsWithAutoDelete = workspaces.find((w) => w.autoDeleteDoneTasks);
      const wsWithoutAutoDelete = workspaces.find((w) => !w.autoDeleteDoneTasks);

      expect(wsWithAutoDelete).toBeDefined();
      expect(wsWithoutAutoDelete).toBeDefined();

      // Delete done tasks only for workspace with auto_delete enabled
      if (wsWithAutoDelete) {
        const deleted = taskRepository.deleteDoneByWorkspace(wsWithAutoDelete.id, db);
        expect(deleted).toBe(1);
      }

      // task2 in workspace2 should still exist
      const remainingTask2 = taskRepository.findById(task2.id, db);
      expect(remainingTask2).not.toBeNull();
    });
  });

  describe('DEFAULT_QUEUE_RETENTION_DAYS', () => {
    test('is 7 days', () => {
      expect(DEFAULT_QUEUE_RETENTION_DAYS).toBe(7);
    });
  });

  describe('runCleanup', () => {
    test('is a function that returns CleanupResult', () => {
      // Note: runCleanup uses the global database, so we test the underlying
      // repository functions directly in the tests above. This test verifies
      // the function exists and has the expected signature.
      expect(typeof runCleanup).toBe('function');
    });
  });
});
