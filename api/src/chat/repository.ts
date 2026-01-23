import type { CliType } from "../agent/types";
import { getDatabase } from "../core";
import type {
  Chat,
  ChatAction,
  ChatMessage,
  ChatMessageRole,
  ChatMessageRow,
  ChatQueueItem,
  ChatQueueRow,
  ChatQueueStatus,
  ChatRow,
  PaginatedResult,
} from "./types";

/**
 * Escape special LIKE pattern characters (%, _, \) for literal matching.
 * Uses backslash as the escape character.
 */
function escapeLikePattern(str: string): string {
  return str.replace(/[%_\\]/g, "\\$&");
}

/**
 * Convert a database row to a Chat entity.
 */
function rowToChat(row: ChatRow): Chat {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    agentId: row.agent_id,
    cliType: row.cli_type as CliType | null,
    title: row.title,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Convert a database row to a ChatMessage entity.
 * Parses the actions JSON field if present.
 */
function rowToMessage(row: ChatMessageRow): ChatMessage {
  let actions: ChatAction[] | null = null;
  if (row.actions) {
    try {
      actions = JSON.parse(row.actions) as ChatAction[];
    } catch {
      // If JSON parsing fails, leave actions as null
      actions = null;
    }
  }

  return {
    id: row.id,
    chatId: row.chat_id,
    role: row.role as ChatMessageRole,
    message: row.message,
    actions,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Convert a database row to a ChatQueueItem entity.
 */
function rowToQueueItem(row: ChatQueueRow): ChatQueueItem {
  return {
    id: row.id,
    chatId: row.chat_id,
    workspaceId: row.workspace_id,
    status: row.status as ChatQueueStatus,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Count total chats for a workspace, optionally filtered by search query.
 */
export function countByWorkspaceId(workspaceId: string, q?: string): number {
  const db = getDatabase();

  if (q) {
    const escapedQ = escapeLikePattern(q);
    const result = db
      .query<{ count: number }, [string, string]>(
        `SELECT COUNT(*) as count FROM chats
         WHERE workspace_id = ? AND title LIKE '%' || ? || '%' ESCAPE '\\' COLLATE NOCASE`,
      )
      .get(workspaceId, escapedQ);
    return result?.count ?? 0;
  }

  const result = db
    .query<
      { count: number },
      [string]
    >(`SELECT COUNT(*) as count FROM chats WHERE workspace_id = ?`)
    .get(workspaceId);
  return result?.count ?? 0;
}

/**
 * Find chats for a workspace with pagination and optional search.
 * Returns chats sorted by updated_at DESC (newest first).
 */
export function findByWorkspaceId(
  workspaceId: string,
  params: { q?: string; offset: number; limit: number },
): PaginatedResult<Chat> {
  const db = getDatabase();
  const { q, offset, limit } = params;

  const total = countByWorkspaceId(workspaceId, q);

  let rows: ChatRow[];
  if (q) {
    const escapedQ = escapeLikePattern(q);
    rows = db
      .query<ChatRow, [string, string, number, number]>(
        `SELECT * FROM chats
         WHERE workspace_id = ? AND title LIKE '%' || ? || '%' ESCAPE '\\' COLLATE NOCASE
         ORDER BY updated_at DESC
         LIMIT ? OFFSET ?`,
      )
      .all(workspaceId, escapedQ, limit, offset);
  } else {
    rows = db
      .query<ChatRow, [string, number, number]>(
        `SELECT * FROM chats
         WHERE workspace_id = ?
         ORDER BY updated_at DESC
         LIMIT ? OFFSET ?`,
      )
      .all(workspaceId, limit, offset);
  }

  return {
    items: rows.map(rowToChat),
    total,
    offset,
    limit,
    hasMore: offset + rows.length < total,
  };
}

/**
 * Find a chat by ID.
 * Returns null if not found.
 */
export function findById(id: string): Chat | null {
  const db = getDatabase();
  const row = db
    .query<ChatRow, [string]>(`SELECT * FROM chats WHERE id = ?`)
    .get(id);
  return row ? rowToChat(row) : null;
}

/**
 * Count total messages for a chat.
 */
export function countMessagesByChatId(chatId: string): number {
  const db = getDatabase();
  const result = db
    .query<
      { count: number },
      [string]
    >(`SELECT COUNT(*) as count FROM chat_messages WHERE chat_id = ?`)
    .get(chatId);
  return result?.count ?? 0;
}

/**
 * Find messages for a chat with pagination.
 * Returns messages sorted by created_at DESC (newest first).
 */
export function findMessagesByChatId(
  chatId: string,
  params: { offset: number; limit: number },
): PaginatedResult<ChatMessage> {
  const db = getDatabase();
  const { offset, limit } = params;

  const total = countMessagesByChatId(chatId);

  const rows = db
    .query<ChatMessageRow, [string, number, number]>(
      `SELECT * FROM chat_messages
       WHERE chat_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(chatId, limit, offset);

  return {
    items: rows.map(rowToMessage),
    total,
    offset,
    limit,
    hasMore: offset + rows.length < total,
  };
}

/**
 * Create a new chat in the database.
 * Returns the created Chat entity.
 */
export function create(
  id: string,
  workspaceId: string,
  title: string,
  agentId: string | null,
): Chat {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare(
    `
    INSERT INTO chats (id, workspace_id, agent_id, title, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
  ).run(id, workspaceId, agentId, title, now, now);

  return findById(id)!;
}

/**
 * Update a chat's title.
 * Returns the updated Chat entity or null if not found.
 */
export function updateTitle(chatId: string, title: string): Chat | null {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare(`UPDATE chats SET title = ?, updated_at = ? WHERE id = ?`).run(
    title,
    now,
    chatId,
  );

  return findById(chatId);
}

// =============================================================================
// Chat Queue Operations
// =============================================================================

/**
 * Find all queued chat queue items.
 * Returns items sorted by created_at ASC (oldest first).
 */
export function findQueuedItems(): ChatQueueItem[] {
  const db = getDatabase();
  const rows = db
    .query<
      ChatQueueRow,
      []
    >(`SELECT * FROM chat_queue WHERE status = 'queued' ORDER BY created_at ASC`)
    .all();
  return rows.map(rowToQueueItem);
}

/**
 * Atomically claim a queue item by updating status from 'queued' to 'in_progress'.
 * Returns the claimed item if successful, null if item was already claimed.
 */
export function claimQueueItem(queueId: string): ChatQueueItem | null {
  const db = getDatabase();
  const now = new Date().toISOString();

  // Atomic update: only succeeds if status is still 'queued'
  const result = db
    .prepare(
      `UPDATE chat_queue
       SET status = 'in_progress', updated_at = ?
       WHERE id = ? AND status = 'queued'`,
    )
    .run(now, queueId);

  // Check if we actually updated a row
  if (result.changes === 0) {
    return null; // Someone else claimed it
  }

  return findQueueItemById(queueId);
}

/**
 * Find an in-progress queue item by chat ID.
 * Returns null if no in-progress item exists.
 */
export function findInProgressQueueByChatId(
  chatId: string,
): ChatQueueItem | null {
  const db = getDatabase();
  const row = db
    .query<
      ChatQueueRow,
      [string]
    >(`SELECT * FROM chat_queue WHERE chat_id = ? AND status = 'in_progress'`)
    .get(chatId);
  return row ? rowToQueueItem(row) : null;
}

/**
 * Check if a chat has any active queue items (queued or in_progress).
 * Returns true if processing is ongoing or pending.
 */
export function hasActiveQueueItem(chatId: string): boolean {
  const db = getDatabase();
  const result = db
    .query<{ count: number }, [string]>(
      `SELECT COUNT(*) as count FROM chat_queue
       WHERE chat_id = ? AND status IN ('queued', 'in_progress')`,
    )
    .get(chatId);
  return (result?.count ?? 0) > 0;
}

/**
 * Find a queue item by ID.
 * Returns null if not found.
 */
export function findQueueItemById(id: string): ChatQueueItem | null {
  const db = getDatabase();
  const row = db
    .query<ChatQueueRow, [string]>(`SELECT * FROM chat_queue WHERE id = ?`)
    .get(id);
  return row ? rowToQueueItem(row) : null;
}

/**
 * Create a new chat queue item.
 * Returns the created ChatQueueItem entity.
 */
export function createQueueItem(
  id: string,
  chatId: string,
  workspaceId: string,
): ChatQueueItem {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare(
    `
    INSERT INTO chat_queue (id, chat_id, workspace_id, status, created_at, updated_at)
    VALUES (?, ?, ?, 'queued', ?, ?)
  `,
  ).run(id, chatId, workspaceId, now, now);

  return findQueueItemById(id)!;
}

/**
 * Update a queue item's status.
 * Returns the updated ChatQueueItem entity or null if not found.
 */
export function updateQueueStatus(
  id: string,
  status: ChatQueueStatus,
): ChatQueueItem | null {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE chat_queue SET status = ?, updated_at = ? WHERE id = ?`,
  ).run(status, now, id);

  return findQueueItemById(id);
}

// =============================================================================
// Chat Message Operations
// =============================================================================

/**
 * Create a new chat message.
 * Returns the created ChatMessage entity.
 */
export function createMessage(
  id: string,
  chatId: string,
  role: ChatMessageRole,
  message: string,
  actions?: ChatAction[] | null,
): ChatMessage {
  const db = getDatabase();
  const now = new Date().toISOString();
  const actionsJson = actions ? JSON.stringify(actions) : null;

  db.prepare(
    `
    INSERT INTO chat_messages (id, chat_id, role, message, actions, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
  ).run(id, chatId, role, message, actionsJson, now);

  // Also update the chat's updated_at timestamp
  db.prepare(`UPDATE chats SET updated_at = ? WHERE id = ?`).run(now, chatId);

  return findMessageById(id)!;
}

/**
 * Find a message by ID.
 * Returns null if not found.
 */
export function findMessageById(id: string): ChatMessage | null {
  const db = getDatabase();
  const row = db
    .query<ChatMessageRow, [string]>(`SELECT * FROM chat_messages WHERE id = ?`)
    .get(id);
  return row ? rowToMessage(row) : null;
}

/**
 * Find all messages for a chat.
 * Returns messages sorted by created_at ASC (oldest first) for CLI context.
 */
export function findAllMessagesByChatId(chatId: string): ChatMessage[] {
  const db = getDatabase();
  const rows = db
    .query<
      ChatMessageRow,
      [string]
    >(`SELECT * FROM chat_messages WHERE chat_id = ? ORDER BY created_at ASC`)
    .all(chatId);
  return rows.map(rowToMessage);
}

/**
 * Check if a chat has any agent messages.
 * Used to determine if rename_chat action should be allowed.
 */
export function hasAgentMessages(chatId: string): boolean {
  const db = getDatabase();
  const result = db
    .query<
      { count: number },
      [string]
    >(`SELECT COUNT(*) as count FROM chat_messages WHERE chat_id = ? AND role = 'agent'`)
    .get(chatId);
  return (result?.count ?? 0) > 0;
}
