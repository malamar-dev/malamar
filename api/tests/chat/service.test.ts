import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test';

import * as chatRepository from '../../src/chat/repository.ts';
import * as chatService from '../../src/chat/service.ts';
import { NotFoundError } from '../../src/core/errors.ts';
import * as workspaceService from '../../src/workspace/service.ts';
import { cleanupTestDb, clearTables, getTestDb, setupTestDb } from '../helpers/index.ts';

describe('chat service integration', () => {
  beforeAll(() => {
    setupTestDb();
  });

  afterEach(() => {
    clearTables();
  });

  afterAll(() => {
    cleanupTestDb();
  });

  describe('createChat', () => {
    test('creates a chat with required fields', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      const chat = chatService.createChat({
        workspaceId: workspace.id,
      });

      expect(chat.id).toHaveLength(21);
      expect(chat.workspaceId).toBe(workspace.id);
      expect(chat.title).toBe('New Chat');
      expect(chat.agentId).toBeNull();
      expect(chat.cliType).toBeNull();
    });

    test('creates a chat with custom title', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      const chat = chatService.createChat({
        workspaceId: workspace.id,
        title: 'Custom Title',
      });

      expect(chat.title).toBe('Custom Title');
    });

    test('creates a chat with agent and CLI type', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      const chat = chatService.createChat({
        workspaceId: workspace.id,
        agentId: 'agent-123',
        cliType: 'claude',
      });

      expect(chat.agentId).toBe('agent-123');
      expect(chat.cliType).toBe('claude');
    });
  });

  describe('getChat', () => {
    test('returns chat when it exists', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const created = chatService.createChat({
        workspaceId: workspace.id,
        title: 'Get Test',
      });

      const retrieved = chatService.getChat(created.id);

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.title).toBe('Get Test');
    });

    test('throws NotFoundError when chat does not exist', () => {
      expect(() => chatService.getChat('nonexistent-id')).toThrow(NotFoundError);
    });

    test('NotFoundError has correct properties', () => {
      try {
        chatService.getChat('missing-chat-id');
        expect.unreachable('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        const notFoundError = error as NotFoundError;
        expect(notFoundError.statusCode).toBe(404);
        expect(notFoundError.code).toBe('NOT_FOUND');
        expect(notFoundError.message).toContain('missing-chat-id');
      }
    });
  });

  describe('listChats', () => {
    test('returns empty array when no chats exist', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      const chats = chatService.listChats(workspace.id);

      expect(chats).toEqual([]);
    });

    test('returns all chats in workspace ordered by updated_at desc', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      chatService.createChat({ workspaceId: workspace.id, title: 'Chat 1' });
      Bun.sleepSync(10);
      chatService.createChat({ workspaceId: workspace.id, title: 'Chat 2' });
      Bun.sleepSync(10);
      chatService.createChat({ workspaceId: workspace.id, title: 'Chat 3' });

      const chats = chatService.listChats(workspace.id);
      expect(chats).toHaveLength(3);
      // Most recently created should be first (by updated_at DESC)
      expect(chats[0]?.title).toBe('Chat 3');
      expect(chats[1]?.title).toBe('Chat 2');
      expect(chats[2]?.title).toBe('Chat 1');
    });

    test('returns empty array for non-existent workspace', () => {
      const chats = chatService.listChats('nonexistent-workspace-id');
      expect(chats).toEqual([]);
    });

    test('only returns chats from specified workspace', () => {
      const workspace1 = workspaceService.createWorkspace({ title: 'Workspace 1' });
      const workspace2 = workspaceService.createWorkspace({ title: 'Workspace 2' });

      chatService.createChat({ workspaceId: workspace1.id, title: 'Chat in W1' });
      chatService.createChat({ workspaceId: workspace2.id, title: 'Chat in W2' });

      const chats1 = chatService.listChats(workspace1.id);
      const chats2 = chatService.listChats(workspace2.id);

      expect(chats1).toHaveLength(1);
      expect(chats1[0]?.title).toBe('Chat in W1');
      expect(chats2).toHaveLength(1);
      expect(chats2[0]?.title).toBe('Chat in W2');
    });
  });

  describe('searchChats', () => {
    test('returns empty array when no chats match', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      chatService.createChat({ workspaceId: workspace.id, title: 'Hello World' });

      const results = chatService.searchChats(workspace.id, 'nonexistent');

      expect(results).toEqual([]);
    });

    test('finds chats by partial title match', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      chatService.createChat({ workspaceId: workspace.id, title: 'Hello World' });
      chatService.createChat({ workspaceId: workspace.id, title: 'World News' });
      chatService.createChat({ workspaceId: workspace.id, title: 'Goodbye' });

      const results = chatService.searchChats(workspace.id, 'World');

      expect(results).toHaveLength(2);
      const titles = results.map((c) => c.title);
      expect(titles).toContain('Hello World');
      expect(titles).toContain('World News');
    });

    test('search is case-insensitive', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      chatService.createChat({ workspaceId: workspace.id, title: 'Hello World' });

      const results = chatService.searchChats(workspace.id, 'hello');

      expect(results).toHaveLength(1);
      expect(results[0]?.title).toBe('Hello World');
    });

    test('only searches in specified workspace', () => {
      const workspace1 = workspaceService.createWorkspace({ title: 'Workspace 1' });
      const workspace2 = workspaceService.createWorkspace({ title: 'Workspace 2' });

      chatService.createChat({ workspaceId: workspace1.id, title: 'Hello W1' });
      chatService.createChat({ workspaceId: workspace2.id, title: 'Hello W2' });

      const results = chatService.searchChats(workspace1.id, 'Hello');

      expect(results).toHaveLength(1);
      expect(results[0]?.title).toBe('Hello W1');
    });
  });

  describe('updateChat', () => {
    test('updates chat title', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const created = chatService.createChat({
        workspaceId: workspace.id,
        title: 'Original Title',
      });

      const updated = chatService.updateChat(created.id, { title: 'Updated Title' });

      expect(updated.title).toBe('Updated Title');
    });

    test('updates chat agentId', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const created = chatService.createChat({
        workspaceId: workspace.id,
      });

      const updated = chatService.updateChat(created.id, { agentId: 'new-agent-id' });

      expect(updated.agentId).toBe('new-agent-id');
    });

    test('updates chat cliType', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const created = chatService.createChat({
        workspaceId: workspace.id,
      });

      const updated = chatService.updateChat(created.id, { cliType: 'gemini' });

      expect(updated.cliType).toBe('gemini');
    });

    test('clears agentId with null', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const created = chatService.createChat({
        workspaceId: workspace.id,
        agentId: 'existing-agent',
      });

      const updated = chatService.updateChat(created.id, { agentId: null });

      expect(updated.agentId).toBeNull();
    });

    test('clears cliType with null', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const created = chatService.createChat({
        workspaceId: workspace.id,
        cliType: 'claude',
      });

      const updated = chatService.updateChat(created.id, { cliType: null });

      expect(updated.cliType).toBeNull();
    });

    test('preserves unchanged fields', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const created = chatService.createChat({
        workspaceId: workspace.id,
        title: 'Keep Title',
        agentId: 'keep-agent',
        cliType: 'claude',
      });

      const updated = chatService.updateChat(created.id, { title: 'New Title' });

      expect(updated.title).toBe('New Title');
      expect(updated.agentId).toBe('keep-agent');
      expect(updated.cliType).toBe('claude');
    });

    test('throws NotFoundError when chat does not exist', () => {
      expect(() => chatService.updateChat('nonexistent', { title: 'Test' })).toThrow(NotFoundError);
    });
  });

  describe('deleteChat', () => {
    test('deletes an existing chat', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const created = chatService.createChat({
        workspaceId: workspace.id,
        title: 'To Delete',
      });

      chatService.deleteChat(created.id);

      expect(() => chatService.getChat(created.id)).toThrow(NotFoundError);
    });

    test('throws NotFoundError when chat does not exist', () => {
      expect(() => chatService.deleteChat('nonexistent')).toThrow(NotFoundError);
    });

    test('does not affect other chats in workspace', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      const chat1 = chatService.createChat({ workspaceId: workspace.id, title: 'Keep' });
      const chat2 = chatService.createChat({ workspaceId: workspace.id, title: 'Delete' });

      chatService.deleteChat(chat2.id);

      const retrieved = chatService.getChat(chat1.id);
      expect(retrieved.title).toBe('Keep');

      const chats = chatService.listChats(workspace.id);
      expect(chats).toHaveLength(1);
    });
  });

  describe('sendMessage', () => {
    test('creates a user message', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const chat = chatService.createChat({ workspaceId: workspace.id });

      const message = chatService.sendMessage(chat.id, 'Hello!');

      expect(message.id).toHaveLength(21);
      expect(message.chatId).toBe(chat.id);
      expect(message.role).toBe('user');
      expect(message.message).toBe('Hello!');
      expect(message.actions).toBeNull();
    });

    test('creates a queue item automatically', () => {
      const db = getTestDb();
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const chat = chatService.createChat({ workspaceId: workspace.id });

      chatService.sendMessage(chat.id, 'Hello!');

      const queueItem = chatRepository.findQueueItemByChatId(chat.id, db);
      expect(queueItem).not.toBeNull();
      expect(queueItem?.chatId).toBe(chat.id);
      expect(queueItem?.workspaceId).toBe(workspace.id);
      expect(queueItem?.status).toBe('queued');
    });

    test('throws NotFoundError when chat does not exist', () => {
      expect(() => chatService.sendMessage('nonexistent', 'Hello!')).toThrow(NotFoundError);
    });
  });

  describe('addAgentMessage', () => {
    test('creates an agent message', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const chat = chatService.createChat({ workspaceId: workspace.id });

      const message = chatService.addAgentMessage(chat.id, 'Agent response');

      expect(message.id).toHaveLength(21);
      expect(message.chatId).toBe(chat.id);
      expect(message.role).toBe('agent');
      expect(message.message).toBe('Agent response');
      expect(message.actions).toBeNull();
    });

    test('creates an agent message with actions', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const chat = chatService.createChat({ workspaceId: workspace.id });

      const actions = [{ type: 'create_file', path: '/test.ts' }];
      const message = chatService.addAgentMessage(chat.id, 'Done!', actions);

      expect(message.actions).toEqual(actions);
    });

    test('throws NotFoundError when chat does not exist', () => {
      expect(() => chatService.addAgentMessage('nonexistent', 'Response')).toThrow(NotFoundError);
    });
  });

  describe('addSystemMessage', () => {
    test('creates a system message', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const chat = chatService.createChat({ workspaceId: workspace.id });

      const message = chatService.addSystemMessage(chat.id, 'System notification');

      expect(message.id).toHaveLength(21);
      expect(message.chatId).toBe(chat.id);
      expect(message.role).toBe('system');
      expect(message.message).toBe('System notification');
    });

    test('throws NotFoundError when chat does not exist', () => {
      expect(() => chatService.addSystemMessage('nonexistent', 'Message')).toThrow(NotFoundError);
    });
  });

  describe('getMessages', () => {
    test('returns empty array when no messages exist', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const chat = chatService.createChat({ workspaceId: workspace.id });

      const messages = chatService.getMessages(chat.id);

      expect(messages).toEqual([]);
    });

    test('returns all messages for chat in chronological order', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const chat = chatService.createChat({ workspaceId: workspace.id });

      chatService.sendMessage(chat.id, 'User message 1');
      Bun.sleepSync(10);
      chatService.addAgentMessage(chat.id, 'Agent response');
      Bun.sleepSync(10);
      chatService.sendMessage(chat.id, 'User message 2');

      const messages = chatService.getMessages(chat.id);

      expect(messages).toHaveLength(3);
      expect(messages[0]?.message).toBe('User message 1');
      expect(messages[0]?.role).toBe('user');
      expect(messages[1]?.message).toBe('Agent response');
      expect(messages[1]?.role).toBe('agent');
      expect(messages[2]?.message).toBe('User message 2');
      expect(messages[2]?.role).toBe('user');
    });

    test('throws NotFoundError when chat does not exist', () => {
      expect(() => chatService.getMessages('nonexistent')).toThrow(NotFoundError);
    });
  });

  describe('cancelProcessing', () => {
    test('marks queue item as failed', () => {
      const db = getTestDb();
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const chat = chatService.createChat({ workspaceId: workspace.id });

      chatService.sendMessage(chat.id, 'Hello!');
      const beforeCancel = chatRepository.findQueueItemByChatId(chat.id, db);
      expect(beforeCancel?.status).toBe('queued');

      chatService.cancelProcessing(chat.id);

      // Queue item should be marked as failed - need to query directly since findQueueItemByChatId only returns 'queued' status
      const queueItem = db
        .query<
          { status: string },
          [string]
        >('SELECT status FROM chat_queue WHERE chat_id = ? ORDER BY created_at DESC LIMIT 1')
        .get(chat.id);
      expect(queueItem?.status).toBe('failed');
    });

    test('adds system message about cancellation', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const chat = chatService.createChat({ workspaceId: workspace.id });
      chatService.sendMessage(chat.id, 'Hello!');

      chatService.cancelProcessing(chat.id);

      const messages = chatService.getMessages(chat.id);
      const systemMessage = messages.find((m) => m.role === 'system');
      expect(systemMessage).toBeTruthy();
      expect(systemMessage?.message).toBe('Processing cancelled by user');
    });

    test('throws NotFoundError when chat does not exist', () => {
      expect(() => chatService.cancelProcessing('nonexistent')).toThrow(NotFoundError);
    });
  });

  describe('canRenameChat', () => {
    test('returns true when no agent messages exist', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const chat = chatService.createChat({ workspaceId: workspace.id });

      expect(chatService.canRenameChat(chat.id)).toBe(true);
    });

    test('returns true with only user messages', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const chat = chatService.createChat({ workspaceId: workspace.id });
      chatService.sendMessage(chat.id, 'User message 1');
      chatService.sendMessage(chat.id, 'User message 2');

      expect(chatService.canRenameChat(chat.id)).toBe(true);
    });

    test('returns false after agent message', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const chat = chatService.createChat({ workspaceId: workspace.id });
      chatService.sendMessage(chat.id, 'User message');
      chatService.addAgentMessage(chat.id, 'Agent response');

      expect(chatService.canRenameChat(chat.id)).toBe(false);
    });

    test('returns true with system messages but no agent messages', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const chat = chatService.createChat({ workspaceId: workspace.id });
      chatService.addSystemMessage(chat.id, 'System message');

      expect(chatService.canRenameChat(chat.id)).toBe(true);
    });
  });

  describe('renameChat', () => {
    test('renames chat when no agent messages exist', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const chat = chatService.createChat({ workspaceId: workspace.id, title: 'Original' });

      chatService.renameChat(chat.id, 'Renamed');

      const retrieved = chatService.getChat(chat.id);
      expect(retrieved.title).toBe('Renamed');
    });

    test('silently ignores rename when agent messages exist', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const chat = chatService.createChat({ workspaceId: workspace.id, title: 'Original' });
      chatService.addAgentMessage(chat.id, 'Agent response');

      chatService.renameChat(chat.id, 'Renamed');

      const retrieved = chatService.getChat(chat.id);
      expect(retrieved.title).toBe('Original');
    });
  });

  describe('setCliOverride', () => {
    test('sets CLI override', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const chat = chatService.createChat({ workspaceId: workspace.id });

      chatService.setCliOverride(chat.id, 'gemini');

      const retrieved = chatService.getChat(chat.id);
      expect(retrieved.cliType).toBe('gemini');
    });

    test('clears CLI override with null', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const chat = chatService.createChat({ workspaceId: workspace.id, cliType: 'claude' });

      chatService.setCliOverride(chat.id, null);

      const retrieved = chatService.getChat(chat.id);
      expect(retrieved.cliType).toBeNull();
    });

    test('throws NotFoundError when chat does not exist', () => {
      expect(() => chatService.setCliOverride('nonexistent', 'claude')).toThrow(NotFoundError);
    });
  });

  describe('data integrity', () => {
    test('chat data persists correctly through service layer', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      const input = {
        workspaceId: workspace.id,
        title: 'Persistence Test',
        agentId: 'test-agent',
        cliType: 'claude' as const,
      };

      const created = chatService.createChat(input);
      const retrieved = chatService.getChat(created.id);

      expect(retrieved.workspaceId).toBe(input.workspaceId);
      expect(retrieved.title).toBe(input.title);
      expect(retrieved.agentId).toBe(input.agentId);
      expect(retrieved.cliType).toBe(input.cliType);
    });

    test('timestamps are set correctly', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const chat = chatService.createChat({
        workspaceId: workspace.id,
        title: 'Timestamp Test',
      });

      expect(chat.createdAt).toBeTruthy();
      expect(chat.updatedAt).toBeTruthy();

      expect(() => new Date(chat.createdAt)).not.toThrow();
      expect(() => new Date(chat.updatedAt)).not.toThrow();
    });

    test('message timestamps are set correctly', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const chat = chatService.createChat({ workspaceId: workspace.id });
      const message = chatService.sendMessage(chat.id, 'Test');

      expect(message.createdAt).toBeTruthy();
      expect(() => new Date(message.createdAt)).not.toThrow();
    });

    test('adding message updates chat updated_at', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const chat = chatService.createChat({ workspaceId: workspace.id });
      const originalUpdatedAt = chat.updatedAt;

      Bun.sleepSync(10);
      chatService.sendMessage(chat.id, 'Test');

      const retrieved = chatService.getChat(chat.id);
      expect(retrieved.updatedAt).not.toBe(originalUpdatedAt);
    });
  });

  describe('workspace deletion cascade', () => {
    test('chats are deleted when workspace is deleted', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      const chat = chatService.createChat({
        workspaceId: workspace.id,
        title: 'Will be deleted',
      });

      expect(chatService.getChat(chat.id)).toBeTruthy();

      workspaceService.deleteWorkspace(workspace.id);

      expect(() => chatService.getChat(chat.id)).toThrow(NotFoundError);
    });

    test('chat messages are deleted when workspace is deleted', () => {
      const db = getTestDb();
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      const chat = chatService.createChat({
        workspaceId: workspace.id,
        title: 'With Messages',
      });

      chatService.sendMessage(chat.id, 'Message 1');
      chatService.sendMessage(chat.id, 'Message 2');

      expect(chatService.getMessages(chat.id)).toHaveLength(2);

      workspaceService.deleteWorkspace(workspace.id);

      const remainingMessages = db
        .query('SELECT * FROM chat_messages WHERE chat_id = ?')
        .all(chat.id);
      expect(remainingMessages).toHaveLength(0);
    });

    test('chat queue items are deleted when workspace is deleted', () => {
      const db = getTestDb();
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      const chat = chatService.createChat({
        workspaceId: workspace.id,
        title: 'With Queue Item',
      });

      chatService.sendMessage(chat.id, 'Hello!');

      expect(chatRepository.findQueueItemByChatId(chat.id, db)).not.toBeNull();

      workspaceService.deleteWorkspace(workspace.id);

      const remainingQueueItems = db
        .query('SELECT * FROM chat_queue WHERE workspace_id = ?')
        .all(workspace.id);
      expect(remainingQueueItems).toHaveLength(0);
    });
  });
});
