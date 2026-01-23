import type { CliType } from "../agent/types";
import { getDatabase } from "../core";
import type {
  Chat,
  ChatAction,
  ChatMessage,
  ChatMessageRole,
  ChatMessageRow,
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
