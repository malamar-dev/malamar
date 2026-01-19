import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { NotFoundError } from '../core/errors.ts';
import type { CliType } from '../core/types.ts';
import { FILE_PATTERNS } from '../runner/types.ts';
import * as repository from './repository.ts';
import type { Chat, ChatMessage, CreateChatInput, UpdateChatInput } from './types.ts';

export function listChats(workspaceId: string): Chat[] {
  return repository.findByWorkspaceId(workspaceId);
}

export function searchChats(workspaceId: string, query: string): Chat[] {
  return repository.search(workspaceId, query);
}

export function getChat(id: string): Chat {
  const chat = repository.findById(id);
  if (!chat) {
    throw new NotFoundError(`Chat not found: ${id}`);
  }
  return chat;
}

export function createChat(input: CreateChatInput): Chat {
  return repository.create(input);
}

export function updateChat(id: string, input: UpdateChatInput): Chat {
  const chat = repository.findById(id);
  if (!chat) {
    throw new NotFoundError(`Chat not found: ${id}`);
  }

  const updated = repository.update(id, input);
  if (!updated) {
    throw new NotFoundError(`Chat not found: ${id}`);
  }

  return updated;
}

export function deleteChat(id: string): void {
  // TODO: Kill any active subprocess for this chat
  const deleted = repository.remove(id);
  if (!deleted) {
    throw new NotFoundError(`Chat not found: ${id}`);
  }
}

export function sendMessage(chatId: string, content: string): ChatMessage {
  const chat = repository.findById(chatId);
  if (!chat) {
    throw new NotFoundError(`Chat not found: ${chatId}`);
  }

  // Create user message
  const message = repository.createMessage({
    chatId,
    role: 'user',
    message: content,
  });

  // Create queue item for processing
  repository.createQueueItem({
    chatId,
    workspaceId: chat.workspaceId,
  });

  return message;
}

export function addAgentMessage(chatId: string, content: string, actions?: unknown[]): ChatMessage {
  const chat = repository.findById(chatId);
  if (!chat) {
    throw new NotFoundError(`Chat not found: ${chatId}`);
  }

  return repository.createMessage({
    chatId,
    role: 'agent',
    message: content,
    actions,
  });
}

export function addSystemMessage(chatId: string, content: string): ChatMessage {
  const chat = repository.findById(chatId);
  if (!chat) {
    throw new NotFoundError(`Chat not found: ${chatId}`);
  }

  return repository.createMessage({
    chatId,
    role: 'system',
    message: content,
  });
}

export function getMessages(chatId: string): ChatMessage[] {
  const chat = repository.findById(chatId);
  if (!chat) {
    throw new NotFoundError(`Chat not found: ${chatId}`);
  }
  return repository.findMessagesByChatId(chatId);
}

export function cancelProcessing(chatId: string): void {
  const chat = repository.findById(chatId);
  if (!chat) {
    throw new NotFoundError(`Chat not found: ${chatId}`);
  }

  // TODO: Kill subprocess
  // Find queue item and mark as failed
  const queueItem = repository.findQueueItemByChatId(chatId);
  if (queueItem) {
    repository.updateQueueStatus(queueItem.id, 'failed');
  }

  // Add system message
  repository.createMessage({
    chatId,
    role: 'system',
    message: 'Processing cancelled by user',
  });
}

export function canRenameChat(chatId: string): boolean {
  // Can only rename on first agent response
  const agentMessageCount = repository.countAgentMessages(chatId);
  return agentMessageCount === 0;
}

export function renameChat(chatId: string, title: string): void {
  if (!canRenameChat(chatId)) {
    return; // Silently ignore if not first response
  }
  repository.update(chatId, { title });
}

export function setCliOverride(chatId: string, cliType: CliType | null): void {
  const chat = repository.findById(chatId);
  if (!chat) {
    throw new NotFoundError(`Chat not found: ${chatId}`);
  }
  repository.update(chatId, { cliType });
}

/**
 * Upload a file attachment to a chat.
 *
 * Stores the file in /tmp/malamar_chat_{chatId}_attachments/{filename}
 * and adds a system message noting the file path.
 *
 * Duplicate filenames overwrite existing files.
 * No file size or type restrictions.
 */
export async function uploadAttachment(
  chatId: string,
  filename: string,
  content: ArrayBuffer | Uint8Array
): Promise<{ filePath: string; message: ChatMessage }> {
  const chat = repository.findById(chatId);
  if (!chat) {
    throw new NotFoundError(`Chat not found: ${chatId}`);
  }

  // Build attachment directory path
  const attachmentDir = join('/tmp', FILE_PATTERNS.chatAttachments(chatId));

  // Ensure directory exists
  await mkdir(attachmentDir, { recursive: true });

  // Build full file path
  const filePath = join(attachmentDir, filename);

  // Write file (overwrites if exists)
  await Bun.write(filePath, content);

  // Add system message noting the file path
  const message = repository.createMessage({
    chatId,
    role: 'system',
    message: `User has uploaded ${filePath}`,
  });

  return { filePath, message };
}
