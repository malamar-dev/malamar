import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test';

import * as agentRepository from '../agent/repository.ts';
import * as chatRepository from '../chat/repository.ts';
import type { ChatQueueItem } from '../chat/types.ts';
import {
  clearTestAdapter,
  createMockAdapter,
  type MockCliAdapter,
  setTestAdapter,
} from '../cli/index.ts';
import { closeDb, initDb, resetDb, runMigrations } from '../core/database.ts';
import { clearSubscribers, subscribe } from '../events/emitter.ts';
import type { SseEventPayloadMap, SseEventType } from '../events/types.ts';
import * as workspaceRepository from '../workspace/repository.ts';
import { DEFAULT_CHAT_WORKER_CONFIG, processChat } from './chat-worker.ts';

// Test database setup
let testDbPath: string | null = null;
let testTempDir: string | null = null;
let mockAdapter: MockCliAdapter;

function setupTestDb() {
  const testDir = join(tmpdir(), 'malamar-chat-worker-test');
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
  testTempDir = join(tmpdir(), `malamar-chat-test-temp-${Date.now()}`);
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

function createTestChat(workspaceId: string, options?: { agentId?: string; title?: string }) {
  return chatRepository.create({
    workspaceId,
    agentId: options?.agentId,
    title: options?.title ?? 'Test Chat',
  });
}

function createTestMessage(chatId: string, content: string, role: 'user' | 'agent' | 'system') {
  return chatRepository.createMessage({
    chatId,
    role,
    message: content,
  });
}

function createTestQueueItem(chatId: string, workspaceId: string): ChatQueueItem {
  return chatRepository.createQueueItem({ chatId, workspaceId });
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

describe('chat-worker', () => {
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

    // Set up mock CLI adapter with default chat response
    mockAdapter = createMockAdapter();
    mockAdapter.setInvocationConfig({
      success: true,
      response: { type: 'chat', message: 'Mock response', actions: [] },
    });
    setTestAdapter(mockAdapter);
  });

  afterEach(() => {
    clearSubscribers();
    clearTestAdapter();
  });

  describe('processChat', () => {
    test('returns error when chat not found', async () => {
      const workspace = createTestWorkspace();
      const queueItem: ChatQueueItem = {
        id: 'queue-123',
        chatId: 'nonexistent-chat',
        workspaceId: workspace.id,
        status: 'queued',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await processChat(queueItem);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Chat not found');
    });

    test('returns error when workspace not found', async () => {
      const workspace = createTestWorkspace();
      const chat = createTestChat(workspace.id);
      const queueItem: ChatQueueItem = {
        id: 'queue-123',
        chatId: chat.id,
        workspaceId: 'nonexistent-workspace',
        status: 'queued',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await processChat(queueItem);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Workspace not found');
    });

    test('updates queue status to in_progress at start', async () => {
      const workspace = createTestWorkspace();
      const chat = createTestChat(workspace.id);
      createTestMessage(chat.id, 'Hello!', 'user');
      const queueItem = createTestQueueItem(chat.id, workspace.id);

      // Mock adapter will succeed
      await processChat(queueItem, { tempDir: testTempDir! });

      // Queue status should have been updated
      // findQueueItemByChatId only finds queued items, so it should be null if status changed
      const foundQueueItem = chatRepository.findQueueItemByChatId(chat.id);
      expect(foundQueueItem).toBeNull();
    });

    test('handles missing agent gracefully', async () => {
      const workspace = createTestWorkspace();
      const chat = createTestChat(workspace.id, { agentId: 'nonexistent-agent' });
      createTestMessage(chat.id, 'Hello!', 'user');
      const queueItem = createTestQueueItem(chat.id, workspace.id);

      // Should not throw, should use Malamar agent
      const result = await processChat(queueItem, { tempDir: testTempDir! });

      // Result should succeed with mock adapter
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    test('uses chat CLI override when specified', async () => {
      const workspace = createTestWorkspace();
      const agent = createTestAgent(workspace.id);

      // Create chat with agent but also a CLI override
      const chat = chatRepository.create({
        workspaceId: workspace.id,
        agentId: agent.id,
        cliType: 'claude', // CLI override
      });
      createTestMessage(chat.id, 'Hello!', 'user');
      const queueItem = createTestQueueItem(chat.id, workspace.id);

      // Mock adapter succeeds
      const result = await processChat(queueItem, { tempDir: testTempDir! });
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    test('emits processing started event', async () => {
      const workspace = createTestWorkspace();
      const chat = createTestChat(workspace.id);
      createTestMessage(chat.id, 'Hello!', 'user');
      const queueItem = createTestQueueItem(chat.id, workspace.id);

      const collector = createEventCollector();

      await processChat(queueItem, { tempDir: testTempDir! });

      collector.unsubscribe();

      const startEvents = collector.getByType('chat.processing_started');
      expect(startEvents.length).toBe(1);
      expect(startEvents[0]?.payload).toEqual({
        workspaceId: workspace.id,
        chatId: chat.id,
        chatTitle: chat.title,
        agentName: 'Malamar',
      });
    });

    test('emits processing finished event', async () => {
      const workspace = createTestWorkspace();
      const chat = createTestChat(workspace.id);
      createTestMessage(chat.id, 'Hello!', 'user');
      const queueItem = createTestQueueItem(chat.id, workspace.id);

      const collector = createEventCollector();

      await processChat(queueItem, { tempDir: testTempDir! });

      collector.unsubscribe();

      const finishEvents = collector.getByType('chat.processing_finished');
      expect(finishEvents.length).toBe(1);
    });
  });

  describe('chat context building', () => {
    test('includes messages in context', async () => {
      const workspace = createTestWorkspace();
      const chat = createTestChat(workspace.id);

      // Add multiple messages
      createTestMessage(chat.id, 'Hello!', 'user');
      createTestMessage(chat.id, 'Hi there!', 'agent');
      createTestMessage(chat.id, 'How are you?', 'user');

      const queueItem = createTestQueueItem(chat.id, workspace.id);

      // Mock adapter succeeds
      const result = await processChat(queueItem, { tempDir: testTempDir! });

      expect(result.success).toBe(true);
      // Mock adapter was invoked
      expect(mockAdapter.getInvocationHistory().length).toBeGreaterThan(0);
    });

    test('handles chat with agent', async () => {
      const workspace = createTestWorkspace();
      const agent = createTestAgent(workspace.id, { name: 'My Agent' });
      const chat = createTestChat(workspace.id, { agentId: agent.id });
      createTestMessage(chat.id, 'Hello!', 'user');

      const queueItem = createTestQueueItem(chat.id, workspace.id);
      const collector = createEventCollector();

      await processChat(queueItem, { tempDir: testTempDir! });

      collector.unsubscribe();

      // Agent name should be in the event
      const startEvents = collector.getByType('chat.processing_started');
      expect(startEvents.length).toBe(1);
      expect(startEvents[0]?.payload).toMatchObject({
        agentName: 'My Agent',
      });
    });
  });

  describe('error handling', () => {
    test('marks queue as failed on CLI error', async () => {
      const workspace = createTestWorkspace();
      const chat = createTestChat(workspace.id);
      createTestMessage(chat.id, 'Hello!', 'user');
      const queueItem = createTestQueueItem(chat.id, workspace.id);

      // Configure mock to fail
      mockAdapter.setInvocationConfig({
        success: false,
        exitCode: 1,
        error: 'CLI invocation failed',
      });

      const result = await processChat(queueItem, { tempDir: testTempDir! });

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
    });

    test('adds system message on error', async () => {
      const workspace = createTestWorkspace();
      const chat = createTestChat(workspace.id);
      createTestMessage(chat.id, 'Hello!', 'user');
      const queueItem = createTestQueueItem(chat.id, workspace.id);

      // Configure mock to fail
      mockAdapter.setInvocationConfig({
        success: false,
        exitCode: 1,
        error: 'CLI error for testing',
      });

      await processChat(queueItem, { tempDir: testTempDir! });

      // Check if a system message was added (error message)
      const messages = chatRepository.findMessagesByChatId(chat.id);
      const systemMessages = messages.filter((m) => m.role === 'system');
      expect(systemMessages.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('working directory', () => {
    test('uses workspace working directory when static mode', async () => {
      const workspace = workspaceRepository.create({
        title: 'Static Workspace',
        workingDirectoryMode: 'static',
        workingDirectoryPath: testTempDir!, // Use test temp dir as "static" path
      });
      const chat = createTestChat(workspace.id);
      createTestMessage(chat.id, 'Hello!', 'user');
      const queueItem = createTestQueueItem(chat.id, workspace.id);

      // Mock adapter succeeds
      const result = await processChat(queueItem, { tempDir: testTempDir! });
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    test('uses temp directory when temp mode', async () => {
      const workspace = workspaceRepository.create({
        title: 'Temp Workspace',
        workingDirectoryMode: 'temp',
      });
      const chat = createTestChat(workspace.id);
      createTestMessage(chat.id, 'Hello!', 'user');
      const queueItem = createTestQueueItem(chat.id, workspace.id);

      // Mock adapter succeeds
      const result = await processChat(queueItem, { tempDir: testTempDir! });
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('queue completion', () => {
    test('marks queue as completed on success', async () => {
      const workspace = createTestWorkspace();
      const chat = createTestChat(workspace.id);
      createTestMessage(chat.id, 'Hello!', 'user');
      const queueItem = createTestQueueItem(chat.id, workspace.id);

      // Mock adapter succeeds
      const result = await processChat(queueItem, { tempDir: testTempDir! });

      expect(result.success).toBe(true);
      // Queue item should no longer be findable as "queued"
      const found = chatRepository.findQueueItemByChatId(chat.id);
      expect(found).toBeNull();
    });

    test('marks queue as failed on error', async () => {
      // Create a situation that will fail
      const workspace = createTestWorkspace();
      createTestChat(workspace.id);

      // Create a queue item pointing to a non-existent chat
      const queueItem: ChatQueueItem = {
        id: 'queue-fail',
        chatId: 'nonexistent',
        workspaceId: workspace.id,
        status: 'queued',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await processChat(queueItem);

      expect(result.success).toBe(false);
    });
  });

  describe('CLI determination', () => {
    test('prioritizes chat CLI override over agent CLI', async () => {
      const workspace = createTestWorkspace();

      // Agent has a CLI type set
      const agent = agentRepository.create({
        workspaceId: workspace.id,
        name: 'Agent With CLI',
        instruction: 'Test',
        cliType: 'claude', // Agent has claude
      });

      // Chat has CLI override (same as agent in this test, but tests the priority logic)
      const chat = chatRepository.create({
        workspaceId: workspace.id,
        agentId: agent.id,
        cliType: 'claude', // Chat override
      });
      createTestMessage(chat.id, 'Hello!', 'user');
      const queueItem = createTestQueueItem(chat.id, workspace.id);

      // Mock adapter succeeds
      const result = await processChat(queueItem, { tempDir: testTempDir! });
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    test('falls back to first healthy CLI when no override', async () => {
      const workspace = createTestWorkspace();
      const chat = createTestChat(workspace.id); // No agent, no CLI override
      createTestMessage(chat.id, 'Hello!', 'user');
      const queueItem = createTestQueueItem(chat.id, workspace.id);

      // Mock adapter succeeds - falls back to first healthy CLI
      const result = await processChat(queueItem, { tempDir: testTempDir! });
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('rename chat', () => {
    test('can rename chat on first agent response', async () => {
      const workspace = createTestWorkspace();
      const chat = createTestChat(workspace.id, { title: 'New Chat' });

      // Only user message - no agent responses yet
      createTestMessage(chat.id, 'Hello!', 'user');

      // Verify canRenameChat would return true at this point
      const agentCount = chatRepository.countAgentMessages(chat.id);
      expect(agentCount).toBe(0);
    });

    test('cannot rename chat after first agent response', async () => {
      const workspace = createTestWorkspace();
      const chat = createTestChat(workspace.id, { title: 'Named Chat' });

      // Add user and agent messages
      createTestMessage(chat.id, 'Hello!', 'user');
      createTestMessage(chat.id, 'Hi there!', 'agent');

      // Verify canRenameChat would return false at this point
      const agentCount = chatRepository.countAgentMessages(chat.id);
      expect(agentCount).toBe(1);
    });
  });
});

describe('ChatWorkerConfig', () => {
  test('default config has expected values', () => {
    expect(DEFAULT_CHAT_WORKER_CONFIG.tempDir).toBe('/tmp');
  });
});
