import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test';

import * as agentRepository from '../agent/repository.ts';
import { closeDb, initDb, resetDb, runMigrations } from '../core/database.ts';
import { clearSubscribers, subscribe } from '../events/emitter.ts';
import type { SseEventPayloadMap, SseEventType } from '../events/types.ts';
import * as taskRepository from '../task/repository.ts';
import * as workspaceRepository from '../workspace/repository.ts';
import {
  addSystemComment,
  executeTaskActions,
  type TaskActionContext,
  updateTaskStatusWithLog,
} from './action-executor.ts';
import type { TaskAction } from './types.ts';

// Test database setup
let testDbPath: string | null = null;

function setupTestDb() {
  resetDb();
  const testDir = join(tmpdir(), 'malamar-action-executor-test');
  if (!existsSync(testDir)) {
    mkdirSync(testDir, { recursive: true });
  }
  testDbPath = join(testDir, `test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  const db = initDb(testDbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  runMigrations(join(process.cwd(), 'migrations'));
  return db;
}

function cleanupTestDb() {
  closeDb();
  if (testDbPath && existsSync(testDbPath)) {
    rmSync(testDbPath, { force: true });
    const walPath = `${testDbPath}-wal`;
    const shmPath = `${testDbPath}-shm`;
    if (existsSync(walPath)) rmSync(walPath, { force: true });
    if (existsSync(shmPath)) rmSync(shmPath, { force: true });
  }
  testDbPath = null;
  resetDb();
}

function clearTables() {
  const db = initDb(testDbPath!);
  db.exec('DELETE FROM chat_queue');
  db.exec('DELETE FROM chat_messages');
  db.exec('DELETE FROM chats');
  db.exec('DELETE FROM task_queue');
  db.exec('DELETE FROM task_logs');
  db.exec('DELETE FROM task_comments');
  db.exec('DELETE FROM tasks');
  db.exec('DELETE FROM agents');
  db.exec('DELETE FROM workspaces');
}

// Helper to create test data
function createTestWorkspace() {
  return workspaceRepository.create({
    title: 'Test Workspace',
    description: 'A test workspace',
  });
}

function createTestAgent(workspaceId: string, options?: { name?: string; order?: number }) {
  return agentRepository.create({
    workspaceId,
    name: options?.name ?? 'Test Agent',
    instruction: 'You are a test agent.',
    cliType: 'claude',
    order: options?.order,
  });
}

function createTestTask(workspaceId: string, options?: { summary?: string }) {
  return taskRepository.create({
    workspaceId,
    summary: options?.summary ?? 'Test Task',
    description: 'A test task description',
  });
}

function createTestContext(
  workspaceId: string,
  agentOptions?: { name?: string }
): TaskActionContext {
  const workspace = workspaceRepository.findById(workspaceId)!;
  const task = createTestTask(workspaceId);
  const agent = createTestAgent(workspaceId, agentOptions);
  return { task, workspace, agent };
}

// Event collector for testing
interface CollectedEvent {
  type: SseEventType;
  payload: SseEventPayloadMap[SseEventType];
}

function createEventCollector() {
  const events: CollectedEvent[] = [];
  const unsubscribe = subscribe((type, payload) => {
    events.push({ type, payload });
  });
  return {
    events,
    unsubscribe,
    clear: () => {
      events.length = 0;
    },
    getByType: (type: SseEventType) => events.filter((e) => e.type === type),
  };
}

describe('action-executor', () => {
  beforeAll(() => {
    setupTestDb();
  });

  afterAll(() => {
    cleanupTestDb();
  });

  beforeEach(() => {
    clearTables();
    clearSubscribers();
  });

  afterEach(() => {
    clearSubscribers();
  });

  describe('executeTaskActions', () => {
    describe('skip action', () => {
      test('marks result as skipped when only skip actions', () => {
        const workspace = createTestWorkspace();
        const context = createTestContext(workspace.id);
        const actions: TaskAction[] = [{ type: 'skip' }];

        const result = executeTaskActions(context, actions);

        expect(result.skipped).toBe(true);
        expect(result.commentsAdded).toBe(0);
        expect(result.statusChanged).toBe(false);
      });

      test('does not mark as skipped when mixed with other actions', () => {
        const workspace = createTestWorkspace();
        const context = createTestContext(workspace.id);
        const actions: TaskAction[] = [
          { type: 'skip' },
          { type: 'comment', content: 'Test comment' },
        ];

        const result = executeTaskActions(context, actions);

        expect(result.skipped).toBe(false);
        expect(result.commentsAdded).toBe(1);
      });
    });

    describe('comment action', () => {
      test('adds comment to task', () => {
        const workspace = createTestWorkspace();
        const context = createTestContext(workspace.id);
        const actions: TaskAction[] = [{ type: 'comment', content: 'Test comment content' }];

        const result = executeTaskActions(context, actions);

        expect(result.commentsAdded).toBe(1);
        expect(result.skipped).toBe(false);

        // Verify comment was created in database
        const comments = taskRepository.findCommentsByTaskId(context.task.id);
        expect(comments.length).toBe(1);
        expect(comments[0]?.content).toBe('Test comment content');
        expect(comments[0]?.agentId).toBe(context.agent.id);
      });

      test('creates activity log for comment', () => {
        const workspace = createTestWorkspace();
        const context = createTestContext(workspace.id);
        const actions: TaskAction[] = [{ type: 'comment', content: 'Log test comment' }];

        executeTaskActions(context, actions);

        const logs = taskRepository.findLogsByTaskId(context.task.id);
        const commentLogs = logs.filter((l) => l.eventType === 'comment_added');
        expect(commentLogs.length).toBe(1);
        expect(commentLogs[0]?.actorType).toBe('agent');
        expect(commentLogs[0]?.actorId).toBe(context.agent.id);
      });

      test('emits comment added event', () => {
        const workspace = createTestWorkspace();
        const context = createTestContext(workspace.id, { name: 'Comment Agent' });
        const actions: TaskAction[] = [{ type: 'comment', content: 'Event test' }];

        const collector = createEventCollector();
        executeTaskActions(context, actions);
        collector.unsubscribe();

        const commentEvents = collector.getByType('task.comment_added');
        expect(commentEvents.length).toBe(1);
        expect((commentEvents[0]?.payload as { authorName: string }).authorName).toBe(
          'Comment Agent'
        );
      });

      test('handles multiple comments', () => {
        const workspace = createTestWorkspace();
        const context = createTestContext(workspace.id);
        const actions: TaskAction[] = [
          { type: 'comment', content: 'First comment' },
          { type: 'comment', content: 'Second comment' },
          { type: 'comment', content: 'Third comment' },
        ];

        const result = executeTaskActions(context, actions);

        expect(result.commentsAdded).toBe(3);

        const comments = taskRepository.findCommentsByTaskId(context.task.id);
        expect(comments.length).toBe(3);
      });
    });

    describe('change_status action', () => {
      test('changes task status', () => {
        const workspace = createTestWorkspace();
        const context = createTestContext(workspace.id);
        const actions: TaskAction[] = [{ type: 'change_status', status: 'in_review' }];

        const result = executeTaskActions(context, actions);

        expect(result.statusChanged).toBe(true);
        expect(result.newStatus).toBe('in_review');
        expect(result.skipped).toBe(false);

        // Verify task status was updated
        const updatedTask = taskRepository.findById(context.task.id);
        expect(updatedTask?.status).toBe('in_review');
      });

      test('creates activity log for status change', () => {
        const workspace = createTestWorkspace();
        const context = createTestContext(workspace.id);
        const actions: TaskAction[] = [{ type: 'change_status', status: 'done' }];

        executeTaskActions(context, actions);

        const logs = taskRepository.findLogsByTaskId(context.task.id);
        const statusLogs = logs.filter((l) => l.eventType === 'status_changed');
        expect(statusLogs.length).toBe(1);
        expect(statusLogs[0]?.actorType).toBe('agent');
        expect(statusLogs[0]?.metadata?.oldStatus).toBe('todo');
        expect(statusLogs[0]?.metadata?.newStatus).toBe('done');
      });

      test('emits status changed event', () => {
        const workspace = createTestWorkspace();
        const context = createTestContext(workspace.id);
        const actions: TaskAction[] = [{ type: 'change_status', status: 'in_progress' }];

        const collector = createEventCollector();
        executeTaskActions(context, actions);
        collector.unsubscribe();

        const statusEvents = collector.getByType('task.status_changed');
        expect(statusEvents.length).toBe(1);
        expect((statusEvents[0]?.payload as { oldStatus: string }).oldStatus).toBe('todo');
        expect((statusEvents[0]?.payload as { newStatus: string }).newStatus).toBe('in_progress');
      });

      test('does not update if same status', () => {
        const workspace = createTestWorkspace();
        const context = createTestContext(workspace.id);

        // Task starts as 'todo', change to same status
        const actions: TaskAction[] = [{ type: 'change_status', status: 'todo' }];

        const collector = createEventCollector();
        const result = executeTaskActions(context, actions);
        collector.unsubscribe();

        expect(result.statusChanged).toBe(false);
        expect(result.newStatus).toBeNull();

        // No status changed event should be emitted
        const statusEvents = collector.getByType('task.status_changed');
        expect(statusEvents.length).toBe(0);
      });
    });

    describe('workspace activity update', () => {
      test('updates workspace last_activity_at on actions', () => {
        const workspace = createTestWorkspace();
        const originalLastActivity = workspace.lastActivityAt;
        const context = createTestContext(workspace.id);
        const actions: TaskAction[] = [{ type: 'comment', content: 'Activity test' }];

        // Wait a small amount to ensure timestamp differs
        const startTime = Date.now();
        while (Date.now() - startTime < 10) {
          // busy wait
        }

        executeTaskActions(context, actions);

        const updatedWorkspace = workspaceRepository.findById(workspace.id);
        expect(updatedWorkspace?.lastActivityAt).not.toBe(originalLastActivity);
      });

      test('updates workspace last_activity_at even on skip', () => {
        const workspace = createTestWorkspace();
        const context = createTestContext(workspace.id);
        const actions: TaskAction[] = [{ type: 'skip' }];

        // Wait a small amount to ensure timestamp differs
        const startTime = Date.now();
        while (Date.now() - startTime < 10) {
          // busy wait
        }

        executeTaskActions(context, actions);

        // Skip still updates last_activity because we processed an action
        const updatedWorkspace = workspaceRepository.findById(workspace.id);
        expect(updatedWorkspace).not.toBeNull();
      });
    });

    describe('empty actions', () => {
      test('handles empty actions array', () => {
        const workspace = createTestWorkspace();
        const context = createTestContext(workspace.id);
        const actions: TaskAction[] = [];

        const result = executeTaskActions(context, actions);

        expect(result.commentsAdded).toBe(0);
        expect(result.statusChanged).toBe(false);
        expect(result.skipped).toBe(false);
      });
    });

    describe('mixed actions', () => {
      test('handles comment followed by status change', () => {
        const workspace = createTestWorkspace();
        const context = createTestContext(workspace.id);
        const actions: TaskAction[] = [
          { type: 'comment', content: 'Review complete' },
          { type: 'change_status', status: 'done' },
        ];

        const result = executeTaskActions(context, actions);

        expect(result.commentsAdded).toBe(1);
        expect(result.statusChanged).toBe(true);
        expect(result.newStatus).toBe('done');

        const comments = taskRepository.findCommentsByTaskId(context.task.id);
        expect(comments.length).toBe(1);

        const updatedTask = taskRepository.findById(context.task.id);
        expect(updatedTask?.status).toBe('done');
      });
    });
  });

  describe('addSystemComment', () => {
    test('adds system comment to task', () => {
      const workspace = createTestWorkspace();
      const task = createTestTask(workspace.id);

      addSystemComment(task, workspace, 'System error message');

      const comments = taskRepository.findCommentsByTaskId(task.id);
      expect(comments.length).toBe(1);
      expect(comments[0]?.content).toBe('System error message');
      expect(comments[0]?.agentId).toBeNull();
      expect(comments[0]?.userId).toBeNull();
    });

    test('creates activity log for system comment', () => {
      const workspace = createTestWorkspace();
      const task = createTestTask(workspace.id);

      addSystemComment(task, workspace, 'System message');

      const logs = taskRepository.findLogsByTaskId(task.id);
      const commentLogs = logs.filter((l) => l.eventType === 'comment_added');
      expect(commentLogs.length).toBe(1);
      expect(commentLogs[0]?.actorType).toBe('system');
      expect(commentLogs[0]?.actorId).toBeNull();
    });

    test('updates workspace last_activity_at', () => {
      const workspace = createTestWorkspace();
      const task = createTestTask(workspace.id);
      const originalLastActivity = workspace.lastActivityAt;

      // Wait a small amount to ensure timestamp differs
      const startTime = Date.now();
      while (Date.now() - startTime < 10) {
        // busy wait
      }

      addSystemComment(task, workspace, 'System message');

      const updatedWorkspace = workspaceRepository.findById(workspace.id);
      expect(updatedWorkspace?.lastActivityAt).not.toBe(originalLastActivity);
    });
  });

  describe('updateTaskStatusWithLog', () => {
    test('updates task status', () => {
      const workspace = createTestWorkspace();
      const task = createTestTask(workspace.id);
      expect(task.status).toBe('todo');

      updateTaskStatusWithLog(task, workspace, 'in_progress');

      const updatedTask = taskRepository.findById(task.id);
      expect(updatedTask?.status).toBe('in_progress');
    });

    test('creates activity log for status change', () => {
      const workspace = createTestWorkspace();
      const task = createTestTask(workspace.id);

      updateTaskStatusWithLog(task, workspace, 'in_review');

      const logs = taskRepository.findLogsByTaskId(task.id);
      const statusLogs = logs.filter((l) => l.eventType === 'status_changed');
      expect(statusLogs.length).toBe(1);
      expect(statusLogs[0]?.actorType).toBe('system');
      expect(statusLogs[0]?.metadata?.oldStatus).toBe('todo');
      expect(statusLogs[0]?.metadata?.newStatus).toBe('in_review');
    });

    test('emits status changed event', () => {
      const workspace = createTestWorkspace();
      const task = createTestTask(workspace.id);

      const collector = createEventCollector();
      updateTaskStatusWithLog(task, workspace, 'done');
      collector.unsubscribe();

      const statusEvents = collector.getByType('task.status_changed');
      expect(statusEvents.length).toBe(1);
    });

    test('does nothing when status is the same', () => {
      const workspace = createTestWorkspace();
      const task = createTestTask(workspace.id);

      const collector = createEventCollector();
      updateTaskStatusWithLog(task, workspace, 'todo'); // same as current
      collector.unsubscribe();

      // No event should be emitted
      const statusEvents = collector.getByType('task.status_changed');
      expect(statusEvents.length).toBe(0);

      // No log should be created (beyond initial creation logs)
      const logs = taskRepository.findLogsByTaskId(task.id);
      const statusLogs = logs.filter((l) => l.eventType === 'status_changed');
      expect(statusLogs.length).toBe(0);
    });

    test('updates workspace last_activity_at', () => {
      const workspace = createTestWorkspace();
      const task = createTestTask(workspace.id);
      const originalLastActivity = workspace.lastActivityAt;

      // Wait a small amount to ensure timestamp differs
      const startTime = Date.now();
      while (Date.now() - startTime < 10) {
        // busy wait
      }

      updateTaskStatusWithLog(task, workspace, 'in_progress');

      const updatedWorkspace = workspaceRepository.findById(workspace.id);
      expect(updatedWorkspace?.lastActivityAt).not.toBe(originalLastActivity);
    });
  });
});
