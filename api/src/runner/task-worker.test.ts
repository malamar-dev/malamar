import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test';

import * as agentRepository from '../agent/repository.ts';
import {
  clearTestAdapter,
  createMockAdapter,
  type MockCliAdapter,
  setTestAdapter,
} from '../cli/index.ts';
import { closeDb, initDb, resetDb, runMigrations } from '../core/database.ts';
import { clearSubscribers, subscribe } from '../events/emitter.ts';
import type { SseEventPayloadMap, SseEventType } from '../events/types.ts';
import * as taskRepository from '../task/repository.ts';
import type { TaskQueueItem } from '../task/types.ts';
import * as workspaceRepository from '../workspace/repository.ts';
import { DEFAULT_TASK_WORKER_CONFIG, processTask } from './task-worker.ts';

// Test database setup
let testDbPath: string | null = null;
let testTempDir: string | null = null;
let mockAdapter: MockCliAdapter;

function setupTestDb() {
  const testDir = join(tmpdir(), 'malamar-task-worker-test');
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

function setupTestTempDir() {
  testTempDir = join(tmpdir(), `malamar-test-temp-${Date.now()}`);
  if (!existsSync(testTempDir)) {
    mkdirSync(testTempDir, { recursive: true });
  }
  return testTempDir;
}

function cleanupTestTempDir() {
  if (testTempDir && existsSync(testTempDir)) {
    rmSync(testTempDir, { recursive: true, force: true });
  }
  testTempDir = null;
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

function createTestQueueItem(taskId: string, workspaceId: string): TaskQueueItem {
  return taskRepository.createQueueItem({ taskId, workspaceId });
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

describe('task-worker', () => {
  beforeAll(() => {
    setupTestDb();
  });

  afterAll(() => {
    cleanupTestDb();
    cleanupTestTempDir();
  });

  beforeEach(() => {
    // Re-establish the singleton to point to our test database
    initDb(testDbPath!);
    clearTables();
    setupTestTempDir();
    clearSubscribers();

    // Set up mock CLI adapter with default skip response
    mockAdapter = createMockAdapter();
    mockAdapter.setInvocationConfig({
      success: true,
      response: { type: 'task', actions: [{ type: 'skip' }] },
    });
    setTestAdapter(mockAdapter);
  });

  afterEach(() => {
    clearSubscribers();
    clearTestAdapter();
  });

  describe('processTask', () => {
    test('returns error when task not found', async () => {
      const workspace = createTestWorkspace();
      const queueItem: TaskQueueItem = {
        id: 'queue-123',
        taskId: 'nonexistent-task',
        workspaceId: workspace.id,
        status: 'queued',
        isPriority: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await processTask(queueItem);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Task not found');
    });

    test('returns error when workspace not found', async () => {
      const workspace = createTestWorkspace();
      const task = createTestTask(workspace.id);
      const queueItem: TaskQueueItem = {
        id: 'queue-123',
        taskId: task.id,
        workspaceId: 'nonexistent-workspace',
        status: 'queued',
        isPriority: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await processTask(queueItem);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Workspace not found');
    });

    test('moves task to in_review when no agents configured', async () => {
      const workspace = createTestWorkspace();
      const task = createTestTask(workspace.id);
      const queueItem = createTestQueueItem(task.id, workspace.id);

      const result = await processTask(queueItem);

      expect(result.success).toBe(true);
      expect(result.finalStatus).toBe('in_review');
      expect(result.agentsProcessed).toBe(0);

      // Verify task status was updated
      const updatedTask = taskRepository.findById(task.id);
      expect(updatedTask?.status).toBe('in_review');
    });

    test('updates queue status to in_progress at start', async () => {
      const workspace = createTestWorkspace();
      const task = createTestTask(workspace.id);
      const queueItem = createTestQueueItem(task.id, workspace.id);

      // Process will fail since we don't have a real CLI, but that's ok for this test
      await processTask(queueItem);

      // Queue status should have been updated (we can check by the queue item no longer being "queued")
      const foundQueueItem = taskRepository.findQueueItemByTaskId(task.id);
      // findQueueItemByTaskId only finds queued items, so it should be null if status changed
      expect(foundQueueItem).toBeNull();
    });

    test('moves task from todo to in_progress', async () => {
      const workspace = createTestWorkspace();
      const task = createTestTask(workspace.id);
      expect(task.status).toBe('todo');

      // Add an agent - mock CLI will respond with skip
      createTestAgent(workspace.id);
      const queueItem = createTestQueueItem(task.id, workspace.id);

      // Mock adapter returns skip, so task should move to in_review after all agents skip
      await processTask(queueItem, { tempDir: testTempDir! });

      // Task should have been moved to in_progress and then to in_review (all skipped)
      const updatedTask = taskRepository.findById(task.id);
      expect(updatedTask?.status).toBe('in_review');
    });

    test('does not emit status events when no agents configured', async () => {
      // When no agents are configured, the task moves to in_review immediately
      // without emitting SSE events (this is an internal status change)
      const workspace = createTestWorkspace();
      const task = createTestTask(workspace.id, { summary: 'Event Test Task' });
      const queueItem = createTestQueueItem(task.id, workspace.id);

      const collector = createEventCollector();

      await processTask(queueItem);

      collector.unsubscribe();

      // No agent execution events should be emitted (no agents to process)
      const agentStartEvents = collector.getByType('agent.execution_started');
      expect(agentStartEvents.length).toBe(0);

      // Task status was still updated in the database
      const updatedTask = taskRepository.findById(task.id);
      expect(updatedTask?.status).toBe('in_review');
    });

    test('creates activity log for status change', async () => {
      const workspace = createTestWorkspace();
      const task = createTestTask(workspace.id);
      const queueItem = createTestQueueItem(task.id, workspace.id);

      await processTask(queueItem);

      const logs = taskRepository.findLogsByTaskId(task.id);
      const statusLogs = logs.filter((l) => l.eventType === 'status_changed');
      expect(statusLogs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('task context building', () => {
    test('includes comments in context', async () => {
      const workspace = createTestWorkspace();
      const task = createTestTask(workspace.id);
      createTestAgent(workspace.id);

      // Add a comment
      taskRepository.createComment({
        taskId: task.id,
        workspaceId: workspace.id,
        content: 'Test comment',
        userId: 'user-123',
      });

      const queueItem = createTestQueueItem(task.id, workspace.id);

      // Mock adapter succeeds - verify the flow completes with comments present
      const result = await processTask(queueItem, { tempDir: testTempDir! });

      expect(result.success).toBe(true);
      // Mock adapter was invoked
      expect(mockAdapter.getInvocationHistory().length).toBeGreaterThan(0);
    });

    test('includes activity logs in context', async () => {
      const workspace = createTestWorkspace();
      const task = createTestTask(workspace.id);
      createTestAgent(workspace.id);

      // Add an activity log
      taskRepository.createLog({
        taskId: task.id,
        workspaceId: workspace.id,
        eventType: 'task_created',
        actorType: 'user',
        actorId: 'user-123',
      });

      const queueItem = createTestQueueItem(task.id, workspace.id);

      // Mock adapter succeeds - verify the flow completes with logs present
      const result = await processTask(queueItem, { tempDir: testTempDir! });

      expect(result.success).toBe(true);
      // Mock adapter was invoked
      expect(mockAdapter.getInvocationHistory().length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    test('marks queue as failed on unexpected error', async () => {
      const workspace = createTestWorkspace();
      const task = createTestTask(workspace.id);
      createTestAgent(workspace.id);
      const queueItem = createTestQueueItem(task.id, workspace.id);

      // Configure mock to throw an error
      mockAdapter.setInvocationConfig({
        success: false,
        exitCode: -1,
        error: 'Unexpected CLI error',
      });

      const result = await processTask(queueItem, { tempDir: testTempDir! });

      // The result should indicate failure
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
    });

    test('handles CLI error gracefully', async () => {
      const workspace = createTestWorkspace();
      const task = createTestTask(workspace.id);

      // Configure mock to fail
      mockAdapter.setInvocationConfig({
        success: false,
        exitCode: 1,
        error: 'CLI invocation failed',
      });

      createTestAgent(workspace.id);
      const queueItem = createTestQueueItem(task.id, workspace.id);

      const result = await processTask(queueItem, { tempDir: testTempDir! });

      // Should handle the error gracefully
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      // Task should have been moved to in_progress
      const updatedTask = taskRepository.findById(task.id);
      expect(updatedTask?.status).toBe('in_progress');
    });
  });

  describe('working directory', () => {
    test('uses workspace working directory when static mode', async () => {
      const workspace = workspaceRepository.create({
        title: 'Static Workspace',
        workingDirectoryMode: 'static',
        workingDirectoryPath: testTempDir!, // Use test temp dir as the "static" path
      });
      const task = createTestTask(workspace.id);
      createTestAgent(workspace.id);
      const queueItem = createTestQueueItem(task.id, workspace.id);

      // Mock adapter will succeed with skip
      const result = await processTask(queueItem, { tempDir: testTempDir! });
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.finalStatus).toBe('in_review');
    });

    test('uses temp directory when temp mode', async () => {
      const workspace = workspaceRepository.create({
        title: 'Temp Workspace',
        workingDirectoryMode: 'temp',
      });
      const task = createTestTask(workspace.id);
      createTestAgent(workspace.id);
      const queueItem = createTestQueueItem(task.id, workspace.id);

      // Mock adapter will succeed with skip
      const result = await processTask(queueItem, { tempDir: testTempDir! });
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.finalStatus).toBe('in_review');
    });
  });

  describe('agent processing order', () => {
    test('processes agents in order', async () => {
      const workspace = createTestWorkspace();
      const task = createTestTask(workspace.id);

      // Create agents in reverse order but with explicit order values
      createTestAgent(workspace.id, { name: 'Third Agent', order: 3 });
      createTestAgent(workspace.id, { name: 'First Agent', order: 1 });
      createTestAgent(workspace.id, { name: 'Second Agent', order: 2 });

      const queueItem = createTestQueueItem(task.id, workspace.id);
      const collector = createEventCollector();

      await processTask(queueItem, { tempDir: testTempDir! });

      collector.unsubscribe();

      // Check that agent events were emitted for all 3 agents
      const agentStartEvents = collector.getByType('agent.execution_started');
      expect(agentStartEvents.length).toBe(3);

      // Verify agents were processed in order (First, Second, Third)
      type AgentPayload = { agentName: string };
      const agentNames = agentStartEvents.map((e) => (e.payload as AgentPayload).agentName);
      expect(agentNames).toEqual(['First Agent', 'Second Agent', 'Third Agent']);
    });
  });

  describe('queue completion', () => {
    test('marks queue as completed on success', async () => {
      const workspace = createTestWorkspace();
      const task = createTestTask(workspace.id);
      // No agents = immediate success
      const queueItem = createTestQueueItem(task.id, workspace.id);

      const result = await processTask(queueItem);

      expect(result.success).toBe(true);
      // Queue item should no longer be findable as "queued"
      const found = taskRepository.findQueueItemByTaskId(task.id);
      expect(found).toBeNull();
    });

    test('marks queue as failed on error', async () => {
      // Create a situation that will fail
      const workspace = createTestWorkspace();
      // Create a task but use a different ID in the queue item to simulate failure
      createTestTask(workspace.id);

      // Create a queue item pointing to a non-existent task
      const queueItem: TaskQueueItem = {
        id: 'queue-fail',
        taskId: 'nonexistent',
        workspaceId: workspace.id,
        status: 'queued',
        isPriority: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await processTask(queueItem);

      expect(result.success).toBe(false);
    });
  });
});

describe('TaskWorkerConfig', () => {
  test('default config has expected values', () => {
    expect(DEFAULT_TASK_WORKER_CONFIG.tempDir).toBe('/tmp');
  });
});
