import type { Subprocess } from "bun";

import * as agentRepository from "../agent/repository";
import type { Agent } from "../agent/types";
import { invokeTaskCli } from "../task/cli-invoke";
import * as taskRepository from "../task/repository";
import type { TaskCliOutput } from "../task/schemas";
import * as taskService from "../task/service";
import type { Task, TaskQueue } from "../task/types";
import * as workspaceRepository from "../workspace/repository";
import type { Workspace } from "../workspace/types";

/**
 * Map of task_id -> Subprocess for active task processes.
 * Used for cancellation support.
 */
const activeTaskProcesses = new Map<string, Subprocess>();

/**
 * Set of workspace IDs currently being processed.
 * Ensures only one worker per workspace.
 */
const activeWorkers = new Set<string>();

/**
 * Kill an active task process by task ID.
 * Returns true if a process was found and killed.
 */
export function killTaskProcess(taskId: string): boolean {
  const proc = activeTaskProcesses.get(taskId);
  if (proc) {
    proc.kill();
    activeTaskProcesses.delete(taskId);
    return true;
  }
  return false;
}

/**
 * Kill all active task processes.
 * Called during graceful shutdown.
 */
export function killAllTaskProcesses(): void {
  for (const [taskId, proc] of activeTaskProcesses) {
    proc.kill();
    activeTaskProcesses.delete(taskId);
  }
}

/**
 * Get the number of active task processes.
 * Used for monitoring/debugging.
 */
export function getActiveTaskProcessCount(): number {
  return activeTaskProcesses.size;
}

/**
 * Main task processor function.
 * Finds workspaces with queued items and spawns workers.
 */
export async function runTaskProcessor(signal: AbortSignal): Promise<void> {
  if (signal.aborted) return;

  // Find workspaces with queued items
  const workspaceIds = taskRepository.findWorkspacesWithQueuedItems();

  if (workspaceIds.length === 0) return;

  // Spawn workers for workspaces that don't have an active worker
  const newWorkers: Promise<void>[] = [];

  for (const workspaceId of workspaceIds) {
    if (!activeWorkers.has(workspaceId)) {
      activeWorkers.add(workspaceId);
      newWorkers.push(processWorkspaceLoop(workspaceId, signal));
    }
  }

  // Wait for all new workers to complete (they run concurrently)
  if (newWorkers.length > 0) {
    await Promise.allSettled(newWorkers);
  }
}

/**
 * Worker function for a single workspace.
 * Processes queue items in a loop until none remain.
 */
async function processWorkspaceLoop(
  workspaceId: string,
  signal: AbortSignal,
): Promise<void> {
  console.log(`[TaskProcessor] Starting worker for workspace ${workspaceId}`);

  try {
    while (!signal.aborted) {
      // Pick the next queue item
      const queueItem = taskRepository.pickNextQueueItem(workspaceId);

      if (!queueItem) {
        // No more queued items, exit loop
        break;
      }

      await processQueueItem(queueItem, signal);
    }
  } finally {
    activeWorkers.delete(workspaceId);
    console.log(`[TaskProcessor] Worker finished for workspace ${workspaceId}`);
  }
}

/**
 * Process a single queue item through the agent loop.
 */
async function processQueueItem(
  queueItem: TaskQueue,
  signal: AbortSignal,
): Promise<void> {
  const { id: queueId, taskId, workspaceId } = queueItem;

  // Atomically claim the queue item
  const claimed = taskRepository.claimQueueItem(queueId);
  if (!claimed) {
    // Another processor already claimed this item, skip
    return;
  }

  console.log(`[TaskProcessor] Processing task ${taskId}`);

  try {
    // Load task
    const task = taskRepository.findById(taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    // Load workspace
    const workspace = workspaceRepository.findById(workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    // Move task to "in_progress" if it's in "todo"
    if (task.status === "todo") {
      taskService.updateTaskStatusBySystem(taskId, "in_progress");
      // Demote other in-progress tasks
      taskRepository.demoteOtherInProgressTasks(workspaceId, taskId);
    }

    // Load agents for this workspace
    const agents = agentRepository.findByWorkspaceId(workspaceId);

    // Handle workspace with zero agents - immediate move to "in_review"
    if (agents.length === 0) {
      console.log(
        `[TaskProcessor] No agents in workspace, moving task ${taskId} to in_review`,
      );
      taskService.updateTaskStatusBySystem(taskId, "in_review");
      taskRepository.updateQueueStatusById(queueId, "completed");
      return;
    }

    // Execute the agent loop
    await executeAgentLoop(task, workspace, agents, queueId, signal);
  } catch (error) {
    // Handle error: add system comment, mark queue as failed
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.error(
      `[TaskProcessor] Error processing task ${taskId}: ${errorMessage}`,
    );

    // Add system comment with error - this also triggers a new queue item for retry
    taskService.createSystemComment(
      taskId,
      `Processing failed: ${errorMessage}`,
    );

    // Mark queue item as failed
    taskRepository.updateQueueStatusById(queueId, "failed");
  } finally {
    // Clean up subprocess from tracking map
    activeTaskProcesses.delete(taskId);
  }
}

/**
 * Execute the agent loop for a task.
 * Runs agents in order, re-loops if any comment was added.
 */
async function executeAgentLoop(
  task: Task,
  workspace: Workspace,
  agents: Agent[],
  queueId: string,
  signal: AbortSignal,
): Promise<void> {
  const taskId = task.id;
  let iteration = 0;
  const maxIterations = 100; // Safety limit to prevent infinite loops

  while (iteration < maxIterations) {
    iteration++;

    if (signal.aborted) {
      console.log(`[TaskProcessor] Processing aborted for task ${taskId}`);
      return;
    }

    let commentAddedThisPass = false;

    // Execute each agent in order
    for (const agent of agents) {
      if (signal.aborted) {
        return;
      }

      // Fetch fresh agent data (JIT - just in time)
      const freshAgent = agentRepository.findById(agent.id);
      if (!freshAgent) {
        // Agent was deleted mid-processing, skip it
        console.log(`[TaskProcessor] Agent ${agent.id} not found, skipping`);
        continue;
      }

      // Get other agent names for context
      const otherAgentNames = agents
        .filter((a) => a.id !== freshAgent.id)
        .map((a) => a.name);

      // Execute the agent
      const result = await executeAgent(
        task,
        workspace,
        freshAgent,
        otherAgentNames,
        signal,
      );

      if (result.commentAdded) {
        commentAddedThisPass = true;
      }

      if (result.movedToReview) {
        // Agent requested in_review, stop processing
        console.log(
          `[TaskProcessor] Task ${taskId} moved to in_review by agent ${freshAgent.name}`,
        );
        taskRepository.updateQueueStatusById(queueId, "completed");
        return;
      }
    }

    // After all agents have run
    if (!commentAddedThisPass) {
      // All agents skipped, move to in_review
      console.log(
        `[TaskProcessor] All agents skipped for task ${taskId}, moving to in_review`,
      );
      taskService.updateTaskStatusBySystem(taskId, "in_review");
      taskRepository.updateQueueStatusById(queueId, "completed");
      return;
    }

    // Comment was added, re-run the loop from the first agent
    console.log(
      `[TaskProcessor] Comment added during iteration ${iteration}, re-running agent loop for task ${taskId}`,
    );
  }

  // Safety limit reached
  console.warn(
    `[TaskProcessor] Max iterations (${maxIterations}) reached for task ${taskId}`,
  );
  taskService.createSystemComment(
    taskId,
    `Processing stopped: Maximum iterations (${maxIterations}) reached. Task moved to review for investigation.`,
  );
  taskService.updateTaskStatusBySystem(taskId, "in_review");
  taskRepository.updateQueueStatusById(queueId, "completed");
}

/**
 * Execute a single agent on the task.
 */
async function executeAgent(
  task: Task,
  workspace: Workspace,
  agent: Agent,
  otherAgentNames: string[],
  signal: AbortSignal,
): Promise<{ commentAdded: boolean; movedToReview: boolean }> {
  const taskId = task.id;

  // Log agent started
  taskService.logAgentStarted(taskId, agent.id, agent.name);

  // Load comments and logs for context
  const comments = taskRepository.findAllCommentsByTaskId(taskId);
  const logs = taskRepository.findAllLogsByTaskId(taskId);

  // Invoke CLI
  const result = await invokeTaskCli(
    {
      taskId,
      taskSummary: task.summary,
      taskDescription: task.description,
      workspace,
      agent,
      otherAgentNames,
      comments,
      logs,
      onProcess: (proc) => activeTaskProcesses.set(taskId, proc),
    },
    signal,
    taskService.getAgentName,
  );

  // Clean up process tracking
  activeTaskProcesses.delete(taskId);

  // Handle CLI failure
  if (!result.success) {
    console.error(
      `[TaskProcessor] CLI invocation failed for agent ${agent.name}: ${result.error}`,
    );

    // Create system comment with error
    taskService.createSystemComment(
      taskId,
      result.error || "CLI invocation failed",
    );

    // Log agent finished with skip (error counts as skip with system comment)
    taskService.logAgentFinished(taskId, agent.id, agent.name, "skip");

    // Return commentAdded=true because system comment was added
    return { commentAdded: true, movedToReview: false };
  }

  // Process the actions
  return processAgentActions(task, agent, result.output!);
}

/**
 * Process actions returned by an agent.
 */
function processAgentActions(
  task: Task,
  agent: Agent,
  output: TaskCliOutput,
): { commentAdded: boolean; movedToReview: boolean } {
  const taskId = task.id;
  const actions = output.actions;

  let commentAdded = false;
  let movedToReview = false;
  let primaryActionType: "skip" | "comment" | "in_review" = "skip";

  for (const action of actions) {
    switch (action.type) {
      case "skip":
        // No-op, just log
        break;

      case "comment":
        taskService.createAgentComment(taskId, agent.id, action.content);
        commentAdded = true;
        primaryActionType = "comment";
        break;

      case "change_status":
        if (action.status === "in_review") {
          taskService.updateTaskStatusByAgent(taskId, agent.id, "in_review");
          movedToReview = true;
          primaryActionType = "in_review";
        }
        break;
    }
  }

  // Log agent finished with the primary action type
  taskService.logAgentFinished(taskId, agent.id, agent.name, primaryActionType);

  return { commentAdded, movedToReview };
}
