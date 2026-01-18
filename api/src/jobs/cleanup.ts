import * as chatRepository from '../chat/repository.ts';
import { logger } from '../core/index.ts';
import * as taskRepository from '../task/repository.ts';
import * as workspaceRepository from '../workspace/repository.ts';

/**
 * Default retention period for completed/failed queue items in days
 */
const DEFAULT_QUEUE_RETENTION_DAYS = 7;

/**
 * Result of a cleanup run
 */
export interface CleanupResult {
  taskQueueItemsDeleted: number;
  chatQueueItemsDeleted: number;
  doneTasksDeleted: number;
  workspacesProcessed: number;
  errors: string[];
}

/**
 * Run the cleanup job to:
 * 1. Delete completed/failed task queue items older than retention period
 * 2. Delete completed/failed chat queue items older than retention period
 * 3. Delete done tasks for workspaces with auto-delete enabled
 */
export function runCleanup(): CleanupResult {
  logger.info('Starting cleanup job');

  const result: CleanupResult = {
    taskQueueItemsDeleted: 0,
    chatQueueItemsDeleted: 0,
    doneTasksDeleted: 0,
    workspacesProcessed: 0,
    errors: [],
  };

  // 1. Clean up old task queue items
  try {
    result.taskQueueItemsDeleted = taskRepository.deleteOldQueueItems(DEFAULT_QUEUE_RETENTION_DAYS);
    if (result.taskQueueItemsDeleted > 0) {
      logger.info('Deleted old task queue items', { count: result.taskQueueItemsDeleted });
    }
  } catch (error) {
    const errorMsg = `Failed to delete old task queue items: ${error instanceof Error ? error.message : String(error)}`;
    logger.error('Failed to delete old task queue items', {
      error: error instanceof Error ? error.message : String(error),
    });
    result.errors.push(errorMsg);
  }

  // 2. Clean up old chat queue items
  try {
    result.chatQueueItemsDeleted = chatRepository.deleteOldQueueItems(DEFAULT_QUEUE_RETENTION_DAYS);
    if (result.chatQueueItemsDeleted > 0) {
      logger.info('Deleted old chat queue items', { count: result.chatQueueItemsDeleted });
    }
  } catch (error) {
    const errorMsg = `Failed to delete old chat queue items: ${error instanceof Error ? error.message : String(error)}`;
    logger.error('Failed to delete old chat queue items', {
      error: error instanceof Error ? error.message : String(error),
    });
    result.errors.push(errorMsg);
  }

  // 3. Delete done tasks for workspaces with auto-delete enabled
  try {
    const workspaces = workspaceRepository.findAll();

    for (const workspace of workspaces) {
      if (workspace.autoDeleteDoneTasks) {
        try {
          const deleted = taskRepository.deleteDoneByWorkspace(workspace.id);
          result.doneTasksDeleted += deleted;
          result.workspacesProcessed += 1;

          if (deleted > 0) {
            logger.debug('Deleted done tasks for workspace', {
              workspaceId: workspace.id,
              workspaceTitle: workspace.title,
              count: deleted,
            });
          }
        } catch (error) {
          const errorMsg = `Failed to delete done tasks for workspace ${workspace.id}: ${error instanceof Error ? error.message : String(error)}`;
          logger.error('Failed to delete done tasks for workspace', {
            workspaceId: workspace.id,
            error: error instanceof Error ? error.message : String(error),
          });
          result.errors.push(errorMsg);
        }
      }
    }

    if (result.doneTasksDeleted > 0) {
      logger.info('Deleted done tasks', {
        count: result.doneTasksDeleted,
        workspacesProcessed: result.workspacesProcessed,
      });
    }
  } catch (error) {
    const errorMsg = `Failed to process workspaces for done task cleanup: ${error instanceof Error ? error.message : String(error)}`;
    logger.error('Failed to process workspaces for done task cleanup', {
      error: error instanceof Error ? error.message : String(error),
    });
    result.errors.push(errorMsg);
  }

  logger.info('Cleanup job completed', {
    taskQueueItemsDeleted: result.taskQueueItemsDeleted,
    chatQueueItemsDeleted: result.chatQueueItemsDeleted,
    doneTasksDeleted: result.doneTasksDeleted,
    workspacesProcessed: result.workspacesProcessed,
  });

  return result;
}

// Export constant for testing
export { DEFAULT_QUEUE_RETENTION_DAYS };
