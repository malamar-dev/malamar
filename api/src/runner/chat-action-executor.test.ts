import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test';

import * as agentRepository from '../agent/repository.ts';
import * as chatRepository from '../chat/repository.ts';
import type { Chat } from '../chat/types.ts';
import { initDb, runMigrations } from '../core/database.ts';
import * as workspaceRepository from '../workspace/repository.ts';
import type { Workspace } from '../workspace/types.ts';
import {
  type ChatActionContext,
  countSuccessfulActions,
  executeChatActions,
  getFailedActionErrors,
} from './chat-action-executor.ts';
import type { ChatAction } from './types.ts';

// Test database setup
let testDbPath: string | null = null;

function setupTestDb() {
  const testDir = join(tmpdir(), 'malamar-chat-action-executor-test');
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

// Helper to create test data
function createTestWorkspace(options?: { title?: string }): Workspace {
  return workspaceRepository.create({
    title: options?.title ?? 'Test Workspace',
    description: 'A test workspace',
  });
}

function createTestChat(workspaceId: string, options?: { title?: string }): Chat {
  return chatRepository.create({
    workspaceId,
    title: options?.title ?? 'Test Chat',
  });
}

function createTestAgent(
  workspaceId: string,
  options?: { name?: string; instruction?: string; order?: number }
) {
  return agentRepository.create({
    workspaceId,
    name: options?.name ?? 'Test Agent',
    instruction: options?.instruction ?? 'You are a test agent.',
    cliType: 'claude',
    order: options?.order,
  });
}

function createTestContext(
  workspaceId: string,
  options?: { canRename?: boolean; chatTitle?: string }
): ChatActionContext {
  const workspace = workspaceRepository.findById(workspaceId)!;
  const chat = createTestChat(workspaceId, { title: options?.chatTitle });
  return {
    chat,
    workspace,
    canRename: options?.canRename ?? true,
  };
}

describe('chat-action-executor', () => {
  beforeAll(() => {
    setupTestDb();
  });

  afterAll(() => {
    cleanupTestDb();
  });

  beforeEach(() => {
    // Re-establish the singleton to point to our test database
    initDb(testDbPath!);
    clearTables();
  });

  afterEach(() => {
    // Clean up after each test
  });

  describe('executeChatActions', () => {
    describe('create_agent action', () => {
      test('creates agent in workspace', () => {
        const workspace = createTestWorkspace();
        const context = createTestContext(workspace.id);
        const actions: ChatAction[] = [
          {
            type: 'create_agent',
            name: 'New Agent',
            instruction: 'This is a new agent instruction.',
            cliType: 'claude',
          },
        ];

        const results = executeChatActions(context, actions);

        expect(results.length).toBe(1);
        expect(results[0]?.success).toBe(true);

        // Verify agent was created in database
        const agents = agentRepository.findByWorkspaceId(workspace.id);
        expect(agents.length).toBe(1);
        expect(agents[0]?.name).toBe('New Agent');
        expect(agents[0]?.instruction).toBe('This is a new agent instruction.');
      });

      test('creates agent with specified cliType', () => {
        const workspace = createTestWorkspace();
        const context = createTestContext(workspace.id);
        const actions: ChatAction[] = [
          {
            type: 'create_agent',
            name: 'Gemini Agent',
            instruction: 'An agent using Gemini.',
            cliType: 'gemini',
          },
        ];

        const results = executeChatActions(context, actions);

        expect(results[0]?.success).toBe(true);

        const agents = agentRepository.findByWorkspaceId(workspace.id);
        expect(agents[0]?.cliType).toBe('gemini');
      });

      test('creates agent with specified order', () => {
        const workspace = createTestWorkspace();
        const context = createTestContext(workspace.id);
        const actions: ChatAction[] = [
          {
            type: 'create_agent',
            name: 'Ordered Agent',
            instruction: 'An agent with specific order.',
            cliType: 'claude',
            order: 5,
          },
        ];

        const results = executeChatActions(context, actions);

        expect(results[0]?.success).toBe(true);

        const agents = agentRepository.findByWorkspaceId(workspace.id);
        expect(agents[0]?.order).toBe(5);
      });

      test('fails when agent name already exists', () => {
        const workspace = createTestWorkspace();
        createTestAgent(workspace.id, { name: 'Existing Agent' });
        const context = createTestContext(workspace.id);
        const actions: ChatAction[] = [
          {
            type: 'create_agent',
            name: 'Existing Agent',
            instruction: 'Duplicate name.',
            cliType: 'claude',
          },
        ];

        const results = executeChatActions(context, actions);

        expect(results[0]?.success).toBe(false);
        expect(results[0]?.error).toContain('already exists');

        // Verify system message was added
        const messages = chatRepository.findMessagesByChatId(context.chat.id);
        const systemMessages = messages.filter((m) => m.role === 'system');
        expect(systemMessages.length).toBe(1);
        expect(systemMessages[0]?.message).toContain('Some actions failed');
      });
    });

    describe('update_agent action', () => {
      test('updates existing agent', () => {
        const workspace = createTestWorkspace();
        const agent = createTestAgent(workspace.id, { name: 'Original Name' });
        const context = createTestContext(workspace.id);
        const actions: ChatAction[] = [
          {
            type: 'update_agent',
            agentId: agent.id,
            name: 'Updated Name',
            instruction: 'Updated instruction.',
          },
        ];

        const results = executeChatActions(context, actions);

        expect(results[0]?.success).toBe(true);

        // Verify agent was updated
        const updatedAgent = agentRepository.findById(agent.id);
        expect(updatedAgent?.name).toBe('Updated Name');
        expect(updatedAgent?.instruction).toBe('Updated instruction.');
      });

      test('updates agent cliType', () => {
        const workspace = createTestWorkspace();
        const agent = createTestAgent(workspace.id);
        const context = createTestContext(workspace.id);
        const actions: ChatAction[] = [
          {
            type: 'update_agent',
            agentId: agent.id,
            cliType: 'gemini',
          },
        ];

        const results = executeChatActions(context, actions);

        expect(results[0]?.success).toBe(true);

        const updatedAgent = agentRepository.findById(agent.id);
        expect(updatedAgent?.cliType).toBe('gemini');
      });

      test('fails when agent does not exist', () => {
        const workspace = createTestWorkspace();
        const context = createTestContext(workspace.id);
        const actions: ChatAction[] = [
          {
            type: 'update_agent',
            agentId: 'non-existent-id',
            name: 'New Name',
          },
        ];

        const results = executeChatActions(context, actions);

        expect(results[0]?.success).toBe(false);
        expect(results[0]?.error).toContain('not found');
      });
    });

    describe('delete_agent action', () => {
      test('deletes existing agent', () => {
        const workspace = createTestWorkspace();
        const agent = createTestAgent(workspace.id);
        const context = createTestContext(workspace.id);
        const actions: ChatAction[] = [
          {
            type: 'delete_agent',
            agentId: agent.id,
          },
        ];

        const results = executeChatActions(context, actions);

        expect(results[0]?.success).toBe(true);

        // Verify agent was deleted
        const deletedAgent = agentRepository.findById(agent.id);
        expect(deletedAgent).toBeNull();
      });

      test('fails when agent does not exist', () => {
        const workspace = createTestWorkspace();
        const context = createTestContext(workspace.id);
        const actions: ChatAction[] = [
          {
            type: 'delete_agent',
            agentId: 'non-existent-id',
          },
        ];

        const results = executeChatActions(context, actions);

        expect(results[0]?.success).toBe(false);
        expect(results[0]?.error).toContain('not found');
      });
    });

    describe('reorder_agents action', () => {
      test('reorders agents in workspace', () => {
        const workspace = createTestWorkspace();
        const agent1 = createTestAgent(workspace.id, { name: 'Agent 1', order: 0 });
        const agent2 = createTestAgent(workspace.id, { name: 'Agent 2', order: 1 });
        const agent3 = createTestAgent(workspace.id, { name: 'Agent 3', order: 2 });
        const context = createTestContext(workspace.id);

        // Reorder to: agent3, agent1, agent2
        const actions: ChatAction[] = [
          {
            type: 'reorder_agents',
            agentIds: [agent3.id, agent1.id, agent2.id],
          },
        ];

        const results = executeChatActions(context, actions);

        expect(results[0]?.success).toBe(true);

        // Verify agents are reordered
        const agents = agentRepository.findByWorkspaceId(workspace.id);
        expect(agents[0]?.id).toBe(agent3.id);
        expect(agents[1]?.id).toBe(agent1.id);
        expect(agents[2]?.id).toBe(agent2.id);
      });
    });

    describe('update_workspace action', () => {
      test('updates workspace title', () => {
        const workspace = createTestWorkspace({ title: 'Original Title' });
        const context = createTestContext(workspace.id);
        const actions: ChatAction[] = [
          {
            type: 'update_workspace',
            title: 'New Workspace Title',
          },
        ];

        const results = executeChatActions(context, actions);

        expect(results[0]?.success).toBe(true);

        // Verify workspace was updated
        const updatedWorkspace = workspaceRepository.findById(workspace.id);
        expect(updatedWorkspace?.title).toBe('New Workspace Title');
      });

      test('updates workspace description', () => {
        const workspace = createTestWorkspace();
        const context = createTestContext(workspace.id);
        const actions: ChatAction[] = [
          {
            type: 'update_workspace',
            description: 'New description for the workspace.',
          },
        ];

        const results = executeChatActions(context, actions);

        expect(results[0]?.success).toBe(true);

        const updatedWorkspace = workspaceRepository.findById(workspace.id);
        expect(updatedWorkspace?.description).toBe('New description for the workspace.');
      });

      test('updates workspace notification settings', () => {
        const workspace = createTestWorkspace();
        const context = createTestContext(workspace.id);
        const actions: ChatAction[] = [
          {
            type: 'update_workspace',
            notifyOnError: false,
            notifyOnInReview: false,
          },
        ];

        const results = executeChatActions(context, actions);

        expect(results[0]?.success).toBe(true);

        const updatedWorkspace = workspaceRepository.findById(workspace.id);
        expect(updatedWorkspace?.notifyOnError).toBe(false);
        expect(updatedWorkspace?.notifyOnInReview).toBe(false);
      });

      test('updates workspace working directory', () => {
        const workspace = createTestWorkspace();
        const context = createTestContext(workspace.id);
        const actions: ChatAction[] = [
          {
            type: 'update_workspace',
            workingDirectory: '/path/to/project',
          },
        ];

        const results = executeChatActions(context, actions);

        expect(results[0]?.success).toBe(true);

        const updatedWorkspace = workspaceRepository.findById(workspace.id);
        expect(updatedWorkspace?.workingDirectoryPath).toBe('/path/to/project');
      });
    });

    describe('rename_chat action', () => {
      test('renames chat on first response', () => {
        const workspace = createTestWorkspace();
        const context = createTestContext(workspace.id, { canRename: true });
        const actions: ChatAction[] = [
          {
            type: 'rename_chat',
            title: 'New Chat Title',
          },
        ];

        const results = executeChatActions(context, actions);

        expect(results[0]?.success).toBe(true);

        // Verify chat was renamed
        const updatedChat = chatRepository.findById(context.chat.id);
        expect(updatedChat?.title).toBe('New Chat Title');
      });

      test('does not rename chat when canRename is false', () => {
        const workspace = createTestWorkspace();
        const context = createTestContext(workspace.id, {
          canRename: false,
          chatTitle: 'Original Title',
        });
        const actions: ChatAction[] = [
          {
            type: 'rename_chat',
            title: 'Should Not Rename',
          },
        ];

        const results = executeChatActions(context, actions);

        // Action returns false (skipped), not an error
        expect(results[0]?.success).toBe(false);
        expect(results[0]?.error).toBe('Action skipped');

        // Verify chat was NOT renamed
        const chat = chatRepository.findById(context.chat.id);
        expect(chat?.title).toBe('Original Title');
      });
    });

    describe('mixed actions', () => {
      test('executes multiple actions in sequence', () => {
        const workspace = createTestWorkspace();
        const context = createTestContext(workspace.id, { canRename: true });
        const actions: ChatAction[] = [
          {
            type: 'create_agent',
            name: 'First Agent',
            instruction: 'First agent instruction.',
            cliType: 'claude',
          },
          {
            type: 'create_agent',
            name: 'Second Agent',
            instruction: 'Second agent instruction.',
            cliType: 'claude',
          },
          {
            type: 'update_workspace',
            title: 'Updated Workspace',
          },
          {
            type: 'rename_chat',
            title: 'Updated Chat',
          },
        ];

        const results = executeChatActions(context, actions);

        expect(results.length).toBe(4);
        expect(results.every((r) => r.success)).toBe(true);

        // Verify all changes
        const agents = agentRepository.findByWorkspaceId(workspace.id);
        expect(agents.length).toBe(2);

        const updatedWorkspace = workspaceRepository.findById(workspace.id);
        expect(updatedWorkspace?.title).toBe('Updated Workspace');

        const updatedChat = chatRepository.findById(context.chat.id);
        expect(updatedChat?.title).toBe('Updated Chat');
      });

      test('continues execution after failed action', () => {
        const workspace = createTestWorkspace();
        const context = createTestContext(workspace.id);
        const actions: ChatAction[] = [
          {
            type: 'delete_agent',
            agentId: 'non-existent-id', // This will fail
          },
          {
            type: 'create_agent',
            name: 'Valid Agent',
            instruction: 'This should succeed.',
            cliType: 'claude',
          },
        ];

        const results = executeChatActions(context, actions);

        expect(results.length).toBe(2);
        expect(results[0]?.success).toBe(false);
        expect(results[1]?.success).toBe(true);

        // Verify valid agent was created despite previous failure
        const agents = agentRepository.findByWorkspaceId(workspace.id);
        expect(agents.length).toBe(1);
        expect(agents[0]?.name).toBe('Valid Agent');
      });

      test('adds system message when actions fail', () => {
        const workspace = createTestWorkspace();
        const context = createTestContext(workspace.id);
        const actions: ChatAction[] = [
          {
            type: 'delete_agent',
            agentId: 'non-existent-1',
          },
          {
            type: 'update_agent',
            agentId: 'non-existent-2',
            name: 'New Name',
          },
        ];

        executeChatActions(context, actions);

        // Verify system message was added with all errors
        const messages = chatRepository.findMessagesByChatId(context.chat.id);
        const systemMessages = messages.filter((m) => m.role === 'system');
        expect(systemMessages.length).toBe(1);
        expect(systemMessages[0]?.message).toContain('Some actions failed');
        expect(systemMessages[0]?.message).toContain('delete_agent');
        expect(systemMessages[0]?.message).toContain('update_agent');
      });
    });

    describe('empty actions', () => {
      test('handles empty actions array', () => {
        const workspace = createTestWorkspace();
        const context = createTestContext(workspace.id);
        const actions: ChatAction[] = [];

        const results = executeChatActions(context, actions);

        expect(results.length).toBe(0);

        // No system message should be added
        const messages = chatRepository.findMessagesByChatId(context.chat.id);
        expect(messages.length).toBe(0);
      });
    });
  });

  describe('countSuccessfulActions', () => {
    test('counts successful actions', () => {
      const workspace = createTestWorkspace();
      const context = createTestContext(workspace.id, { canRename: true });
      const actions: ChatAction[] = [
        {
          type: 'create_agent',
          name: 'Agent 1',
          instruction: 'Instruction 1',
          cliType: 'claude',
        },
        {
          type: 'delete_agent',
          agentId: 'non-existent', // Will fail
        },
        {
          type: 'rename_chat',
          title: 'New Title',
        },
      ];

      const results = executeChatActions(context, actions);
      const successCount = countSuccessfulActions(results);

      expect(successCount).toBe(2);
    });

    test('returns 0 when all actions fail', () => {
      const workspace = createTestWorkspace();
      const context = createTestContext(workspace.id);
      const actions: ChatAction[] = [
        { type: 'delete_agent', agentId: 'non-existent-1' },
        { type: 'delete_agent', agentId: 'non-existent-2' },
      ];

      const results = executeChatActions(context, actions);
      const successCount = countSuccessfulActions(results);

      expect(successCount).toBe(0);
    });
  });

  describe('getFailedActionErrors', () => {
    test('returns error messages for failed actions', () => {
      const workspace = createTestWorkspace();
      const context = createTestContext(workspace.id);
      const actions: ChatAction[] = [
        {
          type: 'create_agent',
          name: 'Valid Agent',
          instruction: 'Valid instruction.',
          cliType: 'claude',
        },
        { type: 'delete_agent', agentId: 'non-existent' },
        { type: 'update_agent', agentId: 'also-non-existent', name: 'New Name' },
      ];

      const results = executeChatActions(context, actions);
      const errors = getFailedActionErrors(results);

      expect(errors.length).toBe(2);
      expect(errors[0]).toContain('delete_agent');
      expect(errors[1]).toContain('update_agent');
    });

    test('returns empty array when all actions succeed', () => {
      const workspace = createTestWorkspace();
      const context = createTestContext(workspace.id);
      const actions: ChatAction[] = [
        {
          type: 'create_agent',
          name: 'Agent',
          instruction: 'Instruction',
          cliType: 'claude',
        },
      ];

      const results = executeChatActions(context, actions);
      const errors = getFailedActionErrors(results);

      expect(errors.length).toBe(0);
    });
  });
});
