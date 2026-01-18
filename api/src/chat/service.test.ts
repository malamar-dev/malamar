import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Database } from 'bun:sqlite';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { initDb, resetDb } from '../core/database.ts';
import { NotFoundError } from '../core/errors.ts';
import { generateId, now } from '../shared/index.ts';
import * as service from './service.ts';

describe('chat service', () => {
  let db: Database;
  let workspaceId: string;

  beforeEach(() => {
    resetDb();
    db = initDb(':memory:');
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
    db.close();
    resetDb();
  });

  describe('createChat', () => {
    test('creates a chat', () => {
      const chat = service.createChat({ workspaceId });
      expect(chat.title).toBe('New Chat');
      expect(chat.workspaceId).toBe(workspaceId);
    });
  });

  describe('getChat', () => {
    test('returns chat when found', () => {
      const created = service.createChat({ workspaceId, title: 'Test' });
      const found = service.getChat(created.id);
      expect(found.title).toBe('Test');
    });

    test('throws NotFoundError when not found', () => {
      expect(() => service.getChat('nonexistent')).toThrow(NotFoundError);
    });
  });

  describe('updateChat', () => {
    test('updates chat', () => {
      const created = service.createChat({ workspaceId, title: 'Original' });
      const updated = service.updateChat(created.id, { title: 'Updated' });
      expect(updated.title).toBe('Updated');
    });
  });

  describe('deleteChat', () => {
    test('deletes chat', () => {
      const created = service.createChat({ workspaceId, title: 'Delete Me' });
      service.deleteChat(created.id);
      expect(() => service.getChat(created.id)).toThrow(NotFoundError);
    });
  });

  describe('sendMessage', () => {
    test('creates user message and queue item', () => {
      const chat = service.createChat({ workspaceId });
      const message = service.sendMessage(chat.id, 'Hello');

      expect(message.role).toBe('user');
      expect(message.message).toBe('Hello');

      const messages = service.getMessages(chat.id);
      expect(messages).toHaveLength(1);
    });
  });

  describe('addAgentMessage', () => {
    test('creates agent message with actions', () => {
      const chat = service.createChat({ workspaceId });
      const message = service.addAgentMessage(chat.id, 'Response', [{ type: 'test' }]);

      expect(message.role).toBe('agent');
      expect(message.actions).toEqual([{ type: 'test' }]);
    });
  });

  describe('canRenameChat', () => {
    test('returns true when no agent messages', () => {
      const chat = service.createChat({ workspaceId });
      service.sendMessage(chat.id, 'User message');
      expect(service.canRenameChat(chat.id)).toBe(true);
    });

    test('returns false after agent message', () => {
      const chat = service.createChat({ workspaceId });
      service.addAgentMessage(chat.id, 'Agent response');
      expect(service.canRenameChat(chat.id)).toBe(false);
    });
  });

  describe('cancelProcessing', () => {
    test('adds system message', () => {
      const chat = service.createChat({ workspaceId });
      service.cancelProcessing(chat.id);

      const messages = service.getMessages(chat.id);
      expect(messages.some((m) => m.role === 'system' && m.message.includes('cancelled'))).toBe(
        true
      );
    });
  });

  describe('searchChats', () => {
    test('finds chats by title', () => {
      service.createChat({ workspaceId, title: 'Hello World' });
      service.createChat({ workspaceId, title: 'Goodbye' });

      const results = service.searchChats(workspaceId, 'Hello');
      expect(results).toHaveLength(1);
    });
  });
});
