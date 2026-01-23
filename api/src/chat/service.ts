import * as repository from "./repository";
import type { Chat, ChatMessage, PaginatedResult } from "./types";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Normalize pagination parameters with defaults and bounds.
 */
function normalizePagination(params: { offset?: number; limit?: number }): {
  offset: number;
  limit: number;
} {
  const offset = params.offset ?? 0;
  const limit = Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  return { offset, limit };
}

/**
 * Get paginated list of chats for a workspace.
 * Supports optional search by title.
 */
export function getChats(
  workspaceId: string,
  params: { q?: string; offset?: number; limit?: number },
): PaginatedResult<Chat> {
  const { offset, limit } = normalizePagination(params);
  return repository.findByWorkspaceId(workspaceId, {
    q: params.q,
    offset,
    limit,
  });
}

/**
 * Get a single chat by ID.
 * Returns null if not found.
 */
export function getChat(id: string): Chat | null {
  return repository.findById(id);
}

/**
 * Get paginated list of messages for a chat.
 */
export function getMessages(
  chatId: string,
  params: { offset?: number; limit?: number },
): PaginatedResult<ChatMessage> {
  const { offset, limit } = normalizePagination(params);
  return repository.findMessagesByChatId(chatId, { offset, limit });
}
