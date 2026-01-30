import { getDatabase } from "../core";
import { findWithRetentionEnabled } from "../workspace";

const QUEUE_CLEANUP_DAYS_THRESHOLD = 7;

/**
 * Run cleanup job for task queue, chat queue, and done tasks.
 *
 * Per TECHNICAL_DESIGN.md:
 * - Task queue cleanup: Delete completed/failed task queue items > 7 days old
 * - Chat queue cleanup: Delete completed/failed chat queue items > 7 days old
 * - Task cleanup: Delete done tasks exceeding workspace retention period
 */
export function runCleanup(): void {
  try {
    const db = getDatabase();

    // 1. Clean up old task queue items (fixed 7-day threshold)
    const queueCutoffDate = new Date();
    queueCutoffDate.setDate(
      queueCutoffDate.getDate() - QUEUE_CLEANUP_DAYS_THRESHOLD,
    );
    const queueCutoffIso = queueCutoffDate.toISOString();

    const taskQueueResult = db
      .prepare(
        `DELETE FROM task_queue
         WHERE status IN ('completed', 'failed')
         AND updated_at < ?`,
      )
      .run(queueCutoffIso);

    // 2. Clean up old chat queue items (fixed 7-day threshold)
    const chatQueueResult = db
      .prepare(
        `DELETE FROM chat_queue
         WHERE status IN ('completed', 'failed')
         AND updated_at < ?`,
      )
      .run(queueCutoffIso);

    // 3. Clean up done tasks per workspace retention settings
    let doneTasks = 0;
    const workspaces = findWithRetentionEnabled();

    for (const workspace of workspaces) {
      const taskCutoffDate = new Date();
      taskCutoffDate.setDate(
        taskCutoffDate.getDate() - workspace.retentionDays,
      );
      const taskCutoffIso = taskCutoffDate.toISOString();

      const doneTasksResult = db
        .prepare(
          `DELETE FROM tasks
           WHERE workspace_id = ?
           AND status = 'done'
           AND updated_at < ?`,
        )
        .run(workspace.id, taskCutoffIso);

      doneTasks += doneTasksResult.changes;
    }

    const totalDeleted =
      taskQueueResult.changes + chatQueueResult.changes + doneTasks;

    if (totalDeleted > 0) {
      console.log(
        `[Cleanup] Deleted ${taskQueueResult.changes} task queue items, ${chatQueueResult.changes} chat queue items, ${doneTasks} done tasks`,
      );
    }
  } catch (error) {
    console.error("[Cleanup] Error during cleanup:", error);
  }
}
