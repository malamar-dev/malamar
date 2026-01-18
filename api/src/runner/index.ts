import type { Database } from 'bun:sqlite';

import * as chatRepository from '../chat/repository.ts';
import type { ChatQueueItem } from '../chat/types.ts';
import { getConfig } from '../core/config.ts';
import { getDb } from '../core/database.ts';
import { logger } from '../core/logger.ts';
import { now } from '../shared/index.ts';
import * as taskRepository from '../task/repository.ts';
import type { TaskQueueItem } from '../task/types.ts';
import { processChat } from './chat-worker.ts';
import { killAllProcesses } from './subprocess.ts';
import { processTask } from './task-worker.ts';

/**
 * Runner state
 */
interface RunnerState {
  isRunning: boolean;
  isShuttingDown: boolean;
  taskPollTimer: ReturnType<typeof setInterval> | null;
  chatPollTimer: ReturnType<typeof setInterval> | null;
  activeTaskWorkers: Set<string>; // workspace IDs currently processing tasks
  activeChatWorkers: Set<string>; // chat IDs currently processing
}

/**
 * Runner state singleton
 */
const state: RunnerState = {
  isRunning: false,
  isShuttingDown: false,
  taskPollTimer: null,
  chatPollTimer: null,
  activeTaskWorkers: new Set(),
  activeChatWorkers: new Set(),
};

/**
 * Start the runner
 *
 * This starts the main polling loops for task and chat queues.
 * It also performs startup recovery for any interrupted items.
 */
export function startRunner(): void {
  if (state.isRunning) {
    logger.warn('Runner is already running');
    return;
  }

  const config = getConfig();
  const pollInterval = config.runnerPollInterval;

  logger.info('Starting runner', { pollInterval });

  // Perform startup recovery
  performStartupRecovery();

  state.isRunning = true;
  state.isShuttingDown = false;

  // Start task queue polling
  state.taskPollTimer = setInterval(() => {
    pollTaskQueue();
  }, pollInterval);

  // Start chat queue polling
  state.chatPollTimer = setInterval(() => {
    pollChatQueue();
  }, pollInterval);

  // Run initial poll immediately
  pollTaskQueue();
  pollChatQueue();

  logger.info('Runner started');
}

/**
 * Stop the runner
 *
 * This stops accepting new queue pickups, kills all active subprocesses,
 * and waits briefly for cleanup.
 */
export async function stopRunner(): Promise<void> {
  if (!state.isRunning) {
    logger.warn('Runner is not running');
    return;
  }

  logger.info('Stopping runner');

  state.isShuttingDown = true;

  // Stop polling timers
  if (state.taskPollTimer) {
    clearInterval(state.taskPollTimer);
    state.taskPollTimer = null;
  }
  if (state.chatPollTimer) {
    clearInterval(state.chatPollTimer);
    state.chatPollTimer = null;
  }

  // Kill all active subprocesses
  const killed = killAllProcesses();
  if (killed > 0) {
    logger.info('Killed active subprocesses during shutdown', { count: killed });
  }

  // Wait briefly for subprocesses to exit
  await new Promise((resolve) => setTimeout(resolve, 1000));

  state.isRunning = false;
  state.isShuttingDown = false;
  state.activeTaskWorkers.clear();
  state.activeChatWorkers.clear();

  logger.info('Runner stopped');
}

/**
 * Check if the runner is currently running
 */
export function isRunnerRunning(): boolean {
  return state.isRunning;
}

/**
 * Check if the runner is shutting down
 */
export function isRunnerShuttingDown(): boolean {
  return state.isShuttingDown;
}

/**
 * Get runner statistics
 */
export function getRunnerStats(): {
  isRunning: boolean;
  isShuttingDown: boolean;
  activeTaskWorkers: number;
  activeChatWorkers: number;
} {
  return {
    isRunning: state.isRunning,
    isShuttingDown: state.isShuttingDown,
    activeTaskWorkers: state.activeTaskWorkers.size,
    activeChatWorkers: state.activeChatWorkers.size,
  };
}

/**
 * Perform startup recovery
 *
 * On startup, find any queue items with status "in_progress" and reset them
 * to "queued" so they get picked up again.
 */
function performStartupRecovery(db: Database = getDb()): void {
  logger.info('Performing startup recovery');

  const timestamp = now();

  // Reset in_progress task queue items to queued (and update timestamp for LIFO ordering)
  const taskResult = db
    .query('UPDATE task_queue SET status = ?, updated_at = ? WHERE status = ?')
    .run('queued', timestamp, 'in_progress');

  if (taskResult.changes > 0) {
    logger.info('Reset interrupted task queue items', { count: taskResult.changes });
  }

  // Reset in_progress chat queue items to queued (and update timestamp)
  const chatResult = db
    .query('UPDATE chat_queue SET status = ?, updated_at = ? WHERE status = ?')
    .run('queued', timestamp, 'in_progress');

  if (chatResult.changes > 0) {
    logger.info('Reset interrupted chat queue items', { count: chatResult.changes });
  }
}

/**
 * Poll the task queue and spawn workers for workspaces with work
 */
function pollTaskQueue(): void {
  if (state.isShuttingDown) {
    return;
  }

  try {
    // Get workspaces with queued task items
    const workspacesWithWork = getWorkspacesWithQueuedTasks();

    for (const workspaceId of workspacesWithWork) {
      // Skip if already processing this workspace
      if (state.activeTaskWorkers.has(workspaceId)) {
        continue;
      }

      // Mark workspace as active before picking to prevent race conditions
      state.activeTaskWorkers.add(workspaceId);

      // Pick up the next queue item for this workspace
      const queueItem = pickNextTaskQueueItem(workspaceId);
      if (!queueItem) {
        // Remove from active workers if no work found
        state.activeTaskWorkers.delete(workspaceId);
        continue;
      }

      // Spawn async worker (don't await - let it run in background)
      spawnTaskWorker(workspaceId, queueItem);
    }
  } catch (error) {
    logger.error('Error polling task queue', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Spawn a task worker for a workspace
 */
async function spawnTaskWorker(workspaceId: string, queueItem: TaskQueueItem): Promise<void> {
  const config = getConfig();

  try {
    logger.debug('Spawning task worker', { workspaceId, taskId: queueItem.taskId });

    await processTask(queueItem, { tempDir: config.tempDir });
  } catch (error) {
    logger.error('Task worker error', {
      workspaceId,
      taskId: queueItem.taskId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  } finally {
    // Remove workspace from active workers
    state.activeTaskWorkers.delete(workspaceId);
  }
}

/**
 * Poll the chat queue and spawn workers for queued chats
 */
function pollChatQueue(): void {
  if (state.isShuttingDown) {
    return;
  }

  try {
    // Get all queued chat items
    const queuedChats = chatRepository.findQueuedItems();

    for (const queueItem of queuedChats) {
      // Skip if already processing this chat
      if (state.activeChatWorkers.has(queueItem.chatId)) {
        continue;
      }

      // Mark chat as active and spawn worker
      state.activeChatWorkers.add(queueItem.chatId);

      // Spawn async worker (don't await - let it run in background)
      spawnChatWorker(queueItem);
    }
  } catch (error) {
    logger.error('Error polling chat queue', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Spawn a chat worker
 */
async function spawnChatWorker(queueItem: ChatQueueItem): Promise<void> {
  const config = getConfig();

  try {
    logger.debug('Spawning chat worker', { chatId: queueItem.chatId });

    await processChat(queueItem, { tempDir: config.tempDir });
  } catch (error) {
    logger.error('Chat worker error', {
      chatId: queueItem.chatId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  } finally {
    // Remove chat from active workers
    state.activeChatWorkers.delete(queueItem.chatId);
  }
}

/**
 * Get list of workspace IDs that have queued task items
 */
function getWorkspacesWithQueuedTasks(db: Database = getDb()): string[] {
  const rows = db
    .query<
      { workspace_id: string },
      [string]
    >('SELECT DISTINCT workspace_id FROM task_queue WHERE status = ?')
    .all('queued');

  return rows.map((row) => row.workspace_id);
}

/**
 * Pick the next task queue item for a workspace using the pickup algorithm:
 *
 * 1. Status filter: Only consider items where task status is "Todo" or "In Progress"
 * 2. Priority flag: Items with is_priority = true first
 * 3. Most recently processed: Find the task with the most recent completed/failed queue item
 * 4. LIFO fallback: Pick the most recently updated queued item
 */
function pickNextTaskQueueItem(
  workspaceId: string,
  db: Database = getDb()
): TaskQueueItem | null {
  // Get all queued items for this workspace
  const queuedItems = taskRepository.findQueuedByWorkspace(workspaceId, db);

  if (queuedItems.length === 0) {
    return null;
  }

  // Filter to only items where task status is "Todo" or "In Progress"
  const validItems = queuedItems.filter((item) => {
    const task = taskRepository.findById(item.taskId, db);
    if (!task) return false;
    return task.status === 'todo' || task.status === 'in_progress';
  });

  if (validItems.length === 0) {
    return null;
  }

  // Priority items first (already ordered by repository query)
  const priorityItems = validItems.filter((item) => item.isPriority);
  if (priorityItems.length > 0) {
    return priorityItems[0]!;
  }

  // Find the task with the most recent completed/failed queue item
  const recentlyProcessedTaskId = findMostRecentlyProcessedTask(workspaceId, db);
  if (recentlyProcessedTaskId) {
    const matchingItem = validItems.find((item) => item.taskId === recentlyProcessedTaskId);
    if (matchingItem) {
      return matchingItem;
    }
  }

  // LIFO fallback: pick the most recently updated queued item
  // Items are already ordered by updated_at DESC from the repository
  return validItems[0]!;
}

/**
 * Find the task ID with the most recent completed or failed queue item
 */
function findMostRecentlyProcessedTask(
  workspaceId: string,
  db: Database = getDb()
): string | null {
  const row = db
    .query<
      { task_id: string },
      [string, string, string]
    >(
      `SELECT task_id FROM task_queue
       WHERE workspace_id = ? AND (status = ? OR status = ?)
       ORDER BY updated_at DESC
       LIMIT 1`
    )
    .get(workspaceId, 'completed', 'failed');

  return row?.task_id ?? null;
}

/**
 * Reset runner state for testing
 */
export function resetRunnerState(): void {
  state.isRunning = false;
  state.isShuttingDown = false;
  state.taskPollTimer = null;
  state.chatPollTimer = null;
  state.activeTaskWorkers.clear();
  state.activeChatWorkers.clear();
}

// Re-export from submodules for convenience
export { addSystemComment,executeTaskActions } from './action-executor.ts';
export {
  countSuccessfulActions,
  executeChatActions,
  getFailedActionErrors,
} from './chat-action-executor.ts';
export { type ChatProcessResult, type ChatWorkerConfig,processChat } from './chat-worker.ts';
export { buildChatContext,buildChatInput, buildTaskInput } from './input-builder.ts';
export {
  generateErrorComment,
  parseChatOutput,
  parseChatOutputFile,
  parseTaskOutput,
  parseTaskOutputFile,
} from './output-parser.ts';
export {
  clearAllTracking,
  getChatProcess,
  getChatProcessCount,
  getTaskProcess,
  getTaskProcessCount,
  getTotalProcessCount,
  hasChatProcess,
  hasTaskProcess,
  killAllProcesses,
  killChatProcess,
  killTaskProcess,
  killWorkspaceProcesses,
  trackChatProcess,
  trackTaskProcess,
  untrackChatProcess,
  untrackTaskProcess,
} from './subprocess.ts';
export { processTask, type TaskProcessResult, type TaskWorkerConfig } from './task-worker.ts';
export * from './types.ts';
