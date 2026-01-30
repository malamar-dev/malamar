import { Hono } from "hono";

import { killChatProcess } from "../jobs";
import { createErrorResponse, httpStatusFromCode } from "../shared";
import * as workspaceService from "../workspace/service";
import {
  createChatBodySchema,
  createMessageBodySchema,
  listChatsQuerySchema,
  listMessagesQuerySchema,
  updateChatBodySchema,
} from "./schemas";
import type { ChatWithStatus } from "./service";
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
 * Serialize a chat with processing status for API response.
 */
function serializeChatWithStatus(chat: ChatWithStatus) {
  return {
    ...serializeChat(chat),
    isProcessing: chat.isProcessing,
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
 * Returns chat metadata with processing status.
 */
chatRouter.get("/chats/:id", (c) => {
  const id = c.req.param("id");

  const result = service.getChatWithStatus(id);
  if (!result.ok) {
    return c.json(
      createErrorResponse(result.code, result.error),
      httpStatusFromCode(result.code),
    );
  }

  return c.json(serializeChatWithStatus(result.data));
});

/**
 * PATCH /chats/:id - Update chat details
 * Body: { title?: string, agentId?: string | null }
 * At least one of title or agentId must be provided.
 * Switching agent adds a system message and is blocked while processing.
 */
chatRouter.patch("/chats/:id", async (c) => {
  const id = c.req.param("id");

  // Parse and validate request body
  const body = await c.req.json().catch(() => ({}));
  const parsed = updateChatBodySchema.safeParse(body);

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

  const result = service.updateChat(id, parsed.data);

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

/**
 * POST /chats/:id/messages - Create a user message
 * Body: { message: string }
 * Returns 202 Accepted immediately after queuing.
 * Returns 409 Conflict if chat is already processing.
 */
chatRouter.post("/chats/:id/messages", async (c) => {
  const chatId = c.req.param("id");

  // Parse and validate request body
  const body = await c.req.json().catch(() => ({}));
  const parsed = createMessageBodySchema.safeParse(body);

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

  const result = service.createMessage(chatId, parsed.data.message);

  if (!result.ok) {
    return c.json(
      createErrorResponse(result.code, result.error),
      httpStatusFromCode(result.code),
    );
  }

  return c.json(
    {
      message: serializeMessage(result.data.message),
    },
    202,
  );
});

/**
 * POST /chats/:id/cancel - Cancel active chat processing
 * Kills the CLI subprocess and marks the queue item as failed.
 * Returns 404 if no active processing exists.
 */
chatRouter.post("/chats/:id/cancel", (c) => {
  const chatId = c.req.param("id");

  const result = service.cancelProcessing(chatId, killChatProcess);

  if (!result.ok) {
    return c.json(
      createErrorResponse(result.code, result.error),
      httpStatusFromCode(result.code),
    );
  }

  return c.json({ success: true });
});

/**
 * DELETE /chats/:id - Delete a chat
 * Cascade deletes all related messages and queue items.
 */
chatRouter.delete("/chats/:id", (c) => {
  const id = c.req.param("id");

  const result = service.deleteChat(id);

  if (!result.ok) {
    return c.json(
      createErrorResponse(result.code, result.error),
      httpStatusFromCode(result.code),
    );
  }

  return c.json({ success: true });
});
