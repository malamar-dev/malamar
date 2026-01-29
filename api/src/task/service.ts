import { killTaskProcess } from "../jobs";
import { err, generateId, ok, type Result } from "../shared";
import * as workspaceRepository from "../workspace/repository";
import * as repository from "./repository";
import type {
  CreateCommentBody,
  CreateTaskBody,
  UpdateTaskBody,
} from "./schemas";
import type {
  PaginatedResult,
  Task,
  TaskComment,
  TaskLog,
  TaskStatus,
} from "./types";

// Mock user ID since there's no auth yet
const MOCK_USER_ID = "000000000000000000000";

// =============================================================================
// Task Operations
// =============================================================================

/**
 * Get paginated list of tasks for a workspace.
 */
export function listTasks(
  workspaceId: string,
  offset: number,
  limit: number,
): Result<PaginatedResult<Task>> {
  // Validate workspace exists
  const workspace = workspaceRepository.findById(workspaceId);
  if (!workspace) {
    return err("Workspace not found", "NOT_FOUND");
  }

  const result = repository.findByWorkspaceId(workspaceId, offset, limit);
  return ok(result);
}

/**
 * Create a new task in a workspace.
 */
export function createTask(
  workspaceId: string,
  params: CreateTaskBody,
): Result<Task> {
  // Validate workspace exists
  const workspace = workspaceRepository.findById(workspaceId);
  if (!workspace) {
    return err("Workspace not found", "NOT_FOUND");
  }

  const id = generateId();
  const description = params.description ?? "";

  const task = repository.create(id, workspaceId, params.summary, description);

  // Create activity log
  repository.createLog(
    generateId(),
    task.id,
    workspaceId,
    "task_created",
    "user",
    MOCK_USER_ID,
    null,
  );

  // Create queue item for processing
  repository.createQueueItem(generateId(), task.id, workspaceId);

  // Update workspace activity
  repository.updateWorkspaceActivity(workspaceId);

  return ok(task);
}

/**
 * Get a single task by ID.
 */
export function getTask(id: string): Result<Task> {
  const task = repository.findById(id);
  if (!task) {
    return err("Task not found", "NOT_FOUND");
  }
  return ok(task);
}

/**
 * Update a task.
 */
export function updateTask(id: string, params: UpdateTaskBody): Result<Task> {
  const task = repository.findById(id);
  if (!task) {
    return err("Task not found", "NOT_FOUND");
  }

  const oldStatus = task.status;

  const updatedTask = repository.update(id, {
    summary: params.summary,
    description: params.description,
    status: params.status as TaskStatus | undefined,
  });

  if (!updatedTask) {
    return err("Task not found", "NOT_FOUND");
  }

  // Log status change if status was updated
  if (params.status && params.status !== oldStatus) {
    repository.createLog(
      generateId(),
      task.id,
      task.workspaceId,
      "status_changed",
      "user",
      MOCK_USER_ID,
      { oldStatus, newStatus: params.status },
    );

    // If task moved from 'done' to another status, create a queue item
    if (oldStatus === "done" && params.status !== "done") {
      const existingQueueItem = repository.findActiveQueueItemByTaskId(id);
      if (!existingQueueItem) {
        repository.createQueueItem(generateId(), task.id, task.workspaceId);
      }
    }
  }

  // Update workspace activity
  repository.updateWorkspaceActivity(task.workspaceId);

  return ok(updatedTask);
}

/**
 * Delete a task by ID.
 */
export function deleteTask(id: string): Result<void> {
  const task = repository.findById(id);
  if (!task) {
    return err("Task not found", "NOT_FOUND");
  }

  repository.deleteById(id);

  // Update workspace activity
  repository.updateWorkspaceActivity(task.workspaceId);

  return ok(undefined);
}

/**
 * Prioritize or deprioritize a task.
 */
export function prioritizeTask(id: string, isPriority: boolean): Result<void> {
  const task = repository.findById(id);
  if (!task) {
    return err("Task not found", "NOT_FOUND");
  }

  // Update queue item priority
  repository.updateQueueItemPriority(id, isPriority);

  // Create activity log
  repository.createLog(
    generateId(),
    task.id,
    task.workspaceId,
    isPriority ? "task_prioritized" : "task_deprioritized",
    "user",
    MOCK_USER_ID,
    null,
  );

  // Update workspace activity
  repository.updateWorkspaceActivity(task.workspaceId);

  return ok(undefined);
}

/**
 * Cancel a running task.
 */
export function cancelTask(id: string): Result<void> {
  const task = repository.findById(id);
  if (!task) {
    return err("Task not found", "NOT_FOUND");
  }

  // Find and update active queue item
  const queueItem = repository.findActiveQueueItemByTaskId(id);
  if (!queueItem) {
    return err("No active processing to cancel", "NOT_FOUND");
  }

  // Kill the subprocess if running
  killTaskProcess(id);

  // Mark queue item as failed
  repository.updateQueueItemStatus(id, "failed");

  // Move task to "in_review" (prevents immediate re-pickup per spec)
  repository.update(id, { status: "in_review" });

  // Create activity log for cancellation
  repository.createLog(
    generateId(),
    task.id,
    task.workspaceId,
    "task_cancelled",
    "user",
    MOCK_USER_ID,
    null,
  );

  // Add system comment about cancellation
  const commentId = generateId();
  repository.createComment(
    commentId,
    id,
    task.workspaceId,
    "Task cancelled by user",
    null, // no user
    null, // no agent (system comment)
  );

  // Update workspace activity
  repository.updateWorkspaceActivity(task.workspaceId);

  return ok(undefined);
}

/**
 * Delete all done tasks for a workspace.
 */
export function deleteAllDoneTasks(
  workspaceId: string,
): Result<{ deletedCount: number }> {
  // Validate workspace exists
  const workspace = workspaceRepository.findById(workspaceId);
  if (!workspace) {
    return err("Workspace not found", "NOT_FOUND");
  }

  const deletedCount = repository.deleteAllDoneByWorkspaceId(workspaceId);

  // Update workspace activity
  repository.updateWorkspaceActivity(workspaceId);

  return ok({ deletedCount });
}

// =============================================================================
// Comment Operations
// =============================================================================

/**
 * Get paginated list of comments for a task.
 */
export function listComments(
  taskId: string,
  offset: number,
  limit: number,
): Result<PaginatedResult<TaskComment>> {
  const task = repository.findById(taskId);
  if (!task) {
    return err("Task not found", "NOT_FOUND");
  }

  const result = repository.findCommentsByTaskId(taskId, offset, limit);
  return ok(result);
}

/**
 * Create a comment on a task.
 */
export function createComment(
  taskId: string,
  params: CreateCommentBody,
): Result<TaskComment> {
  const task = repository.findById(taskId);
  if (!task) {
    return err("Task not found", "NOT_FOUND");
  }

  const id = generateId();
  const comment = repository.createComment(
    id,
    taskId,
    task.workspaceId,
    params.content,
    MOCK_USER_ID,
    null,
  );

  // Create activity log
  repository.createLog(
    generateId(),
    taskId,
    task.workspaceId,
    "comment_added",
    "user",
    MOCK_USER_ID,
    null,
  );

  // Create queue item to trigger agent loop (if no active queue item)
  const existingQueueItem = repository.findActiveQueueItemByTaskId(taskId);
  if (!existingQueueItem) {
    repository.createQueueItem(generateId(), taskId, task.workspaceId);
  }

  // Update workspace activity
  repository.updateWorkspaceActivity(task.workspaceId);

  return ok(comment);
}

// =============================================================================
// Log Operations
// =============================================================================

/**
 * Get paginated list of activity logs for a task.
 */
export function listLogs(
  taskId: string,
  offset: number,
  limit: number,
): Result<PaginatedResult<TaskLog>> {
  const task = repository.findById(taskId);
  if (!task) {
    return err("Task not found", "NOT_FOUND");
  }

  const result = repository.findLogsByTaskId(taskId, offset, limit);
  return ok(result);
}

// =============================================================================
// Helper Exports
// =============================================================================

/**
 * Get agent name by ID.
 * Exported for use in routes for serialization.
 */
export function getAgentName(agentId: string): string | null {
  return repository.getAgentName(agentId);
}

// =============================================================================
// Task Processor Support
// =============================================================================

/**
 * Create an agent comment on a task.
 * Used by the task processor when agents add comments.
 */
export function createAgentComment(
  taskId: string,
  agentId: string,
  content: string,
): Result<TaskComment> {
  const task = repository.findById(taskId);
  if (!task) {
    return err("Task not found", "NOT_FOUND");
  }

  const id = generateId();
  const comment = repository.createComment(
    id,
    taskId,
    task.workspaceId,
    content,
    null, // no user
    agentId,
  );

  // Create activity log
  repository.createLog(
    generateId(),
    taskId,
    task.workspaceId,
    "comment_added",
    "agent",
    agentId,
    null,
  );

  // Update workspace activity
  repository.updateWorkspaceActivity(task.workspaceId);

  return ok(comment);
}

/**
 * Create a system comment on a task.
 * Used for error messages during processing.
 */
export function createSystemComment(
  taskId: string,
  content: string,
): Result<TaskComment> {
  const task = repository.findById(taskId);
  if (!task) {
    return err("Task not found", "NOT_FOUND");
  }

  const id = generateId();
  const comment = repository.createComment(
    id,
    taskId,
    task.workspaceId,
    content,
    null, // no user
    null, // no agent
  );

  // Create activity log
  repository.createLog(
    generateId(),
    taskId,
    task.workspaceId,
    "comment_added",
    "system",
    null,
    null,
  );

  // System comment also triggers queue item creation for retry
  const existingQueueItem = repository.findActiveQueueItemByTaskId(taskId);
  if (!existingQueueItem) {
    repository.createQueueItem(generateId(), taskId, task.workspaceId);
  }

  // Update workspace activity
  repository.updateWorkspaceActivity(task.workspaceId);

  return ok(comment);
}

/**
 * Update task status by agent.
 * Used by the processor for status transitions.
 */
export function updateTaskStatusByAgent(
  taskId: string,
  agentId: string,
  newStatus: TaskStatus,
): Result<Task> {
  const task = repository.findById(taskId);
  if (!task) {
    return err("Task not found", "NOT_FOUND");
  }

  const oldStatus = task.status;

  const updatedTask = repository.update(taskId, { status: newStatus });
  if (!updatedTask) {
    return err("Task not found", "NOT_FOUND");
  }

  // Log status change
  repository.createLog(
    generateId(),
    taskId,
    task.workspaceId,
    "status_changed",
    "agent",
    agentId,
    { oldStatus, newStatus },
  );

  // Update workspace activity
  repository.updateWorkspaceActivity(task.workspaceId);

  return ok(updatedTask);
}

/**
 * Update task status by system.
 * Used by the processor for automatic status transitions.
 */
export function updateTaskStatusBySystem(
  taskId: string,
  newStatus: TaskStatus,
): Result<Task> {
  const task = repository.findById(taskId);
  if (!task) {
    return err("Task not found", "NOT_FOUND");
  }

  const oldStatus = task.status;

  const updatedTask = repository.update(taskId, { status: newStatus });
  if (!updatedTask) {
    return err("Task not found", "NOT_FOUND");
  }

  // Log status change
  repository.createLog(
    generateId(),
    taskId,
    task.workspaceId,
    "status_changed",
    "system",
    null,
    { oldStatus, newStatus },
  );

  // Update workspace activity
  repository.updateWorkspaceActivity(task.workspaceId);

  return ok(updatedTask);
}

/**
 * Log agent started event.
 */
export function logAgentStarted(
  taskId: string,
  agentId: string,
  agentName: string,
): void {
  const task = repository.findById(taskId);
  if (!task) return;

  repository.createLog(
    generateId(),
    taskId,
    task.workspaceId,
    "agent_started",
    "agent",
    agentId,
    { agent_name: agentName },
  );

  repository.updateWorkspaceActivity(task.workspaceId);
}

/**
 * Log agent finished event.
 */
export function logAgentFinished(
  taskId: string,
  agentId: string,
  agentName: string,
  actionType: "skip" | "comment" | "in_review",
): void {
  const task = repository.findById(taskId);
  if (!task) return;

  repository.createLog(
    generateId(),
    taskId,
    task.workspaceId,
    "agent_finished",
    "agent",
    agentId,
    { agent_name: agentName, action_type: actionType },
  );

  repository.updateWorkspaceActivity(task.workspaceId);
}
