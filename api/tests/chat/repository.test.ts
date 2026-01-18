import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test';

import * as chatRepository from '../../src/chat/repository.ts';
import * as workspaceService from '../../src/workspace/service.ts';
import { cleanupTestDb, clearTables, getTestDb, setupTestDb } from '../helpers/index.ts';

describe('chat repository integration', () => {
  beforeAll(() => {
    setupTestDb();
  });

  afterEach(() => {
    clearTables();
  });

  afterAll(() => {
    cleanupTestDb();
  });

  describe('Chat Operations', () => {
    describe('create', () => {
      test('creates a chat with required fields', () => {
        const db = getTestDb();
        const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

        const chat = chatRepository.create({ workspaceId: workspace.id }, db);

        expect(chat.id).toHaveLength(21);
        expect(chat.workspaceId).toBe(workspace.id);
        expect(chat.title).toBe('New Chat');
        expect(chat.agentId).toBeNull();
        expect(chat.cliType).toBeNull();
      });

      test('creates a chat with all optional fields', () => {
        const db = getTestDb();
        const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

        const chat = chatRepository.create(
          {
            workspaceId: workspace.id,
            title: 'Custom Title',
            agentId: 'agent-123',
            cliType: 'claude',
          },
          db
        );

        expect(chat.title).toBe('Custom Title');
        expect(chat.agentId).toBe('agent-123');
        expect(chat.cliType).toBe('claude');
      });
    });

    describe('findById', () => {
      test('returns chat when it exists', () => {
        const db = getTestDb();
        const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
        const created = chatRepository.create({ workspaceId: workspace.id, title: 'Test' }, db);

        const found = chatRepository.findById(created.id, db);

        expect(found).not.toBeNull();
        expect(found?.id).toBe(created.id);
        expect(found?.title).toBe('Test');
      });

      test('returns null when chat does not exist', () => {
        const db = getTestDb();

        const found = chatRepository.findById('nonexistent', db);

        expect(found).toBeNull();
      });
    });

    describe('findByWorkspaceId', () => {
      test('returns all chats in workspace ordered by updated_at desc', () => {
        const db = getTestDb();
        const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

        chatRepository.create({ workspaceId: workspace.id, title: 'Chat A' }, db);
        Bun.sleepSync(10);
        chatRepository.create({ workspaceId: workspace.id, title: 'Chat B' }, db);
        Bun.sleepSync(10);
        chatRepository.create({ workspaceId: workspace.id, title: 'Chat C' }, db);

        const chats = chatRepository.findByWorkspaceId(workspace.id, db);

        expect(chats).toHaveLength(3);
        expect(chats[0]?.title).toBe('Chat C');
        expect(chats[1]?.title).toBe('Chat B');
        expect(chats[2]?.title).toBe('Chat A');
      });

      test('returns empty array when no chats exist', () => {
        const db = getTestDb();
        const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

        const chats = chatRepository.findByWorkspaceId(workspace.id, db);

        expect(chats).toEqual([]);
      });
    });

    describe('search', () => {
      test('finds chats by partial title match', () => {
        const db = getTestDb();
        const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

        chatRepository.create({ workspaceId: workspace.id, title: 'Hello World' }, db);
        chatRepository.create({ workspaceId: workspace.id, title: 'World News' }, db);
        chatRepository.create({ workspaceId: workspace.id, title: 'Goodbye' }, db);

        const results = chatRepository.search(workspace.id, 'World', db);

        expect(results).toHaveLength(2);
        const titles = results.map((c) => c.title);
        expect(titles).toContain('Hello World');
        expect(titles).toContain('World News');
      });

      test('returns empty array when no chats match', () => {
        const db = getTestDb();
        const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

        chatRepository.create({ workspaceId: workspace.id, title: 'Hello' }, db);

        const results = chatRepository.search(workspace.id, 'Nonexistent', db);

        expect(results).toEqual([]);
      });
    });

    describe('update', () => {
      test('updates chat title', () => {
        const db = getTestDb();
        const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
        const created = chatRepository.create(
          { workspaceId: workspace.id, title: 'Original' },
          db
        );

        const updated = chatRepository.update(created.id, { title: 'Updated' }, db);

        expect(updated?.title).toBe('Updated');
      });

      test('updates chat agentId', () => {
        const db = getTestDb();
        const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
        const created = chatRepository.create({ workspaceId: workspace.id }, db);

        const updated = chatRepository.update(created.id, { agentId: 'new-agent' }, db);

        expect(updated?.agentId).toBe('new-agent');
      });

      test('updates chat cliType', () => {
        const db = getTestDb();
        const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
        const created = chatRepository.create({ workspaceId: workspace.id }, db);

        const updated = chatRepository.update(created.id, { cliType: 'gemini' }, db);

        expect(updated?.cliType).toBe('gemini');
      });

      test('returns null when chat does not exist', () => {
        const db = getTestDb();

        const updated = chatRepository.update('nonexistent', { title: 'Test' }, db);

        expect(updated).toBeNull();
      });

      test('updates updated_at timestamp', () => {
        const db = getTestDb();
        const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
        const created = chatRepository.create({ workspaceId: workspace.id }, db);
        const originalUpdatedAt = created.updatedAt;

        Bun.sleepSync(10);
        const updated = chatRepository.update(created.id, { title: 'New Title' }, db);

        expect(updated?.updatedAt).not.toBe(originalUpdatedAt);
      });
    });

    describe('remove', () => {
      test('removes existing chat and returns true', () => {
        const db = getTestDb();
        const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
        const created = chatRepository.create({ workspaceId: workspace.id }, db);

        const result = chatRepository.remove(created.id, db);

        expect(result).toBe(true);
        expect(chatRepository.findById(created.id, db)).toBeNull();
      });

      test('returns false when chat does not exist', () => {
        const db = getTestDb();

        const result = chatRepository.remove('nonexistent', db);

        expect(result).toBe(false);
      });
    });

    describe('countAgentMessages', () => {
      test('returns 0 when no messages exist', () => {
        const db = getTestDb();
        const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
        const chat = chatRepository.create({ workspaceId: workspace.id }, db);

        const count = chatRepository.countAgentMessages(chat.id, db);

        expect(count).toBe(0);
      });

      test('returns 0 when only user messages exist', () => {
        const db = getTestDb();
        const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
        const chat = chatRepository.create({ workspaceId: workspace.id }, db);

        chatRepository.createMessage({ chatId: chat.id, role: 'user', message: 'Hello' }, db);
        chatRepository.createMessage({ chatId: chat.id, role: 'user', message: 'Hi again' }, db);

        const count = chatRepository.countAgentMessages(chat.id, db);

        expect(count).toBe(0);
      });

      test('counts agent messages correctly', () => {
        const db = getTestDb();
        const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
        const chat = chatRepository.create({ workspaceId: workspace.id }, db);

        chatRepository.createMessage({ chatId: chat.id, role: 'user', message: 'Hello' }, db);
        chatRepository.createMessage({ chatId: chat.id, role: 'agent', message: 'Hi!' }, db);
        chatRepository.createMessage({ chatId: chat.id, role: 'user', message: 'Help me' }, db);
        chatRepository.createMessage({ chatId: chat.id, role: 'agent', message: 'Sure!' }, db);
        chatRepository.createMessage({ chatId: chat.id, role: 'system', message: 'Done' }, db);

        const count = chatRepository.countAgentMessages(chat.id, db);

        expect(count).toBe(2);
      });
    });
  });

  describe('Message Operations', () => {
    describe('createMessage', () => {
      test('creates a message with required fields', () => {
        const db = getTestDb();
        const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
        const chat = chatRepository.create({ workspaceId: workspace.id }, db);

        const message = chatRepository.createMessage(
          {
            chatId: chat.id,
            role: 'user',
            message: 'Hello!',
          },
          db
        );

        expect(message.id).toHaveLength(21);
        expect(message.chatId).toBe(chat.id);
        expect(message.role).toBe('user');
        expect(message.message).toBe('Hello!');
        expect(message.actions).toBeNull();
      });

      test('creates a message with actions', () => {
        const db = getTestDb();
        const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
        const chat = chatRepository.create({ workspaceId: workspace.id }, db);

        const actions = [{ type: 'create_file', path: '/test.ts' }];
        const message = chatRepository.createMessage(
          {
            chatId: chat.id,
            role: 'agent',
            message: 'Done!',
            actions,
          },
          db
        );

        expect(message.actions).toEqual(actions);
      });

      test('updates chat updated_at timestamp', () => {
        const db = getTestDb();
        const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
        const chat = chatRepository.create({ workspaceId: workspace.id }, db);
        const originalUpdatedAt = chat.updatedAt;

        Bun.sleepSync(10);
        chatRepository.createMessage(
          {
            chatId: chat.id,
            role: 'user',
            message: 'Hello',
          },
          db
        );

        const updatedChat = chatRepository.findById(chat.id, db);
        expect(updatedChat?.updatedAt).not.toBe(originalUpdatedAt);
      });
    });

    describe('findMessagesByChatId', () => {
      test('returns messages in chronological order', () => {
        const db = getTestDb();
        const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
        const chat = chatRepository.create({ workspaceId: workspace.id }, db);

        chatRepository.createMessage({ chatId: chat.id, role: 'user', message: 'First' }, db);
        Bun.sleepSync(10);
        chatRepository.createMessage({ chatId: chat.id, role: 'agent', message: 'Second' }, db);
        Bun.sleepSync(10);
        chatRepository.createMessage({ chatId: chat.id, role: 'user', message: 'Third' }, db);

        const messages = chatRepository.findMessagesByChatId(chat.id, db);

        expect(messages).toHaveLength(3);
        expect(messages[0]?.message).toBe('First');
        expect(messages[1]?.message).toBe('Second');
        expect(messages[2]?.message).toBe('Third');
      });

      test('returns empty array when no messages exist', () => {
        const db = getTestDb();
        const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
        const chat = chatRepository.create({ workspaceId: workspace.id }, db);

        const messages = chatRepository.findMessagesByChatId(chat.id, db);

        expect(messages).toEqual([]);
      });

      test('parses actions JSON correctly', () => {
        const db = getTestDb();
        const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
        const chat = chatRepository.create({ workspaceId: workspace.id }, db);

        const actions = [
          { type: 'create_file', path: '/test.ts' },
          { type: 'edit_file', path: '/other.ts' },
        ];
        chatRepository.createMessage(
          {
            chatId: chat.id,
            role: 'agent',
            message: 'Done',
            actions,
          },
          db
        );

        const messages = chatRepository.findMessagesByChatId(chat.id, db);

        expect(messages[0]?.actions).toEqual(actions);
      });
    });
  });

  describe('Queue Operations', () => {
    describe('createQueueItem', () => {
      test('creates a queue item with queued status', () => {
        const db = getTestDb();
        const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
        const chat = chatRepository.create({ workspaceId: workspace.id }, db);

        const queueItem = chatRepository.createQueueItem(
          {
            chatId: chat.id,
            workspaceId: workspace.id,
          },
          db
        );

        expect(queueItem.id).toHaveLength(21);
        expect(queueItem.chatId).toBe(chat.id);
        expect(queueItem.workspaceId).toBe(workspace.id);
        expect(queueItem.status).toBe('queued');
      });
    });

    describe('findQueuedItems', () => {
      test('returns all queued items ordered by created_at', () => {
        const db = getTestDb();
        const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

        const chat1 = chatRepository.create({ workspaceId: workspace.id, title: 'Chat 1' }, db);
        Bun.sleepSync(10);
        const chat2 = chatRepository.create({ workspaceId: workspace.id, title: 'Chat 2' }, db);
        Bun.sleepSync(10);
        const chat3 = chatRepository.create({ workspaceId: workspace.id, title: 'Chat 3' }, db);

        chatRepository.createQueueItem({ chatId: chat1.id, workspaceId: workspace.id }, db);
        Bun.sleepSync(10);
        chatRepository.createQueueItem({ chatId: chat2.id, workspaceId: workspace.id }, db);
        Bun.sleepSync(10);
        chatRepository.createQueueItem({ chatId: chat3.id, workspaceId: workspace.id }, db);

        const items = chatRepository.findQueuedItems(db);

        expect(items).toHaveLength(3);
        expect(items[0]?.chatId).toBe(chat1.id);
        expect(items[1]?.chatId).toBe(chat2.id);
        expect(items[2]?.chatId).toBe(chat3.id);
      });

      test('returns empty array when no queued items exist', () => {
        const db = getTestDb();

        const items = chatRepository.findQueuedItems(db);

        expect(items).toEqual([]);
      });
    });

    describe('findQueueItemByChatId', () => {
      test('returns queue item for chat', () => {
        const db = getTestDb();
        const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
        const chat = chatRepository.create({ workspaceId: workspace.id }, db);
        chatRepository.createQueueItem({ chatId: chat.id, workspaceId: workspace.id }, db);

        const queueItem = chatRepository.findQueueItemByChatId(chat.id, db);

        expect(queueItem).not.toBeNull();
        expect(queueItem?.chatId).toBe(chat.id);
        expect(queueItem?.status).toBe('queued');
      });

      test('returns null when no queued item exists', () => {
        const db = getTestDb();
        const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
        const chat = chatRepository.create({ workspaceId: workspace.id }, db);

        const queueItem = chatRepository.findQueueItemByChatId(chat.id, db);

        expect(queueItem).toBeNull();
      });

      test('returns null when item is not in queued status', () => {
        const db = getTestDb();
        const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
        const chat = chatRepository.create({ workspaceId: workspace.id }, db);
        const item = chatRepository.createQueueItem(
          { chatId: chat.id, workspaceId: workspace.id },
          db
        );
        chatRepository.updateQueueStatus(item.id, 'completed', db);

        const queueItem = chatRepository.findQueueItemByChatId(chat.id, db);

        expect(queueItem).toBeNull();
      });
    });

    describe('updateQueueStatus', () => {
      test('updates queue item status', () => {
        const db = getTestDb();
        const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
        const chat = chatRepository.create({ workspaceId: workspace.id }, db);
        const item = chatRepository.createQueueItem(
          { chatId: chat.id, workspaceId: workspace.id },
          db
        );

        chatRepository.updateQueueStatus(item.id, 'in_progress', db);

        const row = db
          .query<{ status: string }, [string]>('SELECT status FROM chat_queue WHERE id = ?')
          .get(item.id);
        expect(row?.status).toBe('in_progress');
      });

      test('updates queue item updated_at timestamp', () => {
        const db = getTestDb();
        const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
        const chat = chatRepository.create({ workspaceId: workspace.id }, db);
        const item = chatRepository.createQueueItem(
          { chatId: chat.id, workspaceId: workspace.id },
          db
        );
        const originalUpdatedAt = item.updatedAt;

        Bun.sleepSync(10);
        chatRepository.updateQueueStatus(item.id, 'completed', db);

        const row = db
          .query<{ updated_at: string }, [string]>('SELECT updated_at FROM chat_queue WHERE id = ?')
          .get(item.id);
        expect(row?.updated_at).not.toBe(originalUpdatedAt);
      });
    });

    describe('deleteOldQueueItems', () => {
      test('deletes completed items older than specified days', () => {
        const db = getTestDb();
        const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
        const chat = chatRepository.create({ workspaceId: workspace.id }, db);
        const item = chatRepository.createQueueItem(
          { chatId: chat.id, workspaceId: workspace.id },
          db
        );

        // Mark as completed and set old timestamp
        chatRepository.updateQueueStatus(item.id, 'completed', db);
        const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
        db.query('UPDATE chat_queue SET updated_at = ? WHERE id = ?').run(oldDate, item.id);

        const deleted = chatRepository.deleteOldQueueItems(7, db);

        expect(deleted).toBe(1);
      });

      test('deletes failed items older than specified days', () => {
        const db = getTestDb();
        const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
        const chat = chatRepository.create({ workspaceId: workspace.id }, db);
        const item = chatRepository.createQueueItem(
          { chatId: chat.id, workspaceId: workspace.id },
          db
        );

        // Mark as failed and set old timestamp
        chatRepository.updateQueueStatus(item.id, 'failed', db);
        const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
        db.query('UPDATE chat_queue SET updated_at = ? WHERE id = ?').run(oldDate, item.id);

        const deleted = chatRepository.deleteOldQueueItems(7, db);

        expect(deleted).toBe(1);
      });

      test('does not delete queued items', () => {
        const db = getTestDb();
        const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
        const chat = chatRepository.create({ workspaceId: workspace.id }, db);
        const item = chatRepository.createQueueItem(
          { chatId: chat.id, workspaceId: workspace.id },
          db
        );

        // Set old timestamp but keep queued status
        const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
        db.query('UPDATE chat_queue SET updated_at = ? WHERE id = ?').run(oldDate, item.id);

        const deleted = chatRepository.deleteOldQueueItems(7, db);

        expect(deleted).toBe(0);
        expect(chatRepository.findQueueItemByChatId(chat.id, db)).not.toBeNull();
      });

      test('does not delete recent completed items', () => {
        const db = getTestDb();
        const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
        const chat = chatRepository.create({ workspaceId: workspace.id }, db);
        const item = chatRepository.createQueueItem(
          { chatId: chat.id, workspaceId: workspace.id },
          db
        );

        chatRepository.updateQueueStatus(item.id, 'completed', db);

        const deleted = chatRepository.deleteOldQueueItems(7, db);

        expect(deleted).toBe(0);
      });
    });
  });

  describe('Cascade Delete', () => {
    test('deleting chat removes messages', () => {
      const db = getTestDb();
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const chat = chatRepository.create({ workspaceId: workspace.id }, db);

      chatRepository.createMessage({ chatId: chat.id, role: 'user', message: 'Hello' }, db);
      chatRepository.createMessage({ chatId: chat.id, role: 'agent', message: 'Hi!' }, db);

      chatRepository.remove(chat.id, db);

      const messages = db
        .query('SELECT * FROM chat_messages WHERE chat_id = ?')
        .all(chat.id);
      expect(messages).toHaveLength(0);
    });

    test('deleting workspace removes chats and messages', () => {
      const db = getTestDb();
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const chat = chatRepository.create({ workspaceId: workspace.id }, db);

      chatRepository.createMessage({ chatId: chat.id, role: 'user', message: 'Hello' }, db);

      workspaceService.deleteWorkspace(workspace.id);

      expect(chatRepository.findById(chat.id, db)).toBeNull();
      const messages = db
        .query('SELECT * FROM chat_messages WHERE chat_id = ?')
        .all(chat.id);
      expect(messages).toHaveLength(0);
    });

    test('deleting workspace removes queue items', () => {
      const db = getTestDb();
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const chat = chatRepository.create({ workspaceId: workspace.id }, db);
      chatRepository.createQueueItem({ chatId: chat.id, workspaceId: workspace.id }, db);

      workspaceService.deleteWorkspace(workspace.id);

      const queueItems = db
        .query('SELECT * FROM chat_queue WHERE workspace_id = ?')
        .all(workspace.id);
      expect(queueItems).toHaveLength(0);
    });
  });
});
