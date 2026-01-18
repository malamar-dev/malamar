import { Database } from 'bun:sqlite';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import {
  getRunnerStats,
  isRunnerRunning,
  isRunnerShuttingDown,
  resetRunnerState,
  startRunner,
  stopRunner,
} from './index.ts';
import { clearAllTracking } from './subprocess.ts';

// Mock the config to use faster poll interval for testing
mock.module('../core/config.ts', () => ({
  getConfig: () => ({
    host: '127.0.0.1',
    port: 3456,
    dataDir: '/tmp/malamar-test',
    logLevel: 'info',
    logFormat: 'text',
    runnerPollInterval: 100, // Fast interval for testing
    tempDir: '/tmp',
  }),
}));

// Mock the database module
let mockDb: Database;

mock.module('../core/database.ts', () => ({
  getDb: () => mockDb,
}));

// Mock the task repository
mock.module('../task/repository.ts', () => ({
  findQueuedByWorkspace: () => [],
  findById: () => null,
  updateQueueStatus: () => {},
}));

// Mock the chat repository
mock.module('../chat/repository.ts', () => ({
  findQueuedItems: () => [],
  updateQueueStatus: () => {},
}));

// Mock the workers to avoid actual processing
mock.module('./task-worker.ts', () => ({
  processTask: async () => ({
    success: true,
    finalStatus: 'in_review',
    agentsProcessed: 0,
    commentsAdded: 0,
  }),
  DEFAULT_TASK_WORKER_CONFIG: { tempDir: '/tmp' },
}));

mock.module('./chat-worker.ts', () => ({
  processChat: async () => ({
    success: true,
    messageAdded: false,
    actionsExecuted: 0,
  }),
  DEFAULT_CHAT_WORKER_CONFIG: { tempDir: '/tmp' },
}));

describe('runner/index', () => {
  beforeEach(() => {
    // Create in-memory database
    mockDb = new Database(':memory:');

    // Create queue tables
    mockDb.run(`
      CREATE TABLE task_queue (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        status TEXT NOT NULL,
        is_priority INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    mockDb.run(`
      CREATE TABLE chat_queue (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Reset runner state before each test
    resetRunnerState();
    clearAllTracking();
  });

  afterEach(async () => {
    // Stop runner if running
    if (isRunnerRunning()) {
      await stopRunner();
    }

    // Close database
    mockDb.close();
  });

  describe('startRunner', () => {
    test('should start the runner', () => {
      expect(isRunnerRunning()).toBe(false);

      startRunner();

      expect(isRunnerRunning()).toBe(true);
      expect(isRunnerShuttingDown()).toBe(false);
    });

    test('should not start if already running', () => {
      startRunner();
      expect(isRunnerRunning()).toBe(true);

      // Calling startRunner again should be a no-op
      startRunner();
      expect(isRunnerRunning()).toBe(true);
    });

    test('should perform startup recovery - reset in_progress task queue items', () => {
      // Insert an in_progress task queue item
      mockDb.run(
        `INSERT INTO task_queue (id, task_id, workspace_id, status, is_priority, created_at, updated_at)
         VALUES ('q1', 't1', 'w1', 'in_progress', 0, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z')`
      );

      startRunner();

      // Check that the item was reset to queued
      const row = mockDb.query<{ status: string }, [string]>('SELECT status FROM task_queue WHERE id = ?').get('q1');
      expect(row?.status).toBe('queued');
    });

    test('should perform startup recovery - reset in_progress chat queue items', () => {
      // Insert an in_progress chat queue item
      mockDb.run(
        `INSERT INTO chat_queue (id, chat_id, workspace_id, status, created_at, updated_at)
         VALUES ('q1', 'c1', 'w1', 'in_progress', '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z')`
      );

      startRunner();

      // Check that the item was reset to queued
      const row = mockDb.query<{ status: string }, [string]>('SELECT status FROM chat_queue WHERE id = ?').get('q1');
      expect(row?.status).toBe('queued');
    });
  });

  describe('stopRunner', () => {
    test('should stop the runner', async () => {
      startRunner();
      expect(isRunnerRunning()).toBe(true);

      await stopRunner();

      expect(isRunnerRunning()).toBe(false);
      expect(isRunnerShuttingDown()).toBe(false);
    });

    test('should handle stopping when not running', async () => {
      expect(isRunnerRunning()).toBe(false);

      // Should not throw
      await stopRunner();

      expect(isRunnerRunning()).toBe(false);
    });
  });

  describe('getRunnerStats', () => {
    test('should return runner statistics when not running', () => {
      const stats = getRunnerStats();

      expect(stats).toEqual({
        isRunning: false,
        isShuttingDown: false,
        activeTaskWorkers: 0,
        activeChatWorkers: 0,
      });
    });

    test('should return runner statistics when running', () => {
      startRunner();

      const stats = getRunnerStats();

      expect(stats.isRunning).toBe(true);
      expect(stats.isShuttingDown).toBe(false);
      expect(stats.activeTaskWorkers).toBe(0);
      expect(stats.activeChatWorkers).toBe(0);
    });
  });

  describe('isRunnerRunning', () => {
    test('should return false when not running', () => {
      expect(isRunnerRunning()).toBe(false);
    });

    test('should return true when running', () => {
      startRunner();
      expect(isRunnerRunning()).toBe(true);
    });
  });

  describe('isRunnerShuttingDown', () => {
    test('should return false when not shutting down', () => {
      expect(isRunnerShuttingDown()).toBe(false);
    });
  });

  describe('startup recovery', () => {
    test('should not affect queued items', () => {
      // Insert queued items
      mockDb.run(
        `INSERT INTO task_queue (id, task_id, workspace_id, status, is_priority, created_at, updated_at)
         VALUES ('q1', 't1', 'w1', 'queued', 0, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z')`
      );
      mockDb.run(
        `INSERT INTO chat_queue (id, chat_id, workspace_id, status, created_at, updated_at)
         VALUES ('q2', 'c1', 'w1', 'queued', '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z')`
      );

      startRunner();

      // Items should still be queued
      const taskRow = mockDb.query<{ status: string }, [string]>('SELECT status FROM task_queue WHERE id = ?').get('q1');
      expect(taskRow?.status).toBe('queued');

      const chatRow = mockDb.query<{ status: string }, [string]>('SELECT status FROM chat_queue WHERE id = ?').get('q2');
      expect(chatRow?.status).toBe('queued');
    });

    test('should not affect completed items', () => {
      // Insert completed items
      mockDb.run(
        `INSERT INTO task_queue (id, task_id, workspace_id, status, is_priority, created_at, updated_at)
         VALUES ('q1', 't1', 'w1', 'completed', 0, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z')`
      );
      mockDb.run(
        `INSERT INTO chat_queue (id, chat_id, workspace_id, status, created_at, updated_at)
         VALUES ('q2', 'c1', 'w1', 'completed', '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z')`
      );

      startRunner();

      // Items should still be completed
      const taskRow = mockDb.query<{ status: string }, [string]>('SELECT status FROM task_queue WHERE id = ?').get('q1');
      expect(taskRow?.status).toBe('completed');

      const chatRow = mockDb.query<{ status: string }, [string]>('SELECT status FROM chat_queue WHERE id = ?').get('q2');
      expect(chatRow?.status).toBe('completed');
    });

    test('should not affect failed items', () => {
      // Insert failed items
      mockDb.run(
        `INSERT INTO task_queue (id, task_id, workspace_id, status, is_priority, created_at, updated_at)
         VALUES ('q1', 't1', 'w1', 'failed', 0, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z')`
      );
      mockDb.run(
        `INSERT INTO chat_queue (id, chat_id, workspace_id, status, created_at, updated_at)
         VALUES ('q2', 'c1', 'w1', 'failed', '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z')`
      );

      startRunner();

      // Items should still be failed
      const taskRow = mockDb.query<{ status: string }, [string]>('SELECT status FROM task_queue WHERE id = ?').get('q1');
      expect(taskRow?.status).toBe('failed');

      const chatRow = mockDb.query<{ status: string }, [string]>('SELECT status FROM chat_queue WHERE id = ?').get('q2');
      expect(chatRow?.status).toBe('failed');
    });
  });
});
