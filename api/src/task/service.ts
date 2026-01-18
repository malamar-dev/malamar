import { NotFoundError } from '../core/errors.ts';
import type { TaskStatus } from '../core/types.ts';
import { MOCK_USER_ID } from '../shared/index.ts';
import * as repository from './repository.ts';
import type { CreateTaskInput, Task, TaskComment, TaskLog, UpdateTaskInput } from './types.ts';

export function listTasks(workspaceId: string): Task[] {
  return repository.findByWorkspaceId(workspaceId);
}

export function getTask(id: string): Task {
  const task = repository.findById(id);
  if (!task) {
    throw new NotFoundError(`Task not found: ${id}`);
  }
  return task;
}

export function createTask(input: CreateTaskInput): Task {
  const task = repository.create(input);

  // Create queue item
  repository.createQueueItem({
    taskId: task.id,
    workspaceId: input.workspaceId,
  });

  // Create activity log
  repository.createLog({
    taskId: task.id,
    workspaceId: input.workspaceId,
    eventType: 'task_created',
    actorType: 'user',
    actorId: MOCK_USER_ID,
  });

  return task;
}

export function updateTask(id: string, input: UpdateTaskInput): Task {
  const task = repository.findById(id);
  if (!task) {
    throw new NotFoundError(`Task not found: ${id}`);
  }

  const oldStatus = task.status;
  const updated = repository.update(id, input);
  if (!updated) {
    throw new NotFoundError(`Task not found: ${id}`);
  }

  // Log status change if changed
  if (input.status && input.status !== oldStatus) {
    repository.createLog({
      taskId: id,
      workspaceId: task.workspaceId,
      eventType: 'status_changed',
      actorType: 'user',
      actorId: MOCK_USER_ID,
      metadata: { old_status: oldStatus, new_status: input.status },
    });
  }

  return updated;
}

export function deleteTask(id: string): void {
  // TODO: Kill any active subprocess for this task
  const deleted = repository.remove(id);
  if (!deleted) {
    throw new NotFoundError(`Task not found: ${id}`);
  }
}

export function changeStatus(id: string, status: TaskStatus): void {
  const task = repository.findById(id);
  if (!task) {
    throw new NotFoundError(`Task not found: ${id}`);
  }

  const oldStatus = task.status;
  if (oldStatus === status) {
    return;
  }

  repository.updateStatus(id, status);

  repository.createLog({
    taskId: id,
    workspaceId: task.workspaceId,
    eventType: 'status_changed',
    actorType: 'user',
    actorId: MOCK_USER_ID,
    metadata: { old_status: oldStatus, new_status: status },
  });

  // If moving to todo from done/in_review, create queue item
  if (status === 'todo' && (oldStatus === 'done' || oldStatus === 'in_review')) {
    const existingQueue = repository.findQueueItemByTaskId(id);
    if (!existingQueue) {
      repository.createQueueItem({ taskId: id, workspaceId: task.workspaceId });
    }
  }
}

export function prioritizeTask(id: string): void {
  const task = repository.findById(id);
  if (!task) {
    throw new NotFoundError(`Task not found: ${id}`);
  }

  repository.setQueuePriority(id, true);

  repository.createLog({
    taskId: id,
    workspaceId: task.workspaceId,
    eventType: 'task_prioritized',
    actorType: 'user',
    actorId: MOCK_USER_ID,
  });
}

export function deprioritizeTask(id: string): void {
  const task = repository.findById(id);
  if (!task) {
    throw new NotFoundError(`Task not found: ${id}`);
  }

  repository.setQueuePriority(id, false);

  repository.createLog({
    taskId: id,
    workspaceId: task.workspaceId,
    eventType: 'task_deprioritized',
    actorType: 'user',
    actorId: MOCK_USER_ID,
  });
}

export function cancelTask(id: string): void {
  const task = repository.findById(id);
  if (!task) {
    throw new NotFoundError(`Task not found: ${id}`);
  }

  // TODO: Kill subprocess
  repository.updateStatus(id, 'in_review');

  repository.createLog({
    taskId: id,
    workspaceId: task.workspaceId,
    eventType: 'task_cancelled',
    actorType: 'user',
    actorId: MOCK_USER_ID,
  });

  // Add system comment
  repository.createComment({
    taskId: id,
    workspaceId: task.workspaceId,
    content: 'Task cancelled by user',
  });
}

export function addComment(
  taskId: string,
  content: string,
  userId?: string,
  agentId?: string
): TaskComment {
  const task = repository.findById(taskId);
  if (!task) {
    throw new NotFoundError(`Task not found: ${taskId}`);
  }

  const comment = repository.createComment({
    taskId,
    workspaceId: task.workspaceId,
    userId: userId ?? MOCK_USER_ID,
    agentId,
    content,
  });

  repository.createLog({
    taskId,
    workspaceId: task.workspaceId,
    eventType: 'comment_added',
    actorType: agentId ? 'agent' : 'user',
    actorId: agentId ?? userId ?? MOCK_USER_ID,
  });

  // Update queue item timestamp or create new one
  if (task.status !== 'done') {
    const existingQueue = repository.findQueueItemByTaskId(taskId);
    if (existingQueue) {
      repository.updateQueueItemTimestamp(taskId);
    } else {
      repository.createQueueItem({ taskId, workspaceId: task.workspaceId });
    }
  }

  return comment;
}

export function getComments(taskId: string): TaskComment[] {
  const task = repository.findById(taskId);
  if (!task) {
    throw new NotFoundError(`Task not found: ${taskId}`);
  }
  return repository.findCommentsByTaskId(taskId);
}

export function getLogs(taskId: string): TaskLog[] {
  const task = repository.findById(taskId);
  if (!task) {
    throw new NotFoundError(`Task not found: ${taskId}`);
  }
  return repository.findLogsByTaskId(taskId);
}

export function deleteDoneTasks(workspaceId: string): number {
  return repository.deleteDoneByWorkspace(workspaceId);
}
