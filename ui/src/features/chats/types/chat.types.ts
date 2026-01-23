import type { CliType } from "@/types/cli.types.ts";

export interface Chat {
  id: string;
  workspaceId: string;
  agentId: string | null;
  cliType: CliType | null;
  title: string;
  isProcessing: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatsResponse {
  chats: Chat[];
  pagination: PaginationMeta;
}

export interface CreateChatInput {
  title?: string;
  agentId?: string | null;
}

// =============================================================================
// Chat Messages
// =============================================================================

export type ChatMessageRole = "user" | "agent" | "system";

export interface ChatAction {
  type: string;
  [key: string]: unknown;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  role: ChatMessageRole;
  message: string;
  actions: ChatAction[] | null;
  createdAt: string;
}

export interface MessagesResponse {
  messages: ChatMessage[];
  pagination: PaginationMeta;
}

export interface SendMessageInput {
  message: string;
}

export interface SendMessageResponse {
  message: ChatMessage;
}

// =============================================================================
// Pagination
// =============================================================================

export interface PaginationMeta {
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface PaginationParams {
  offset?: number;
  limit?: number;
}
