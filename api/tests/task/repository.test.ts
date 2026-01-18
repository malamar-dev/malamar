import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test';

import * as taskRepository from '../../src/task/repository.ts';
import * as workspaceRepository from '../../src/workspace/repository.ts';
import { cleanupTestDb, clearTables, getTestDb, setupTestDb } from '../helpers/index.ts';

describe('task repository integration', () => {
  beforeAll(() => {
    setupTestDb();
  });

  afterEach(() => {
    clearTables();
  });

  afterAll(() => {
    cleanupTestDb();
  });

  describe('task CRUD operations', () => {
    test('creates a task with all fields', () => {
      const db = getTestDb();
      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);

      const task = taskRepository.create(
        {
          workspaceId: workspace.id,
          summary: 'Test Task',
          description: 'Task description',
        },
        db
      );

      expect(task.id).toHaveLength(21);
      expect(task.workspaceId).toBe(workspace.id);
      expect(task.summary).toBe('Test Task');
      expect(task.description).toBe('Task description');
      expect(task.status).toBe('todo');
    });

    test('findById returns task when exists', () => {
      const db = getTestDb();
      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);
      const created = taskRepository.create(
        { workspaceId: workspace.id, summary: 'Find Test' },
        db
      );

      const found = taskRepository.findById(created.id, db);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });

    test('findById returns null when not exists', () => {
      const db = getTestDb();
      const found = taskRepository.findById('nonexistent', db);
      expect(found).toBeNull();
    });

    test('findByWorkspaceId returns all tasks for workspace', () => {
      const db = getTestDb();
      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);

      taskRepository.create({ workspaceId: workspace.id, summary: 'Task 1' }, db);
      taskRepository.create({ workspaceId: workspace.id, summary: 'Task 2' }, db);
      taskRepository.create({ workspaceId: workspace.id, summary: 'Task 3' }, db);

      const tasks = taskRepository.findByWorkspaceId(workspace.id, db);

      expect(tasks).toHaveLength(3);
      // Verify all tasks are returned (order may vary with same timestamps)
      const summaries = tasks.map((t) => t.summary);
      expect(summaries).toContain('Task 1');
      expect(summaries).toContain('Task 2');
      expect(summaries).toContain('Task 3');
    });

    test('update modifies task fields', () => {
      const db = getTestDb();
      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);
      const created = taskRepository.create(
        { workspaceId: workspace.id, summary: 'Original' },
        db
      );

      const updated = taskRepository.update(
        created.id,
        { summary: 'Updated', description: 'New description' },
        db
      );

      expect(updated?.summary).toBe('Updated');
      expect(updated?.description).toBe('New description');
    });

    test('update returns null when task not exists', () => {
      const db = getTestDb();
      const updated = taskRepository.update('nonexistent', { summary: 'Test' }, db);
      expect(updated).toBeNull();
    });

    test('remove deletes task and returns true', () => {
      const db = getTestDb();
      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);
      const task = taskRepository.create({ workspaceId: workspace.id, summary: 'Delete Me' }, db);

      const removed = taskRepository.remove(task.id, db);

      expect(removed).toBe(true);
      expect(taskRepository.findById(task.id, db)).toBeNull();
    });

    test('remove returns false when task not exists', () => {
      const db = getTestDb();
      const removed = taskRepository.remove('nonexistent', db);
      expect(removed).toBe(false);
    });

    test('updateStatus changes task status', () => {
      const db = getTestDb();
      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);
      const task = taskRepository.create({ workspaceId: workspace.id, summary: 'Status Test' }, db);

      taskRepository.updateStatus(task.id, 'in_progress', db);

      const updated = taskRepository.findById(task.id, db);
      expect(updated?.status).toBe('in_progress');
    });

    test('deleteDoneByWorkspace removes only done tasks', () => {
      const db = getTestDb();
      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);

      const task1 = taskRepository.create({ workspaceId: workspace.id, summary: 'Done 1' }, db);
      const task2 = taskRepository.create({ workspaceId: workspace.id, summary: 'Done 2' }, db);
      taskRepository.create({ workspaceId: workspace.id, summary: 'Not Done' }, db);

      taskRepository.updateStatus(task1.id, 'done', db);
      taskRepository.updateStatus(task2.id, 'done', db);

      const deletedCount = taskRepository.deleteDoneByWorkspace(workspace.id, db);

      expect(deletedCount).toBe(2);
      expect(taskRepository.findByWorkspaceId(workspace.id, db)).toHaveLength(1);
    });
  });

  describe('task comment operations', () => {
    test('createComment creates comment with all fields', () => {
      const db = getTestDb();
      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);
      const task = taskRepository.create({ workspaceId: workspace.id, summary: 'Task' }, db);

      const comment = taskRepository.createComment(
        {
          taskId: task.id,
          workspaceId: workspace.id,
          userId: 'user-123',
          content: 'Test comment',
        },
        db
      );

      expect(comment.id).toHaveLength(21);
      expect(comment.taskId).toBe(task.id);
      expect(comment.workspaceId).toBe(workspace.id);
      expect(comment.userId).toBe('user-123');
      expect(comment.agentId).toBeNull();
      expect(comment.content).toBe('Test comment');
    });

    test('createComment creates agent comment', () => {
      const db = getTestDb();
      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);
      const task = taskRepository.create({ workspaceId: workspace.id, summary: 'Task' }, db);

      const comment = taskRepository.createComment(
        {
          taskId: task.id,
          workspaceId: workspace.id,
          agentId: 'agent-123',
          content: 'Agent comment',
        },
        db
      );

      expect(comment.agentId).toBe('agent-123');
      expect(comment.userId).toBeNull();
    });

    test('findCommentsByTaskId returns comments ordered by created_at ASC', () => {
      const db = getTestDb();
      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);
      const task = taskRepository.create({ workspaceId: workspace.id, summary: 'Task' }, db);

      taskRepository.createComment(
        { taskId: task.id, workspaceId: workspace.id, content: 'First' },
        db
      );
      taskRepository.createComment(
        { taskId: task.id, workspaceId: workspace.id, content: 'Second' },
        db
      );
      taskRepository.createComment(
        { taskId: task.id, workspaceId: workspace.id, content: 'Third' },
        db
      );

      const comments = taskRepository.findCommentsByTaskId(task.id, db);

      expect(comments).toHaveLength(3);
      expect(comments[0]?.content).toBe('First');
      expect(comments[2]?.content).toBe('Third');
    });
  });

  describe('task log operations', () => {
    test('createLog creates log with all fields', () => {
      const db = getTestDb();
      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);
      const task = taskRepository.create({ workspaceId: workspace.id, summary: 'Task' }, db);

      const log = taskRepository.createLog(
        {
          taskId: task.id,
          workspaceId: workspace.id,
          eventType: 'task_created',
          actorType: 'user',
          actorId: 'user-123',
        },
        db
      );

      expect(log.id).toHaveLength(21);
      expect(log.taskId).toBe(task.id);
      expect(log.eventType).toBe('task_created');
      expect(log.actorType).toBe('user');
      expect(log.actorId).toBe('user-123');
      expect(log.metadata).toBeNull();
    });

    test('createLog stores metadata as JSON', () => {
      const db = getTestDb();
      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);
      const task = taskRepository.create({ workspaceId: workspace.id, summary: 'Task' }, db);

      const log = taskRepository.createLog(
        {
          taskId: task.id,
          workspaceId: workspace.id,
          eventType: 'status_changed',
          actorType: 'user',
          metadata: { old_status: 'todo', new_status: 'in_progress' },
        },
        db
      );

      expect(log.metadata).toEqual({ old_status: 'todo', new_status: 'in_progress' });
    });

    test('findLogsByTaskId returns logs ordered by created_at ASC', () => {
      const db = getTestDb();
      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);
      const task = taskRepository.create({ workspaceId: workspace.id, summary: 'Task' }, db);

      taskRepository.createLog(
        { taskId: task.id, workspaceId: workspace.id, eventType: 'task_created', actorType: 'user' },
        db
      );
      taskRepository.createLog(
        {
          taskId: task.id,
          workspaceId: workspace.id,
          eventType: 'status_changed',
          actorType: 'user',
        },
        db
      );
      taskRepository.createLog(
        { taskId: task.id, workspaceId: workspace.id, eventType: 'comment_added', actorType: 'user' },
        db
      );

      const logs = taskRepository.findLogsByTaskId(task.id, db);

      expect(logs).toHaveLength(3);
      expect(logs[0]?.eventType).toBe('task_created');
      expect(logs[2]?.eventType).toBe('comment_added');
    });
  });

  describe('task queue operations', () => {
    test('createQueueItem creates queued item', () => {
      const db = getTestDb();
      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);
      const task = taskRepository.create({ workspaceId: workspace.id, summary: 'Task' }, db);

      const queueItem = taskRepository.createQueueItem(
        { taskId: task.id, workspaceId: workspace.id },
        db
      );

      expect(queueItem.id).toHaveLength(21);
      expect(queueItem.taskId).toBe(task.id);
      expect(queueItem.workspaceId).toBe(workspace.id);
      expect(queueItem.status).toBe('queued');
      expect(queueItem.isPriority).toBe(false);
    });

    test('createQueueItem with priority flag', () => {
      const db = getTestDb();
      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);
      const task = taskRepository.create({ workspaceId: workspace.id, summary: 'Task' }, db);

      const queueItem = taskRepository.createQueueItem(
        { taskId: task.id, workspaceId: workspace.id, isPriority: true },
        db
      );

      expect(queueItem.isPriority).toBe(true);
    });

    test('findQueueItemByTaskId returns queued item', () => {
      const db = getTestDb();
      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);
      const task = taskRepository.create({ workspaceId: workspace.id, summary: 'Task' }, db);
      taskRepository.createQueueItem({ taskId: task.id, workspaceId: workspace.id }, db);

      const found = taskRepository.findQueueItemByTaskId(task.id, db);

      expect(found).not.toBeNull();
      expect(found?.taskId).toBe(task.id);
    });

    test('findQueueItemByTaskId returns null for non-queued status', () => {
      const db = getTestDb();
      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);
      const task = taskRepository.create({ workspaceId: workspace.id, summary: 'Task' }, db);
      const queueItem = taskRepository.createQueueItem(
        { taskId: task.id, workspaceId: workspace.id },
        db
      );

      taskRepository.updateQueueStatus(queueItem.id, 'completed', db);

      const found = taskRepository.findQueueItemByTaskId(task.id, db);
      expect(found).toBeNull();
    });

    test('findQueuedByWorkspace returns priority items first', () => {
      const db = getTestDb();
      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);

      const task1 = taskRepository.create({ workspaceId: workspace.id, summary: 'Normal' }, db);
      const task2 = taskRepository.create({ workspaceId: workspace.id, summary: 'Priority' }, db);
      const task3 = taskRepository.create({ workspaceId: workspace.id, summary: 'Normal 2' }, db);

      taskRepository.createQueueItem({ taskId: task1.id, workspaceId: workspace.id }, db);
      taskRepository.createQueueItem(
        { taskId: task2.id, workspaceId: workspace.id, isPriority: true },
        db
      );
      taskRepository.createQueueItem({ taskId: task3.id, workspaceId: workspace.id }, db);

      const queued = taskRepository.findQueuedByWorkspace(workspace.id, db);

      expect(queued).toHaveLength(3);
      expect(queued[0]?.taskId).toBe(task2.id);
    });

    test('setQueuePriority updates priority flag', () => {
      const db = getTestDb();
      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);
      const task = taskRepository.create({ workspaceId: workspace.id, summary: 'Task' }, db);
      taskRepository.createQueueItem({ taskId: task.id, workspaceId: workspace.id }, db);

      taskRepository.setQueuePriority(task.id, true, db);

      const queueItem = taskRepository.findQueueItemByTaskId(task.id, db);
      expect(queueItem?.isPriority).toBe(true);
    });

    test('updateQueueStatus changes status', () => {
      const db = getTestDb();
      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);
      const task = taskRepository.create({ workspaceId: workspace.id, summary: 'Task' }, db);
      const queueItem = taskRepository.createQueueItem(
        { taskId: task.id, workspaceId: workspace.id },
        db
      );

      taskRepository.updateQueueStatus(queueItem.id, 'in_progress', db);

      // Find by direct query since findQueueItemByTaskId only finds queued items
      const updated = db
        .query<{ status: string }, [string]>('SELECT status FROM task_queue WHERE id = ?')
        .get(queueItem.id);
      expect(updated?.status).toBe('in_progress');
    });

    test('updateQueueItemTimestamp updates timestamp', () => {
      const db = getTestDb();
      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);
      const task = taskRepository.create({ workspaceId: workspace.id, summary: 'Task' }, db);
      taskRepository.createQueueItem({ taskId: task.id, workspaceId: workspace.id }, db);

      const original = taskRepository.findQueueItemByTaskId(task.id, db);
      const originalTimestamp = original?.updatedAt;

      Bun.sleepSync(10);
      taskRepository.updateQueueItemTimestamp(task.id, db);

      const updated = taskRepository.findQueueItemByTaskId(task.id, db);
      expect(updated?.updatedAt).not.toBe(originalTimestamp);
    });

    test('deleteOldQueueItems removes old completed/failed items', () => {
      const db = getTestDb();
      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);

      const task1 = taskRepository.create({ workspaceId: workspace.id, summary: 'Task 1' }, db);
      const task2 = taskRepository.create({ workspaceId: workspace.id, summary: 'Task 2' }, db);

      const qi1 = taskRepository.createQueueItem(
        { taskId: task1.id, workspaceId: workspace.id },
        db
      );
      const qi2 = taskRepository.createQueueItem(
        { taskId: task2.id, workspaceId: workspace.id },
        db
      );

      taskRepository.updateQueueStatus(qi1.id, 'completed', db);
      taskRepository.updateQueueStatus(qi2.id, 'failed', db);

      // Update timestamps to be old
      const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      db.query('UPDATE task_queue SET updated_at = ? WHERE id IN (?, ?)').run(
        oldDate,
        qi1.id,
        qi2.id
      );

      const deleted = taskRepository.deleteOldQueueItems(7, db);

      expect(deleted).toBe(2);
    });
  });

  describe('cascade behavior', () => {
    test('task deletion cascades to comments', () => {
      const db = getTestDb();
      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);
      const task = taskRepository.create({ workspaceId: workspace.id, summary: 'Task' }, db);

      taskRepository.createComment(
        { taskId: task.id, workspaceId: workspace.id, content: 'Comment' },
        db
      );

      taskRepository.remove(task.id, db);

      const comments = taskRepository.findCommentsByTaskId(task.id, db);
      expect(comments).toHaveLength(0);
    });

    test('task deletion cascades to logs', () => {
      const db = getTestDb();
      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);
      const task = taskRepository.create({ workspaceId: workspace.id, summary: 'Task' }, db);

      taskRepository.createLog(
        { taskId: task.id, workspaceId: workspace.id, eventType: 'task_created', actorType: 'user' },
        db
      );

      taskRepository.remove(task.id, db);

      const logs = taskRepository.findLogsByTaskId(task.id, db);
      expect(logs).toHaveLength(0);
    });

    test('task deletion cascades to queue items', () => {
      const db = getTestDb();
      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);
      const task = taskRepository.create({ workspaceId: workspace.id, summary: 'Task' }, db);

      taskRepository.createQueueItem({ taskId: task.id, workspaceId: workspace.id }, db);

      taskRepository.remove(task.id, db);

      const queueItem = taskRepository.findQueueItemByTaskId(task.id, db);
      expect(queueItem).toBeNull();
    });

    test('workspace deletion cascades to tasks', () => {
      const db = getTestDb();
      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);

      taskRepository.create({ workspaceId: workspace.id, summary: 'Task 1' }, db);
      taskRepository.create({ workspaceId: workspace.id, summary: 'Task 2' }, db);

      workspaceRepository.remove(workspace.id, db);

      const tasks = taskRepository.findByWorkspaceId(workspace.id, db);
      expect(tasks).toHaveLength(0);
    });
  });
});
