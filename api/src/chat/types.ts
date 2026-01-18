import type { CliType, MessageRole, QueueStatus } from '../core/types.ts';

/**
 * Database row for chats table
 */
export interface ChatRow {
  id: string;
  workspace_id: string;
  agent_id: string | null;
  cli_type: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

/**
 * Chat entity
 */
export interface Chat {
  id: string;
  workspaceId: string;
  agentId: string | null;
  cliType: CliType | null;
  title: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating a chat
 */
export interface CreateChatInput {
  workspaceId: string;
  agentId?: string;
  cliType?: CliType;
  title?: string;
}

/**
 * Input for updating a chat
 */
export interface UpdateChatInput {
  agentId?: string | null;
  cliType?: CliType | null;
  title?: string;
}

/**
 * Database row for chat_messages table
 */
export interface ChatMessageRow {
  id: string;
  chat_id: string;
  role: string;
  message: string;
  actions: string | null;
  created_at: string;
}

/**
 * Chat message entity
 */
export interface ChatMessage {
  id: string;
  chatId: string;
  role: MessageRole;
  message: string;
  actions: unknown[] | null;
  createdAt: string;
}

/**
 * Input for creating a chat message
 */
export interface CreateChatMessageInput {
  chatId: string;
  role: MessageRole;
  message: string;
  actions?: unknown[];
}

/**
 * Database row for chat_queue table
 */
export interface ChatQueueItemRow {
  id: string;
  chat_id: string;
  workspace_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * Chat queue item entity
 */
export interface ChatQueueItem {
  id: string;
  chatId: string;
  workspaceId: string;
  status: QueueStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating a chat queue item
 */
export interface CreateChatQueueItemInput {
  chatId: string;
  workspaceId: string;
}

/**
 * Convert database row to Chat entity
 */
export function rowToChat(row: ChatRow): Chat {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    agentId: row.agent_id,
    cliType: row.cli_type as CliType | null,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convert database row to ChatMessage entity
 */
export function rowToChatMessage(row: ChatMessageRow): ChatMessage {
  let actions: unknown[] | null = null;
  if (row.actions) {
    try {
      actions = JSON.parse(row.actions) as unknown[];
    } catch {
      actions = null;
    }
  }

  return {
    id: row.id,
    chatId: row.chat_id,
    role: row.role as MessageRole,
    message: row.message,
    actions,
    createdAt: row.created_at,
  };
}

/**
 * Convert database row to ChatQueueItem entity
 */
export function rowToChatQueueItem(row: ChatQueueItemRow): ChatQueueItem {
  return {
    id: row.id,
    chatId: row.chat_id,
    workspaceId: row.workspace_id,
    status: row.status as QueueStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
