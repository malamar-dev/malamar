import type { Subprocess } from "bun";

import * as agentRepository from "../agent/repository";
import { invokeChatCli } from "../chat/cli-invoke";
import * as chatRepository from "../chat/repository";
import * as chatService from "../chat/service";
import type { ChatQueueItem } from "../chat/types";
import {
  emitChatProcessingFinished,
  emitChatProcessingStarted,
} from "../events";
import * as workspaceRepository from "../workspace/repository";

/**
 * Map of chat_id -> Subprocess for active chat processes.
 * Used for cancellation support.
 */
const activeChatProcesses = new Map<string, Subprocess>();

/**
 * Kill an active chat process by chat ID.
 * Returns true if a process was found and killed.
 */
export function killChatProcess(chatId: string): boolean {
  const proc = activeChatProcesses.get(chatId);
  if (proc) {
    proc.kill();
    activeChatProcesses.delete(chatId);
    return true;
  }
  return false;
}

/**
 * Kill all active chat processes.
 * Called during graceful shutdown.
 */
export function killAllChatProcesses(): void {
  for (const [chatId, proc] of activeChatProcesses) {
    proc.kill();
    activeChatProcesses.delete(chatId);
  }
}

/**
 * Get the number of active chat processes.
 * Used for monitoring/debugging.
 */
export function getActiveChatProcessCount(): number {
  return activeChatProcesses.size;
}

/**
 * Kill all active chat processes for a list of chat IDs.
 * Used when deleting a workspace to clean up running processes.
 * Returns the number of processes killed.
 */
export function killChatProcessesForChatIds(chatIds: string[]): number {
  let killed = 0;
  for (const chatId of chatIds) {
    if (killChatProcess(chatId)) {
      killed++;
    }
  }
  return killed;
}

/**
 * Main chat processor function.
 * Finds all queued chat items and processes them in parallel.
 */
export async function runChatProcessor(signal: AbortSignal): Promise<void> {
  if (signal.aborted) return;

  // Find all queued items
  const queuedItems = chatRepository.findQueuedItems();

  if (queuedItems.length === 0) return;

  console.log(`[ChatProcessor] Processing ${queuedItems.length} queued items`);

  // Process all in parallel (unlimited concurrency)
  await Promise.allSettled(
    queuedItems.map((item) => processQueueItem(item, signal)),
  );
}

/**
 * Process a single queue item.
 */
async function processQueueItem(
  queueItem: ChatQueueItem,
  signal: AbortSignal,
): Promise<void> {
  const { id: queueId, chatId, workspaceId } = queueItem;

  // Atomically claim the queue item
  const claimed = chatRepository.claimQueueItem(queueId);
  if (!claimed) {
    // Another processor already claimed this item, skip
    return;
  }

  console.log(`[ChatProcessor] Starting processing for chat ${chatId}`);

  // Load chat first for SSE events
  const chat = chatRepository.findById(chatId);
  if (!chat) {
    console.error(`[ChatProcessor] Chat ${chatId} not found`);
    chatRepository.updateQueueStatus(queueId, "failed");
    return;
  }

  // Load agent (null for Malamar agent)
  const agent = chat.agentId ? agentRepository.findById(chat.agentId) : null;
  const agentName = agent?.name ?? "Malamar";

  // Emit processing started event
  emitChatProcessingStarted({
    chatId,
    chatTitle: chat.title,
    agentName,
    workspaceId,
  });

  try {
    // Load workspace
    const workspace = workspaceRepository.findById(workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    // Load all messages for context
    const messages = chatRepository.findAllMessagesByChatId(chatId);

    // Invoke CLI
    const result = await invokeChatCli(
      {
        chatId,
        workspace,
        agent,
        messages,
        onProcess: (proc) => activeChatProcesses.set(chatId, proc),
      },
      signal,
    );

    // Check if aborted during processing
    if (signal.aborted) {
      console.log(`[ChatProcessor] Processing aborted for chat ${chatId}`);
      return;
    }

    if (!result.success) {
      throw new Error(result.error || "CLI invocation failed");
    }

    // Extract response data
    const agentMessage = result.output?.message || "";
    const actions = result.output?.actions || null;

    // Execute actions BEFORE creating agent message
    // This ensures hasAgentMessages() returns false for first response
    // Pass workspaceId and isMalamarAgent for Malamar agent actions
    if (actions && actions.length > 0) {
      const isMalamarAgent = chat.agentId === null;
      chatService.executeActions(chatId, actions, workspaceId, isMalamarAgent);
    }

    // Create agent message
    chatService.createAgentMessage(chatId, agentMessage, actions);

    // Mark as completed
    chatRepository.updateQueueStatus(queueId, "completed");

    console.log(`[ChatProcessor] Completed processing for chat ${chatId}`);
  } catch (error) {
    // Handle error: add system message, mark as failed
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.error(
      `[ChatProcessor] Error processing chat ${chatId}: ${errorMessage}`,
    );

    // Add system message with error
    chatService.createSystemMessage(
      chatId,
      `Processing failed: ${errorMessage}`,
    );

    // Mark queue item as failed
    chatRepository.updateQueueStatus(queueId, "failed");
  } finally {
    // Emit processing finished event
    emitChatProcessingFinished({
      chatId,
      chatTitle: chat.title,
      agentName,
      workspaceId,
    });

    // Clean up subprocess from tracking map
    activeChatProcesses.delete(chatId);
  }
}
