import * as agentRepository from "../agent/repository";
import { err, generateId, ok, type Result } from "../shared";
import * as workspaceRepository from "../workspace/repository";
import * as repository from "./repository";
import type {
  Chat,
  ChatAction,
  ChatMessage,
  ChatQueueItem,
  PaginatedResult,
  RenameChatAction,
} from "./types";

const DEFAULT_LIMIT = 10;
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
 * Chat with processing status included.
 */
export interface ChatWithStatus extends Chat {
  isProcessing: boolean;
}

/**
 * Get a single chat by ID with processing status.
 */
export function getChatWithStatus(id: string): Result<ChatWithStatus> {
  const chat = repository.findById(id);
  if (!chat) {
    return err("Chat not found", "NOT_FOUND");
  }

  const isProcessing = repository.hasActiveQueueItem(id);

  return ok({
    ...chat,
    isProcessing,
  });
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

/**
 * Update a chat's title and/or agent.
 * Returns the updated chat, or an error if validation fails.
 * When switching agents, a system message is added to the conversation.
 */
export function updateChat(
  id: string,
  params: { title?: string; agentId?: string | null },
): Result<Chat> {
  // Validate chat exists
  const existingChat = repository.findById(id);
  if (!existingChat) {
    return err("Chat not found", "NOT_FOUND");
  }

  // Track updates made
  let updatedChat: Chat | null = existingChat;

  // Update title if provided
  if (params.title !== undefined) {
    updatedChat = repository.updateTitle(id, params.title);
    if (!updatedChat) {
      return err("Failed to update chat title", "INTERNAL_ERROR");
    }
  }

  // Update agent if provided and different from current
  if (params.agentId !== undefined && params.agentId !== existingChat.agentId) {
    // Validate new agent if not null
    if (params.agentId !== null) {
      const agent = agentRepository.findById(params.agentId);
      if (!agent) {
        return err("Agent not found", "AGENT_NOT_FOUND");
      }
      if (agent.workspaceId !== existingChat.workspaceId) {
        return err(
          "Agent does not belong to this workspace",
          "AGENT_NOT_IN_WORKSPACE",
        );
      }
    }

    // Check if chat is currently processing
    const isProcessing = repository.hasActiveQueueItem(id);
    if (isProcessing) {
      return err(
        "Cannot switch agent while chat is processing",
        "CHAT_PROCESSING",
      );
    }

    // Get agent names for system message
    const oldAgentName = existingChat.agentId
      ? (agentRepository.findById(existingChat.agentId)?.name ?? "Unknown")
      : "Malamar";
    const newAgentName = params.agentId
      ? (agentRepository.findById(params.agentId)?.name ?? "Unknown")
      : "Malamar";

    // Update the agent
    updatedChat = repository.updateAgent(id, params.agentId);
    if (!updatedChat) {
      return err("Failed to update chat agent", "INTERNAL_ERROR");
    }

    // Add system message about the switch
    const messageId = generateId();
    repository.createMessage(
      messageId,
      id,
      "system",
      `Switched from ${oldAgentName} to ${newAgentName}`,
    );
  }

  return ok(updatedChat!);
}

// =============================================================================
// Chat Message Operations
// =============================================================================

/**
 * Create a user message and queue it for processing.
 * Returns an error if the chat already has an in-progress queue item.
 */
export function createMessage(
  chatId: string,
  message: string,
): Result<{ message: ChatMessage; queueItem: ChatQueueItem }> {
  // Validate chat exists
  const chat = repository.findById(chatId);
  if (!chat) {
    return err("Chat not found", "NOT_FOUND");
  }

  // Check for in-progress queue item (reject concurrent messages)
  const inProgress = repository.findInProgressQueueByChatId(chatId);
  if (inProgress) {
    return err("Chat is already processing a message", "CONFLICT");
  }

  // Create user message
  const messageId = generateId();
  const chatMessage = repository.createMessage(
    messageId,
    chatId,
    "user",
    message,
  );

  // Create queue item
  const queueId = generateId();
  const queueItem = repository.createQueueItem(
    queueId,
    chatId,
    chat.workspaceId,
  );

  return ok({ message: chatMessage, queueItem });
}

/**
 * Cancel an in-progress chat processing.
 * The actual subprocess killing is handled by the chat processor.
 * Returns an error if no active processing exists.
 */
export function cancelProcessing(
  chatId: string,
  killProcess: (chatId: string) => boolean,
): Result<void> {
  // Validate chat exists
  const chat = repository.findById(chatId);
  if (!chat) {
    return err("Chat not found", "NOT_FOUND");
  }

  // Find in-progress queue item
  const queueItem = repository.findInProgressQueueByChatId(chatId);
  if (!queueItem) {
    return err("No active processing to cancel", "NOT_FOUND");
  }

  // Kill the subprocess
  killProcess(chatId);

  // Mark queue item as failed
  repository.updateQueueStatus(queueItem.id, "failed");

  // Add system message about cancellation
  const messageId = generateId();
  repository.createMessage(
    messageId,
    chatId,
    "system",
    "Processing was cancelled by user",
  );

  return ok(undefined);
}

/**
 * Execute actions returned by an agent.
 * Currently only supports rename_chat action.
 * Invalid or unsupported actions are silently ignored.
 */
export function executeActions(chatId: string, actions: ChatAction[]): void {
  for (const action of actions) {
    if (action.type === "rename_chat") {
      // Only allow rename on first agent response
      const hasExisting = repository.hasAgentMessages(chatId);
      if (!hasExisting) {
        const renameAction = action as RenameChatAction;
        const title = renameAction.title?.trim();
        if (title) {
          repository.updateTitle(chatId, title);
        }
      }
      // Silently ignore if not first response or invalid title
    }
    // Other action types are silently ignored for now
  }
}

/**
 * Create an agent message (called by the chat processor).
 */
export function createAgentMessage(
  chatId: string,
  message: string,
  actions?: ChatAction[] | null,
): ChatMessage {
  const messageId = generateId();
  return repository.createMessage(messageId, chatId, "agent", message, actions);
}

/**
 * Create a system message (called by the chat processor on error).
 */
export function createSystemMessage(
  chatId: string,
  message: string,
): ChatMessage {
  const messageId = generateId();
  return repository.createMessage(messageId, chatId, "system", message);
}
