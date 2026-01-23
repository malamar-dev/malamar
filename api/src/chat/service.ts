import * as agentRepository from "../agent/repository";
import { err, generateId, ok, type Result } from "../shared";
import * as workspaceRepository from "../workspace/repository";
import * as repository from "./repository";
import type { Chat, ChatMessage, PaginatedResult } from "./types";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_TITLE = "Untitled chat";

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
 */
export function getChat(id: string): Result<Chat> {
  const chat = repository.findById(id);
  if (!chat) {
    return err("Chat not found", "NOT_FOUND");
  }
  return ok(chat);
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

/**
 * Create a new chat in a workspace.
 * Returns the created chat, or an error if validation fails.
 */
export function createChat(
  workspaceId: string,
  params: { title?: string; agentId?: string | null },
): Result<Chat> {
  // Validate workspace exists
  const workspace = workspaceRepository.findById(workspaceId);
  if (!workspace) {
    return err("Workspace not found", "NOT_FOUND");
  }

  // Validate agent if provided
  if (params.agentId) {
    const agent = agentRepository.findById(params.agentId);
    if (!agent) {
      return err("Agent not found", "AGENT_NOT_FOUND");
    }
    if (agent.workspaceId !== workspaceId) {
      return err(
        "Agent does not belong to this workspace",
        "AGENT_NOT_IN_WORKSPACE",
      );
    }
  }

  // Normalize title: trim whitespace, use default if empty
  const title = params.title?.trim() || DEFAULT_TITLE;

  // Create chat
  const id = generateId();
  const chat = repository.create(
    id,
    workspaceId,
    title,
    params.agentId ?? null,
  );

  return ok(chat);
}
