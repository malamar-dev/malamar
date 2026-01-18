import type { Agent } from '../agent/types.ts';
import type { TaskStatus } from '../core/types.ts';
import { emit } from '../events/emitter.ts';
import * as taskRepository from '../task/repository.ts';
import type { Task, TaskEventType } from '../task/types.ts';
import * as workspaceRepository from '../workspace/repository.ts';
import type { Workspace } from '../workspace/types.ts';
import type { TaskAction } from './types.ts';

/**
 * Result of executing task actions
 */
export interface TaskActionExecutionResult {
  commentsAdded: number;
  statusChanged: boolean;
  newStatus: TaskStatus | null;
  skipped: boolean;
}

/**
 * Context for executing task actions
 */
export interface TaskActionContext {
  task: Task;
  workspace: Workspace;
  agent: Agent;
}

/**
 * Execute a list of task actions
 *
 * This function processes actions from a CLI agent output and executes them:
 * - skip: No action taken, marks as skipped
 * - comment: Adds a comment to the task from the agent
 * - change_status: Changes the task status
 *
 * It also:
 * - Creates activity log entries for each action
 * - Updates workspace last_activity_at
 * - Emits events for monitoring
 *
 * @param context - The task, workspace, and agent context
 * @param actions - List of actions to execute
 * @returns Result of execution with counts and status changes
 */
export function executeTaskActions(
  context: TaskActionContext,
  actions: TaskAction[]
): TaskActionExecutionResult {
  const { task, workspace, agent } = context;

  const result: TaskActionExecutionResult = {
    commentsAdded: 0,
    statusChanged: false,
    newStatus: null,
    skipped: false,
  };

  // Track if all actions were skips
  let hasNonSkipAction = false;

  for (const action of actions) {
    switch (action.type) {
      case 'skip':
        result.skipped = true;
        break;

      case 'comment':
        hasNonSkipAction = true;
        executeCommentAction(task, workspace, agent, action.content);
        result.commentsAdded++;

        // Emit comment added event
        emit('task.comment_added', {
          workspaceId: workspace.id,
          taskId: task.id,
          taskSummary: task.summary,
          authorName: agent.name,
        });
        break;

      case 'change_status': {
        hasNonSkipAction = true;
        const newStatus = action.status;
        const oldStatus = task.status;

        if (newStatus !== oldStatus) {
          executeStatusChangeAction(task, workspace, agent, newStatus);
          result.statusChanged = true;
          result.newStatus = newStatus;

          // Emit status changed event
          emit('task.status_changed', {
            workspaceId: workspace.id,
            taskId: task.id,
            taskSummary: task.summary,
            oldStatus,
            newStatus,
          });
        }
        break;
      }
    }
  }

  // If there were non-skip actions, mark skipped as false
  if (hasNonSkipAction) {
    result.skipped = false;
  }

  // Update workspace last_activity_at if any action was executed
  if (actions.length > 0) {
    workspaceRepository.updateLastActivity(workspace.id);
  }

  return result;
}

/**
 * Execute a comment action
 */
function executeCommentAction(
  task: Task,
  workspace: Workspace,
  agent: Agent,
  content: string
): void {
  // Create the comment
  taskRepository.createComment({
    taskId: task.id,
    workspaceId: workspace.id,
    agentId: agent.id,
    content,
  });

  // Create activity log
  taskRepository.createLog({
    taskId: task.id,
    workspaceId: workspace.id,
    eventType: 'comment_added' as TaskEventType,
    actorType: 'agent',
    actorId: agent.id,
    metadata: { agentName: agent.name },
  });
}

/**
 * Execute a status change action
 */
function executeStatusChangeAction(
  task: Task,
  workspace: Workspace,
  agent: Agent,
  newStatus: TaskStatus
): void {
  const oldStatus = task.status;

  // Update the task status
  taskRepository.updateStatus(task.id, newStatus);

  // Create activity log
  taskRepository.createLog({
    taskId: task.id,
    workspaceId: workspace.id,
    eventType: 'status_changed' as TaskEventType,
    actorType: 'agent',
    actorId: agent.id,
    metadata: {
      oldStatus,
      newStatus,
      agentName: agent.name,
    },
  });
}

/**
 * Add a system comment to a task (for errors, system messages, etc.)
 *
 * @param task - The task to add the comment to
 * @param workspace - The workspace containing the task
 * @param content - The comment content
 */
export function addSystemComment(task: Task, workspace: Workspace, content: string): void {
  // Create the comment
  taskRepository.createComment({
    taskId: task.id,
    workspaceId: workspace.id,
    content,
  });

  // Create activity log
  taskRepository.createLog({
    taskId: task.id,
    workspaceId: workspace.id,
    eventType: 'comment_added' as TaskEventType,
    actorType: 'system',
  });

  // Update workspace last_activity_at
  workspaceRepository.updateLastActivity(workspace.id);
}

/**
 * Update task status with activity logging (for system status changes)
 *
 * @param task - The task to update
 * @param workspace - The workspace containing the task
 * @param newStatus - The new status to set
 */
export function updateTaskStatusWithLog(
  task: Task,
  workspace: Workspace,
  newStatus: TaskStatus
): void {
  const oldStatus = task.status;

  if (oldStatus === newStatus) {
    return;
  }

  // Update the task status
  taskRepository.updateStatus(task.id, newStatus);

  // Create activity log
  taskRepository.createLog({
    taskId: task.id,
    workspaceId: workspace.id,
    eventType: 'status_changed' as TaskEventType,
    actorType: 'system',
    metadata: { oldStatus, newStatus },
  });

  // Update workspace last_activity_at
  workspaceRepository.updateLastActivity(workspace.id);

  // Emit status changed event
  emit('task.status_changed', {
    workspaceId: workspace.id,
    taskId: task.id,
    taskSummary: task.summary,
    oldStatus,
    newStatus,
  });
}
