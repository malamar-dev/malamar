import type { CliType } from "../agent/types";

/**
 * Chat entity as returned by the API.
 */
export interface Chat {
  id: string;
  workspaceId: string;
  agentId: string | null;
  cliType: CliType | null;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Database row representation of a chat.
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
 * Chat message entity as returned by the API.
 */
export interface ChatMessage {
  id: string;
  chatId: string;
  role: ChatMessageRole;
  message: string;
  actions: ChatAction[] | null;
  createdAt: Date;
}

/**
 * Database row representation of a chat message.
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
 * Possible roles for a chat message.
 */
export type ChatMessageRole = "user" | "agent" | "system";

/**
 * An action returned by an agent in a chat message.
 */
export interface ChatAction {
  type: string;
  [key: string]: unknown;
}

/**
 * Pagination parameters for list queries.
 */
export interface PaginationParams {
  offset: number;
  limit: number;
}

/**
 * Paginated result wrapper for list queries.
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Possible statuses for a chat queue item.
 */
export type ChatQueueStatus = "queued" | "in_progress" | "completed" | "failed";

/**
 * Chat queue item entity as returned by the API.
 */
export interface ChatQueueItem {
  id: string;
  chatId: string;
  workspaceId: string;
  status: ChatQueueStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Database row representation of a chat queue item.
 */
export interface ChatQueueRow {
  id: string;
  chat_id: string;
  workspace_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * Rename chat action type.
 */
export interface RenameChatAction extends ChatAction {
  type: "rename_chat";
  title: string;
}

/**
 * Create agent action type (Malamar agent only).
 */
export interface CreateAgentAction extends ChatAction {
  type: "create_agent";
  name: string;
  instruction: string;
  cliType: string;
}

/**
 * Update agent action type (Malamar agent only).
 */
export interface UpdateAgentAction extends ChatAction {
  type: "update_agent";
  agentId: string;
  name?: string;
  instruction?: string;
  cliType?: string;
}

/**
 * Delete agent action type (Malamar agent only).
 */
export interface DeleteAgentAction extends ChatAction {
  type: "delete_agent";
  agentId: string;
}

/**
 * Reorder agents action type (Malamar agent only).
 */
export interface ReorderAgentsAction extends ChatAction {
  type: "reorder_agents";
  agentIds: string[];
}

/**
 * Update workspace action type (Malamar agent only).
 */
export interface UpdateWorkspaceAction extends ChatAction {
  type: "update_workspace";
  title?: string;
  description?: string;
  workingDirectory?: string | null;
}

/**
 * CLI output schema for chat responses.
 */
export interface CliChatOutput {
  message?: string;
  actions?: ChatAction[];
}
