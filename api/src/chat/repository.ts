import type { Database } from 'bun:sqlite';

import { getDb } from '../core/database.ts';
import type { QueueStatus } from '../core/types.ts';
import { generateId, now } from '../shared/index.ts';
import type {
  Chat,
  ChatMessage,
  ChatMessageRow,
  ChatQueueItem,
  ChatQueueItemRow,
  ChatRow,
  CreateChatInput,
  CreateChatMessageInput,
  CreateChatQueueItemInput,
  UpdateChatInput,
} from './types.ts';
import { rowToChat, rowToChatMessage, rowToChatQueueItem } from './types.ts';

// ============================================
// Chat Operations
// ============================================

export function findByWorkspaceId(workspaceId: string, db: Database = getDb()): Chat[] {
  const rows = db
    .query<ChatRow, [string]>('SELECT * FROM chats WHERE workspace_id = ? ORDER BY updated_at DESC')
    .all(workspaceId);
  return rows.map(rowToChat);
}

export function findById(id: string, db: Database = getDb()): Chat | null {
  const row = db.query<ChatRow, [string]>('SELECT * FROM chats WHERE id = ?').get(id);
  return row ? rowToChat(row) : null;
}

export function search(workspaceId: string, query: string, db: Database = getDb()): Chat[] {
  const rows = db
    .query<
      ChatRow,
      [string, string]
    >('SELECT * FROM chats WHERE workspace_id = ? AND title LIKE ? ORDER BY updated_at DESC')
    .all(workspaceId, `%${query}%`);
  return rows.map(rowToChat);
}

export function create(input: CreateChatInput, db: Database = getDb()): Chat {
  const id = generateId();
  const timestamp = now();

  const row: ChatRow = {
    id,
    workspace_id: input.workspaceId,
    agent_id: input.agentId ?? null,
    cli_type: input.cliType ?? null,
    title: input.title ?? 'New Chat',
    created_at: timestamp,
    updated_at: timestamp,
  };

  db.query(
    `INSERT INTO chats (id, workspace_id, agent_id, cli_type, title, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.id,
    row.workspace_id,
    row.agent_id,
    row.cli_type,
    row.title,
    row.created_at,
    row.updated_at
  );

  return rowToChat(row);
}

export function update(id: string, input: UpdateChatInput, db: Database = getDb()): Chat | null {
  const existing = findById(id, db);
  if (!existing) {
    return null;
  }

  const timestamp = now();
  const updates: string[] = ['updated_at = ?'];
  const values: unknown[] = [timestamp];

  if (input.title !== undefined) {
    updates.push('title = ?');
    values.push(input.title);
  }

  if (input.agentId !== undefined) {
    updates.push('agent_id = ?');
    values.push(input.agentId);
  }

  if (input.cliType !== undefined) {
    updates.push('cli_type = ?');
    values.push(input.cliType);
  }

  values.push(id);
  db.query(`UPDATE chats SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  return findById(id, db);
}

export function remove(id: string, db: Database = getDb()): boolean {
  const result = db.query('DELETE FROM chats WHERE id = ?').run(id);
  return result.changes > 0;
}

export function countAgentMessages(chatId: string, db: Database = getDb()): number {
  const result = db
    .query<
      { count: number },
      [string, string]
    >('SELECT COUNT(*) as count FROM chat_messages WHERE chat_id = ? AND role = ?')
    .get(chatId, 'agent');
  return result?.count ?? 0;
}

// ============================================
// Chat Message Operations
// ============================================

export function findMessagesByChatId(chatId: string, db: Database = getDb()): ChatMessage[] {
  const rows = db
    .query<
      ChatMessageRow,
      [string]
    >('SELECT * FROM chat_messages WHERE chat_id = ? ORDER BY created_at ASC')
    .all(chatId);
  return rows.map(rowToChatMessage);
}

export function createMessage(input: CreateChatMessageInput, db: Database = getDb()): ChatMessage {
  const id = generateId();
  const timestamp = now();

  const row: ChatMessageRow = {
    id,
    chat_id: input.chatId,
    role: input.role,
    message: input.message,
    actions: input.actions ? JSON.stringify(input.actions) : null,
    created_at: timestamp,
  };

  db.query(
    `INSERT INTO chat_messages (id, chat_id, role, message, actions, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(row.id, row.chat_id, row.role, row.message, row.actions, row.created_at);

  // Update chat's updated_at timestamp
  db.query('UPDATE chats SET updated_at = ? WHERE id = ?').run(timestamp, input.chatId);

  return rowToChatMessage(row);
}

// ============================================
// Chat Queue Operations
// ============================================

export function findQueuedItems(db: Database = getDb()): ChatQueueItem[] {
  const rows = db
    .query<
      ChatQueueItemRow,
      [string]
    >('SELECT * FROM chat_queue WHERE status = ? ORDER BY created_at ASC')
    .all('queued');
  return rows.map(rowToChatQueueItem);
}

export function findQueueItemByChatId(
  chatId: string,
  db: Database = getDb()
): ChatQueueItem | null {
  const row = db
    .query<
      ChatQueueItemRow,
      [string, string]
    >('SELECT * FROM chat_queue WHERE chat_id = ? AND status = ?')
    .get(chatId, 'queued');
  return row ? rowToChatQueueItem(row) : null;
}

export function createQueueItem(
  input: CreateChatQueueItemInput,
  db: Database = getDb()
): ChatQueueItem {
  const id = generateId();
  const timestamp = now();

  const row: ChatQueueItemRow = {
    id,
    chat_id: input.chatId,
    workspace_id: input.workspaceId,
    status: 'queued',
    created_at: timestamp,
    updated_at: timestamp,
  };

  db.query(
    `INSERT INTO chat_queue (id, chat_id, workspace_id, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(row.id, row.chat_id, row.workspace_id, row.status, row.created_at, row.updated_at);

  return rowToChatQueueItem(row);
}

export function updateQueueStatus(id: string, status: QueueStatus, db: Database = getDb()): void {
  const timestamp = now();
  db.query('UPDATE chat_queue SET status = ?, updated_at = ? WHERE id = ?').run(
    status,
    timestamp,
    id
  );
}

export function deleteOldQueueItems(days: number, db: Database = getDb()): number {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const result = db
    .query('DELETE FROM chat_queue WHERE (status = ? OR status = ?) AND updated_at < ?')
    .run('completed', 'failed', cutoffDate);
  return result.changes;
}
