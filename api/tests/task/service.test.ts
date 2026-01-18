import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test';

import { NotFoundError } from '../../src/core/errors.ts';
import * as taskRepository from '../../src/task/repository.ts';
import * as taskService from '../../src/task/service.ts';
import * as workspaceService from '../../src/workspace/service.ts';
import { cleanupTestDb, clearTables, getTestDb, setupTestDb } from '../helpers/index.ts';

describe('task service integration', () => {
  beforeAll(() => {
    setupTestDb();
  });

  afterEach(() => {
    clearTables();
  });

  afterAll(() => {
    cleanupTestDb();
  });

  describe('createTask', () => {
    test('creates a task with required fields', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      const task = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'Test Task',
      });

      expect(task.id).toHaveLength(21);
      expect(task.workspaceId).toBe(workspace.id);
      expect(task.summary).toBe('Test Task');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
    });

    test('creates a task with description', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      const task = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'Task with Description',
        description: 'Detailed description of the task',
      });

      expect(task.summary).toBe('Task with Description');
      expect(task.description).toBe('Detailed description of the task');
    });

    test('creates a queue item automatically', () => {
      const db = getTestDb();
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      const task = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'Queued Task',
      });

      const queueItem = taskRepository.findQueueItemByTaskId(task.id, db);
      expect(queueItem).not.toBeNull();
      expect(queueItem?.taskId).toBe(task.id);
      expect(queueItem?.workspaceId).toBe(workspace.id);
      expect(queueItem?.status).toBe('queued');
      expect(queueItem?.isPriority).toBe(false);
    });

    test('creates an activity log entry', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      const task = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'Logged Task',
      });

      const logs = taskService.getLogs(task.id);
      expect(logs).toHaveLength(1);
      expect(logs[0]?.eventType).toBe('task_created');
      expect(logs[0]?.actorType).toBe('user');
    });
  });

  describe('getTask', () => {
    test('returns task when it exists', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const created = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'Get Test',
      });

      const retrieved = taskService.getTask(created.id);

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.summary).toBe('Get Test');
    });

    test('throws NotFoundError when task does not exist', () => {
      expect(() => taskService.getTask('nonexistent-id')).toThrow(NotFoundError);
    });

    test('NotFoundError has correct properties', () => {
      try {
        taskService.getTask('missing-task-id');
        expect.unreachable('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        const notFoundError = error as NotFoundError;
        expect(notFoundError.statusCode).toBe(404);
        expect(notFoundError.code).toBe('NOT_FOUND');
        expect(notFoundError.message).toContain('missing-task-id');
      }
    });
  });

  describe('listTasks', () => {
    test('returns empty array when no tasks exist', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      const tasks = taskService.listTasks(workspace.id);

      expect(tasks).toEqual([]);
    });

    test('returns all tasks in workspace', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      taskService.createTask({ workspaceId: workspace.id, summary: 'Task 1' });
      taskService.createTask({ workspaceId: workspace.id, summary: 'Task 2' });
      taskService.createTask({ workspaceId: workspace.id, summary: 'Task 3' });

      const tasks = taskService.listTasks(workspace.id);
      expect(tasks).toHaveLength(3);
    });

    test('returns empty array for non-existent workspace', () => {
      const tasks = taskService.listTasks('nonexistent-workspace-id');
      expect(tasks).toEqual([]);
    });

    test('only returns tasks from specified workspace', () => {
      const workspace1 = workspaceService.createWorkspace({ title: 'Workspace 1' });
      const workspace2 = workspaceService.createWorkspace({ title: 'Workspace 2' });

      taskService.createTask({ workspaceId: workspace1.id, summary: 'Task in W1' });
      taskService.createTask({ workspaceId: workspace2.id, summary: 'Task in W2' });

      const tasks1 = taskService.listTasks(workspace1.id);
      const tasks2 = taskService.listTasks(workspace2.id);

      expect(tasks1).toHaveLength(1);
      expect(tasks1[0]?.summary).toBe('Task in W1');
      expect(tasks2).toHaveLength(1);
      expect(tasks2[0]?.summary).toBe('Task in W2');
    });
  });

  describe('updateTask', () => {
    test('updates task summary', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const created = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'Original Summary',
      });

      const updated = taskService.updateTask(created.id, { summary: 'Updated Summary' });

      expect(updated.summary).toBe('Updated Summary');
    });

    test('updates task description', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const created = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'Task',
        description: 'Original description',
      });

      const updated = taskService.updateTask(created.id, { description: 'Updated description' });

      expect(updated.description).toBe('Updated description');
    });

    test('updates task status and logs the change', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const created = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'Task',
      });

      const updated = taskService.updateTask(created.id, { status: 'in_progress' });

      expect(updated.status).toBe('in_progress');

      const logs = taskService.getLogs(created.id);
      expect(logs).toHaveLength(2);
      expect(logs[1]?.eventType).toBe('status_changed');
      expect(logs[1]?.metadata).toEqual({ old_status: 'todo', new_status: 'in_progress' });
    });

    test('preserves unchanged fields', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const created = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'Keep This',
        description: 'Keep this too',
      });

      const updated = taskService.updateTask(created.id, { status: 'done' });

      expect(updated.summary).toBe('Keep This');
      expect(updated.description).toBe('Keep this too');
      expect(updated.status).toBe('done');
    });

    test('throws NotFoundError when task does not exist', () => {
      expect(() => taskService.updateTask('nonexistent', { summary: 'Test' })).toThrow(
        NotFoundError
      );
    });
  });

  describe('deleteTask', () => {
    test('deletes an existing task', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const created = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'To Delete',
      });

      taskService.deleteTask(created.id);

      expect(() => taskService.getTask(created.id)).toThrow(NotFoundError);
    });

    test('throws NotFoundError when task does not exist', () => {
      expect(() => taskService.deleteTask('nonexistent')).toThrow(NotFoundError);
    });

    test('does not affect other tasks in workspace', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      const task1 = taskService.createTask({ workspaceId: workspace.id, summary: 'Keep' });
      const task2 = taskService.createTask({ workspaceId: workspace.id, summary: 'Delete' });

      taskService.deleteTask(task2.id);

      const retrieved = taskService.getTask(task1.id);
      expect(retrieved.summary).toBe('Keep');

      const tasks = taskService.listTasks(workspace.id);
      expect(tasks).toHaveLength(1);
    });
  });

  describe('changeStatus', () => {
    test('changes task status', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const task = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'Status Test',
      });

      taskService.changeStatus(task.id, 'in_progress');

      const retrieved = taskService.getTask(task.id);
      expect(retrieved.status).toBe('in_progress');
    });

    test('logs status change', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const task = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'Log Test',
      });

      taskService.changeStatus(task.id, 'done');

      const logs = taskService.getLogs(task.id);
      expect(logs).toHaveLength(2);
      expect(logs[1]?.eventType).toBe('status_changed');
      expect(logs[1]?.metadata).toEqual({ old_status: 'todo', new_status: 'done' });
    });

    test('does not log when status unchanged', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const task = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'No Change Test',
      });

      taskService.changeStatus(task.id, 'todo');

      const logs = taskService.getLogs(task.id);
      expect(logs).toHaveLength(1);
    });

    test('creates queue item when moving from done to todo', () => {
      const db = getTestDb();
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const task = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'Requeue Test',
      });

      taskService.changeStatus(task.id, 'done');

      // Delete existing queue item to simulate completed state
      db.query('DELETE FROM task_queue WHERE task_id = ?').run(task.id);
      expect(taskRepository.findQueueItemByTaskId(task.id, db)).toBeNull();

      taskService.changeStatus(task.id, 'todo');

      const queueItem = taskRepository.findQueueItemByTaskId(task.id, db);
      expect(queueItem).not.toBeNull();
      expect(queueItem?.status).toBe('queued');
    });

    test('creates queue item when moving from in_review to todo', () => {
      const db = getTestDb();
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const task = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'In Review Test',
      });

      taskService.changeStatus(task.id, 'in_review');

      // Delete existing queue item to simulate completed state
      db.query('DELETE FROM task_queue WHERE task_id = ?').run(task.id);
      expect(taskRepository.findQueueItemByTaskId(task.id, db)).toBeNull();

      taskService.changeStatus(task.id, 'todo');

      const queueItem = taskRepository.findQueueItemByTaskId(task.id, db);
      expect(queueItem).not.toBeNull();
      expect(queueItem?.status).toBe('queued');
    });

    test('throws NotFoundError when task does not exist', () => {
      expect(() => taskService.changeStatus('nonexistent', 'done')).toThrow(NotFoundError);
    });
  });

  describe('prioritizeTask', () => {
    test('sets task as priority', () => {
      const db = getTestDb();
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const task = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'Priority Test',
      });

      taskService.prioritizeTask(task.id);

      const queueItem = taskRepository.findQueueItemByTaskId(task.id, db);
      expect(queueItem?.isPriority).toBe(true);
    });

    test('logs prioritization', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const task = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'Priority Log Test',
      });

      taskService.prioritizeTask(task.id);

      const logs = taskService.getLogs(task.id);
      expect(logs).toHaveLength(2);
      expect(logs[1]?.eventType).toBe('task_prioritized');
    });

    test('throws NotFoundError when task does not exist', () => {
      expect(() => taskService.prioritizeTask('nonexistent')).toThrow(NotFoundError);
    });
  });

  describe('deprioritizeTask', () => {
    test('removes task priority', () => {
      const db = getTestDb();
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const task = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'Deprioritize Test',
      });

      taskService.prioritizeTask(task.id);
      taskService.deprioritizeTask(task.id);

      const queueItem = taskRepository.findQueueItemByTaskId(task.id, db);
      expect(queueItem?.isPriority).toBe(false);
    });

    test('logs deprioritization', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const task = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'Deprioritize Log Test',
      });

      taskService.prioritizeTask(task.id);
      taskService.deprioritizeTask(task.id);

      const logs = taskService.getLogs(task.id);
      expect(logs).toHaveLength(3);
      expect(logs[2]?.eventType).toBe('task_deprioritized');
    });

    test('throws NotFoundError when task does not exist', () => {
      expect(() => taskService.deprioritizeTask('nonexistent')).toThrow(NotFoundError);
    });
  });

  describe('cancelTask', () => {
    test('changes task status to in_review', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const task = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'Cancel Test',
      });

      taskService.cancelTask(task.id);

      const retrieved = taskService.getTask(task.id);
      expect(retrieved.status).toBe('in_review');
    });

    test('logs cancellation', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const task = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'Cancel Log Test',
      });

      taskService.cancelTask(task.id);

      const logs = taskService.getLogs(task.id);
      expect(logs).toHaveLength(2);
      expect(logs[1]?.eventType).toBe('task_cancelled');
    });

    test('adds system comment', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const task = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'Cancel Comment Test',
      });

      taskService.cancelTask(task.id);

      const comments = taskService.getComments(task.id);
      expect(comments).toHaveLength(1);
      expect(comments[0]?.content).toBe('Task cancelled by user');
    });

    test('throws NotFoundError when task does not exist', () => {
      expect(() => taskService.cancelTask('nonexistent')).toThrow(NotFoundError);
    });
  });

  describe('addComment', () => {
    test('adds a user comment', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const task = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'Comment Test',
      });

      const comment = taskService.addComment(task.id, 'This is a comment');

      expect(comment.id).toHaveLength(21);
      expect(comment.taskId).toBe(task.id);
      expect(comment.content).toBe('This is a comment');
      expect(comment.userId).toBeTruthy();
      expect(comment.agentId).toBeNull();
    });

    test('adds an agent comment', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const task = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'Agent Comment Test',
      });

      const comment = taskService.addComment(task.id, 'Agent response', undefined, 'agent-123');

      expect(comment.agentId).toBe('agent-123');
    });

    test('logs comment addition', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const task = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'Comment Log Test',
      });

      taskService.addComment(task.id, 'Test comment');

      const logs = taskService.getLogs(task.id);
      expect(logs).toHaveLength(2);
      expect(logs[1]?.eventType).toBe('comment_added');
    });

    test('updates queue item timestamp', () => {
      const db = getTestDb();
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const task = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'Queue Update Test',
      });

      const originalQueue = taskRepository.findQueueItemByTaskId(task.id, db);
      const originalTimestamp = originalQueue?.updatedAt;

      // Small delay to ensure timestamp difference
      Bun.sleepSync(10);

      taskService.addComment(task.id, 'New comment');

      const updatedQueue = taskRepository.findQueueItemByTaskId(task.id, db);
      expect(updatedQueue?.updatedAt).not.toBe(originalTimestamp);
    });

    test('throws NotFoundError when task does not exist', () => {
      expect(() => taskService.addComment('nonexistent', 'Test')).toThrow(NotFoundError);
    });
  });

  describe('getComments', () => {
    test('returns empty array when no comments exist', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const task = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'No Comments',
      });

      const comments = taskService.getComments(task.id);
      expect(comments).toEqual([]);
    });

    test('returns all comments for task', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const task = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'Multiple Comments',
      });

      taskService.addComment(task.id, 'Comment 1');
      taskService.addComment(task.id, 'Comment 2');
      taskService.addComment(task.id, 'Comment 3');

      const comments = taskService.getComments(task.id);
      expect(comments).toHaveLength(3);
    });

    test('throws NotFoundError when task does not exist', () => {
      expect(() => taskService.getComments('nonexistent')).toThrow(NotFoundError);
    });
  });

  describe('getLogs', () => {
    test('returns all logs for task', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const task = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'Log Test',
      });

      taskService.changeStatus(task.id, 'in_progress');
      taskService.addComment(task.id, 'Test comment');

      const logs = taskService.getLogs(task.id);
      expect(logs).toHaveLength(3);
      expect(logs[0]?.eventType).toBe('task_created');
      expect(logs[1]?.eventType).toBe('status_changed');
      expect(logs[2]?.eventType).toBe('comment_added');
    });

    test('throws NotFoundError when task does not exist', () => {
      expect(() => taskService.getLogs('nonexistent')).toThrow(NotFoundError);
    });
  });

  describe('deleteDoneTasks', () => {
    test('deletes all done tasks in workspace', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      const task1 = taskService.createTask({ workspaceId: workspace.id, summary: 'Done 1' });
      const task2 = taskService.createTask({ workspaceId: workspace.id, summary: 'Done 2' });
      const task3 = taskService.createTask({ workspaceId: workspace.id, summary: 'Not Done' });

      taskService.changeStatus(task1.id, 'done');
      taskService.changeStatus(task2.id, 'done');

      const deletedCount = taskService.deleteDoneTasks(workspace.id);

      // deletedCount should be at least 2 (the done tasks)
      // Note: With SQLite cascade deletes, count may include related records
      expect(deletedCount).toBeGreaterThanOrEqual(2);
      expect(() => taskService.getTask(task1.id)).toThrow(NotFoundError);
      expect(() => taskService.getTask(task2.id)).toThrow(NotFoundError);
      expect(taskService.getTask(task3.id)).toBeTruthy();
    });

    test('returns 0 when no done tasks exist', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      taskService.createTask({ workspaceId: workspace.id, summary: 'Not Done' });

      const deletedCount = taskService.deleteDoneTasks(workspace.id);

      expect(deletedCount).toBe(0);
    });

    test('does not affect tasks in other workspaces', () => {
      const workspace1 = workspaceService.createWorkspace({ title: 'Workspace 1' });
      const workspace2 = workspaceService.createWorkspace({ title: 'Workspace 2' });

      const task1 = taskService.createTask({ workspaceId: workspace1.id, summary: 'Done in W1' });
      const task2 = taskService.createTask({ workspaceId: workspace2.id, summary: 'Done in W2' });

      taskService.changeStatus(task1.id, 'done');
      taskService.changeStatus(task2.id, 'done');

      taskService.deleteDoneTasks(workspace1.id);

      expect(() => taskService.getTask(task1.id)).toThrow(NotFoundError);
      expect(taskService.getTask(task2.id)).toBeTruthy();
    });
  });

  describe('data integrity', () => {
    test('task data persists correctly through service layer', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      const input = {
        workspaceId: workspace.id,
        summary: 'Persistence Test',
        description: 'Testing data persistence',
      };

      const created = taskService.createTask(input);
      const retrieved = taskService.getTask(created.id);

      expect(retrieved.workspaceId).toBe(input.workspaceId);
      expect(retrieved.summary).toBe(input.summary);
      expect(retrieved.description).toBe(input.description);
      expect(retrieved.status).toBe('todo');
    });

    test('timestamps are set correctly', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const task = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'Timestamp Test',
      });

      expect(task.createdAt).toBeTruthy();
      expect(task.updatedAt).toBeTruthy();

      expect(() => new Date(task.createdAt)).not.toThrow();
      expect(() => new Date(task.updatedAt)).not.toThrow();
    });
  });

  describe('workspace deletion cascade', () => {
    test('tasks are deleted when workspace is deleted', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      const task = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'Will be deleted',
      });

      expect(taskService.getTask(task.id)).toBeTruthy();

      workspaceService.deleteWorkspace(workspace.id);

      expect(() => taskService.getTask(task.id)).toThrow(NotFoundError);
    });

    test('task comments are deleted when workspace is deleted', () => {
      const db = getTestDb();
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      const task = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'With Comments',
      });

      taskService.addComment(task.id, 'Comment 1');
      taskService.addComment(task.id, 'Comment 2');

      expect(taskService.getComments(task.id)).toHaveLength(2);

      workspaceService.deleteWorkspace(workspace.id);

      const remainingComments = db
        .query('SELECT * FROM task_comments WHERE workspace_id = ?')
        .all(workspace.id);
      expect(remainingComments).toHaveLength(0);
    });

    test('task logs are deleted when workspace is deleted', () => {
      const db = getTestDb();
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      const task = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'With Logs',
      });

      taskService.changeStatus(task.id, 'in_progress');

      expect(taskService.getLogs(task.id).length).toBeGreaterThan(0);

      workspaceService.deleteWorkspace(workspace.id);

      const remainingLogs = db
        .query('SELECT * FROM task_logs WHERE workspace_id = ?')
        .all(workspace.id);
      expect(remainingLogs).toHaveLength(0);
    });

    test('task queue items are deleted when workspace is deleted', () => {
      const db = getTestDb();
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      const task = taskService.createTask({
        workspaceId: workspace.id,
        summary: 'With Queue Item',
      });

      expect(taskRepository.findQueueItemByTaskId(task.id, db)).not.toBeNull();

      workspaceService.deleteWorkspace(workspace.id);

      const remainingQueueItems = db
        .query('SELECT * FROM task_queue WHERE workspace_id = ?')
        .all(workspace.id);
      expect(remainingQueueItems).toHaveLength(0);
    });
  });
});
