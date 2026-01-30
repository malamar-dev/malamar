import { getDatabase } from "../core";

const CLEANUP_DAYS_THRESHOLD = 7;

/**
 * Run cleanup job for task queue and chat queue.
 * Deletes completed/failed items older than 7 days.
 *
 * Per TECHNICAL_DESIGN.md:
 * - Task queue cleanup: Delete completed/failed task queue items > 7 days old
 * - Chat queue cleanup: Delete completed/failed chat queue items > 7 days old
 */
export function runCleanup(): void {
  try {
    const db = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_DAYS_THRESHOLD);
    const cutoffIso = cutoffDate.toISOString();

    // Clean up old task queue items
    const taskQueueResult = db
      .prepare(
        `DELETE FROM task_queue
         WHERE status IN ('completed', 'failed')
         AND updated_at < ?`,
      )
      .run(cutoffIso);

    // Clean up old chat queue items
    const chatQueueResult = db
      .prepare(
        `DELETE FROM chat_queue
         WHERE status IN ('completed', 'failed')
         AND updated_at < ?`,
      )
      .run(cutoffIso);

    const totalDeleted = taskQueueResult.changes + chatQueueResult.changes;

    if (totalDeleted > 0) {
      console.log(
        `[Cleanup] Deleted ${taskQueueResult.changes} task queue items, ${chatQueueResult.changes} chat queue items`,
      );
    }
  } catch (error) {
    console.error("[Cleanup] Error during cleanup:", error);
  }
}
