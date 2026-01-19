import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Database } from 'bun:sqlite';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { closeDb, resetDb } from '../core/database.ts';
import { generateId, now } from '../shared/index.ts';
import * as repository from './repository.ts';

describe('chat repository', () => {
  let db: Database;
  let workspaceId: string;

  beforeEach(() => {
    db = new Database(':memory:');
    // Run migrations
    const migration001 = readFileSync(
      join(process.cwd(), 'migrations/001_workspaces_agents.sql'),
      'utf-8'
    );
    const migration003 = readFileSync(join(process.cwd(), 'migrations/003_chats.sql'), 'utf-8');
    db.exec(migration001);
    db.exec(migration003);

    // Create a workspace
    workspaceId = generateId();
    const timestamp = now();
    db.query(
      `INSERT INTO workspaces (id, title, description, working_directory_mode, last_activity_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(workspaceId, 'Test Workspace', '', 'temp', timestamp, timestamp, timestamp);
  });

  afterEach(() => {
    closeDb();
    resetDb();
    db.close();
  });

  describe('chat CRUD', () => {
    test('creates a chat', () => {
      const chat = repository.create({ workspaceId }, db);

      expect(chat.id).toHaveLength(21);
      expect(chat.title).toBe('New Chat');
      expect(chat.workspaceId).toBe(workspaceId);
      expect(chat.agentId).toBeNull();
      expect(chat.cliType).toBeNull();
    });

    test('creates chat with all options', () => {
      const chat = repository.create(
        {
          workspaceId,
          agentId: 'agent123',
          cliType: 'claude',
          title: 'My Chat',
        },
        db
      );

      expect(chat.title).toBe('My Chat');
      expect(chat.agentId).toBe('agent123');
      expect(chat.cliType).toBe('claude');
    });

    test('finds chat by id', () => {
      const created = repository.create({ workspaceId, title: 'Find Me' }, db);
      const found = repository.findById(created.id, db);

      expect(found).not.toBeNull();
      expect(found?.title).toBe('Find Me');
    });

    test('returns null for non-existent chat', () => {
      const found = repository.findById('nonexistent', db);
      expect(found).toBeNull();
    });

    test('finds chats by workspace', () => {
      repository.create({ workspaceId, title: 'Chat 1' }, db);
      repository.create({ workspaceId, title: 'Chat 2' }, db);

      const chats = repository.findByWorkspaceId(workspaceId, db);
      expect(chats).toHaveLength(2);
    });

    test('searches chats by title', () => {
      repository.create({ workspaceId, title: 'Hello World' }, db);
      repository.create({ workspaceId, title: 'Goodbye' }, db);

      const results = repository.search(workspaceId, 'Hello', db);
      expect(results).toHaveLength(1);
      expect(results[0]?.title).toBe('Hello World');
    });

    test('updates chat', () => {
      const created = repository.create({ workspaceId, title: 'Original' }, db);
      const updated = repository.update(created.id, { title: 'Updated' }, db);

      expect(updated?.title).toBe('Updated');
    });

    test('removes chat', () => {
      const created = repository.create({ workspaceId, title: 'Delete Me' }, db);
      const result = repository.remove(created.id, db);

      expect(result).toBe(true);
      expect(repository.findById(created.id, db)).toBeNull();
    });

    test('counts agent messages', () => {
      const chat = repository.create({ workspaceId }, db);

      repository.createMessage({ chatId: chat.id, role: 'user', message: 'Hello' }, db);
      repository.createMessage({ chatId: chat.id, role: 'agent', message: 'Hi there' }, db);
      repository.createMessage({ chatId: chat.id, role: 'user', message: 'Thanks' }, db);

      const count = repository.countAgentMessages(chat.id, db);
      expect(count).toBe(1);
    });
  });

  describe('chat messages', () => {
    test('creates and finds messages', () => {
      const chat = repository.create({ workspaceId }, db);

      repository.createMessage({ chatId: chat.id, role: 'user', message: 'Hello' }, db);
      repository.createMessage(
        {
          chatId: chat.id,
          role: 'agent',
          message: 'Hi there',
          actions: [{ type: 'test' }],
        },
        db
      );

      const messages = repository.findMessagesByChatId(chat.id, db);
      expect(messages).toHaveLength(2);
      // Check that we have one of each role
      const roles = messages.map((m) => m.role);
      expect(roles).toContain('user');
      expect(roles).toContain('agent');
      // Check that the agent message has actions
      const agentMessage = messages.find((m) => m.role === 'agent');
      expect(agentMessage?.actions).toEqual([{ type: 'test' }]);
    });

    test('updates chat updated_at when adding message', () => {
      const chat = repository.create({ workspaceId }, db);

      // Manually set an old timestamp
      db.query('UPDATE chats SET updated_at = ? WHERE id = ?').run(
        '2020-01-01T00:00:00.000Z',
        chat.id
      );

      repository.createMessage({ chatId: chat.id, role: 'user', message: 'Hello' }, db);

      const updated = repository.findById(chat.id, db);
      expect(updated?.updatedAt).not.toBe('2020-01-01T00:00:00.000Z');
    });
  });

  describe('chat queue', () => {
    test('creates and finds queue items', () => {
      const chat = repository.create({ workspaceId }, db);
      const queueItem = repository.createQueueItem({ chatId: chat.id, workspaceId }, db);

      expect(queueItem.status).toBe('queued');

      const found = repository.findQueueItemByChatId(chat.id, db);
      expect(found?.id).toBe(queueItem.id);
    });

    test('finds all queued items', () => {
      const chat1 = repository.create({ workspaceId }, db);
      const chat2 = repository.create({ workspaceId }, db);

      repository.createQueueItem({ chatId: chat1.id, workspaceId }, db);
      repository.createQueueItem({ chatId: chat2.id, workspaceId }, db);

      const queued = repository.findQueuedItems(db);
      expect(queued).toHaveLength(2);
    });

    test('updates queue status', () => {
      const chat = repository.create({ workspaceId }, db);
      const queueItem = repository.createQueueItem({ chatId: chat.id, workspaceId }, db);

      repository.updateQueueStatus(queueItem.id, 'in_progress', db);

      // Should not find it as queued anymore
      const found = repository.findQueueItemByChatId(chat.id, db);
      expect(found).toBeNull();
    });
  });
});
