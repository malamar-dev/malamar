import { Hono } from "hono";

import { createErrorResponse, httpStatusFromCode } from "../shared";
import * as workspaceService from "../workspace/service";
import {
  createChatBodySchema,
  listChatsQuerySchema,
  listMessagesQuerySchema,
} from "./schemas";
import * as service from "./service";
import type { Chat, ChatMessage, PaginatedResult } from "./types";

export const chatRouter = new Hono();

/**
 * Serialize a chat for API response.
 */
function serializeChat(chat: Chat) {
  return {
    id: chat.id,
    workspaceId: chat.workspaceId,
    agentId: chat.agentId,
    cliType: chat.cliType,
    title: chat.title,
    createdAt: chat.createdAt.toISOString(),
    updatedAt: chat.updatedAt.toISOString(),
  };
}

/**
 * Serialize a chat message for API response.
 */
function serializeMessage(message: ChatMessage) {
  return {
    id: message.id,
    chatId: message.chatId,
    role: message.role,
    message: message.message,
    actions: message.actions,
    createdAt: message.createdAt.toISOString(),
  };
}

/**
 * Serialize pagination metadata for API response.
 */
function serializePagination<T>(result: PaginatedResult<T>) {
  return {
    total: result.total,
    offset: result.offset,
    limit: result.limit,
    hasMore: result.hasMore,
  };
}

/**
 * GET /workspaces/:workspaceId/chats - List chats in workspace
 * Supports ?q= for title search and ?offset=&limit= for pagination.
 */
chatRouter.get("/workspaces/:workspaceId/chats", (c) => {
  const workspaceId = c.req.param("workspaceId");

  // Verify workspace exists
  const workspaceResult = workspaceService.getWorkspace(workspaceId);
  if (!workspaceResult.ok) {
    return c.json(
      createErrorResponse(workspaceResult.code, workspaceResult.error),
      httpStatusFromCode(workspaceResult.code),
    );
  }

  // Parse and validate query parameters
  const query = c.req.query();
  const parsed = listChatsQuerySchema.safeParse(query);

  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return c.json(
      createErrorResponse(
        "VALIDATION_ERROR",
        firstError?.message ?? "Invalid query parameters",
      ),
      400,
    );
  }

  const result = service.getChats(workspaceId, parsed.data);

  return c.json({
    chats: result.items.map(serializeChat),
    pagination: serializePagination(result),
  });
});

/**
 * POST /workspaces/:workspaceId/chats - Create a new chat
 * Body: { title?: string, agentId?: string | null }
 */
chatRouter.post("/workspaces/:workspaceId/chats", async (c) => {
  const workspaceId = c.req.param("workspaceId");

  // Parse and validate request body
  const body = await c.req.json().catch(() => ({}));
  const parsed = createChatBodySchema.safeParse(body);

  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return c.json(
      createErrorResponse(
        "VALIDATION_ERROR",
        firstError?.message ?? "Invalid request body",
      ),
      400,
    );
  }

  const result = service.createChat(workspaceId, parsed.data);

  if (!result.ok) {
    return c.json(
      createErrorResponse(result.code, result.error),
      httpStatusFromCode(result.code),
    );
  }

  return c.json(serializeChat(result.data), 201);
});

/**
 * GET /chats/:id - Get chat details
 * Returns chat metadata without messages.
 */
chatRouter.get("/chats/:id", (c) => {
  const id = c.req.param("id");

  const result = service.getChat(id);
  if (!result.ok) {
    return c.json(
      createErrorResponse(result.code, result.error),
      httpStatusFromCode(result.code),
    );
  }

  return c.json(serializeChat(result.data));
});

/**
 * GET /chats/:id/messages - Get messages for a chat
 * Supports ?offset=&limit= for pagination.
 */
chatRouter.get("/chats/:id/messages", (c) => {
  const chatId = c.req.param("id");

  // Verify chat exists
  const chatResult = service.getChat(chatId);
  if (!chatResult.ok) {
    return c.json(
      createErrorResponse(chatResult.code, chatResult.error),
      httpStatusFromCode(chatResult.code),
    );
  }

  // Parse and validate query parameters
  const query = c.req.query();
  const parsed = listMessagesQuerySchema.safeParse(query);

  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return c.json(
      createErrorResponse(
        "VALIDATION_ERROR",
        firstError?.message ?? "Invalid query parameters",
      ),
      400,
    );
  }

  const result = service.getMessages(chatId, parsed.data);

  return c.json({
    messages: result.items.map(serializeMessage),
    pagination: serializePagination(result),
  });
});
