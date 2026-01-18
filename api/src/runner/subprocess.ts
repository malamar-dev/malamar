import type { Subprocess } from 'bun';

import { logger } from '../core/logger.ts';

/**
 * Map of task IDs to their subprocess instances
 */
const taskProcesses = new Map<string, Subprocess>();

/**
 * Map of chat IDs to their subprocess instances
 */
const chatProcesses = new Map<string, Subprocess>();

/**
 * Map of task IDs to their workspace IDs for reverse lookup
 */
const taskWorkspaceMap = new Map<string, string>();

/**
 * Map of chat IDs to their workspace IDs for reverse lookup
 */
const chatWorkspaceMap = new Map<string, string>();

/**
 * Track a subprocess for a task
 *
 * @param taskId - The task ID
 * @param workspaceId - The workspace ID
 * @param proc - The subprocess instance
 */
export function trackTaskProcess(taskId: string, workspaceId: string, proc: Subprocess): void {
  // Kill any existing process for this task
  killTaskProcess(taskId);

  taskProcesses.set(taskId, proc);
  taskWorkspaceMap.set(taskId, workspaceId);

  logger.debug('Tracking task subprocess', { taskId, workspaceId, pid: proc.pid });
}

/**
 * Track a subprocess for a chat
 *
 * @param chatId - The chat ID
 * @param workspaceId - The workspace ID
 * @param proc - The subprocess instance
 */
export function trackChatProcess(chatId: string, workspaceId: string, proc: Subprocess): void {
  // Kill any existing process for this chat
  killChatProcess(chatId);

  chatProcesses.set(chatId, proc);
  chatWorkspaceMap.set(chatId, workspaceId);

  logger.debug('Tracking chat subprocess', { chatId, workspaceId, pid: proc.pid });
}

/**
 * Kill and untrack a subprocess for a task
 *
 * @param taskId - The task ID
 * @returns true if a process was killed, false otherwise
 */
export function killTaskProcess(taskId: string): boolean {
  const proc = taskProcesses.get(taskId);
  if (!proc) {
    return false;
  }

  try {
    proc.kill();
    logger.debug('Killed task subprocess', { taskId, pid: proc.pid });
  } catch (error) {
    // Process may have already exited
    logger.debug('Failed to kill task subprocess (may have already exited)', {
      taskId,
      pid: proc.pid,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  taskProcesses.delete(taskId);
  taskWorkspaceMap.delete(taskId);
  return true;
}

/**
 * Kill and untrack a subprocess for a chat
 *
 * @param chatId - The chat ID
 * @returns true if a process was killed, false otherwise
 */
export function killChatProcess(chatId: string): boolean {
  const proc = chatProcesses.get(chatId);
  if (!proc) {
    return false;
  }

  try {
    proc.kill();
    logger.debug('Killed chat subprocess', { chatId, pid: proc.pid });
  } catch (error) {
    // Process may have already exited
    logger.debug('Failed to kill chat subprocess (may have already exited)', {
      chatId,
      pid: proc.pid,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  chatProcesses.delete(chatId);
  chatWorkspaceMap.delete(chatId);
  return true;
}

/**
 * Kill all subprocesses for a workspace
 *
 * @param workspaceId - The workspace ID
 * @returns Number of processes killed
 */
export function killWorkspaceProcesses(workspaceId: string): number {
  let count = 0;

  // Collect IDs first to avoid modifying Map during iteration
  const taskIdsToKill = [...taskWorkspaceMap.entries()]
    .filter(([, wsId]) => wsId === workspaceId)
    .map(([taskId]) => taskId);

  const chatIdsToKill = [...chatWorkspaceMap.entries()]
    .filter(([, wsId]) => wsId === workspaceId)
    .map(([chatId]) => chatId);

  // Kill task processes
  for (const taskId of taskIdsToKill) {
    if (killTaskProcess(taskId)) {
      count++;
    }
  }

  // Kill chat processes
  for (const chatId of chatIdsToKill) {
    if (killChatProcess(chatId)) {
      count++;
    }
  }

  if (count > 0) {
    logger.info('Killed workspace subprocesses', { workspaceId, count });
  }

  return count;
}

/**
 * Kill all tracked subprocesses
 *
 * This should be called during graceful shutdown.
 *
 * @returns Number of processes killed
 */
export function killAllProcesses(): number {
  let count = 0;

  // Collect IDs first to avoid modifying Map during iteration
  const taskIds = [...taskProcesses.keys()];
  const chatIds = [...chatProcesses.keys()];

  // Kill all task processes
  for (const taskId of taskIds) {
    if (killTaskProcess(taskId)) {
      count++;
    }
  }

  // Kill all chat processes
  for (const chatId of chatIds) {
    if (killChatProcess(chatId)) {
      count++;
    }
  }

  if (count > 0) {
    logger.info('Killed all subprocesses', { count });
  }

  return count;
}

/**
 * Check if a task has an active subprocess
 *
 * @param taskId - The task ID
 * @returns true if the task has an active subprocess
 */
export function hasTaskProcess(taskId: string): boolean {
  return taskProcesses.has(taskId);
}

/**
 * Check if a chat has an active subprocess
 *
 * @param chatId - The chat ID
 * @returns true if the chat has an active subprocess
 */
export function hasChatProcess(chatId: string): boolean {
  return chatProcesses.has(chatId);
}

/**
 * Get the subprocess for a task
 *
 * @param taskId - The task ID
 * @returns The subprocess instance or undefined
 */
export function getTaskProcess(taskId: string): Subprocess | undefined {
  return taskProcesses.get(taskId);
}

/**
 * Get the subprocess for a chat
 *
 * @param chatId - The chat ID
 * @returns The subprocess instance or undefined
 */
export function getChatProcess(chatId: string): Subprocess | undefined {
  return chatProcesses.get(chatId);
}

/**
 * Untrack a task subprocess without killing it
 *
 * This should be called when a process finishes naturally.
 *
 * @param taskId - The task ID
 */
export function untrackTaskProcess(taskId: string): void {
  taskProcesses.delete(taskId);
  taskWorkspaceMap.delete(taskId);
}

/**
 * Untrack a chat subprocess without killing it
 *
 * This should be called when a process finishes naturally.
 *
 * @param chatId - The chat ID
 */
export function untrackChatProcess(chatId: string): void {
  chatProcesses.delete(chatId);
  chatWorkspaceMap.delete(chatId);
}

/**
 * Get the count of active task subprocesses
 *
 * @returns Number of active task subprocesses
 */
export function getTaskProcessCount(): number {
  return taskProcesses.size;
}

/**
 * Get the count of active chat subprocesses
 *
 * @returns Number of active chat subprocesses
 */
export function getChatProcessCount(): number {
  return chatProcesses.size;
}

/**
 * Get the total count of active subprocesses
 *
 * @returns Total number of active subprocesses
 */
export function getTotalProcessCount(): number {
  return taskProcesses.size + chatProcesses.size;
}

/**
 * Clear all subprocess tracking data
 *
 * This is primarily for testing purposes. It does NOT kill processes.
 */
export function clearAllTracking(): void {
  taskProcesses.clear();
  chatProcesses.clear();
  taskWorkspaceMap.clear();
  chatWorkspaceMap.clear();
}
