import * as agentService from '../agent/service.ts';
import type { Agent } from '../agent/types.ts';
import { getCliAdapter, isCliAdapterAvailable } from '../cli/index.ts';
import { logger } from '../core/logger.ts';
import type { TaskStatus } from '../core/types.ts';
import { emit } from '../events/emitter.ts';
import * as taskRepository from '../task/repository.ts';
import type { Task, TaskQueueItem } from '../task/types.ts';
import * as workspaceService from '../workspace/service.ts';
import type { Workspace } from '../workspace/types.ts';
import { buildTaskInput } from './input-builder.ts';
import { generateErrorComment, parseTaskOutputFile } from './output-parser.ts';
import type {
  TaskAction,
  TaskActivityLogContext,
  TaskCommentContext,
  TaskContext,
} from './types.ts';

/**
 * Result of processing a task
 */
export interface TaskProcessResult {
  success: boolean;
  finalStatus: TaskStatus;
  agentsProcessed: number;
  commentsAdded: number;
  error?: string;
}

/**
 * Configuration options for task processing
 */
export interface TaskWorkerConfig {
  tempDir: string;
}

/**
 * Default task worker configuration
 */
export const DEFAULT_TASK_WORKER_CONFIG: TaskWorkerConfig = {
  tempDir: '/tmp',
};

/**
 * Process a task from the queue
 *
 * This is the main entry point for task processing. It:
 * 1. Fetches the task, workspace, and agents
 * 2. Moves the task to "In Progress" if currently "Todo"
 * 3. Loops through agents by order, invoking each until one changes status
 * 4. Handles errors by adding system comments
 * 5. Updates queue status when done
 *
 * @param queueItem - The queue item to process
 * @param config - Configuration options
 * @returns Result of processing
 */
export async function processTask(
  queueItem: TaskQueueItem,
  config: TaskWorkerConfig = DEFAULT_TASK_WORKER_CONFIG
): Promise<TaskProcessResult> {
  const { taskId, workspaceId } = queueItem;

  logger.info('Starting task processing', { taskId, workspaceId, queueItemId: queueItem.id });

  // Update queue status to in_progress
  taskRepository.updateQueueStatus(queueItem.id, 'in_progress');

  try {
    // Fetch task
    const task = taskRepository.findById(taskId);
    if (!task) {
      logger.error('Task not found', { taskId });
      taskRepository.updateQueueStatus(queueItem.id, 'failed');
      return {
        success: false,
        finalStatus: 'todo',
        agentsProcessed: 0,
        commentsAdded: 0,
        error: `Task not found: ${taskId}`,
      };
    }

    // Fetch workspace
    let workspace: Workspace;
    try {
      workspace = workspaceService.getWorkspace(workspaceId);
    } catch {
      logger.error('Workspace not found', { workspaceId });
      taskRepository.updateQueueStatus(queueItem.id, 'failed');
      return {
        success: false,
        finalStatus: task.status,
        agentsProcessed: 0,
        commentsAdded: 0,
        error: `Workspace not found: ${workspaceId}`,
      };
    }

    // Fetch agents (ordered by order field)
    const agents = agentService.listAgents(workspaceId);
    if (agents.length === 0) {
      logger.warn('No agents configured for workspace', { workspaceId });
      // Move task to in_review since there are no agents to process it
      updateTaskStatus(task, 'in_review', workspace);
      taskRepository.updateQueueStatus(queueItem.id, 'completed');
      return {
        success: true,
        finalStatus: 'in_review',
        agentsProcessed: 0,
        commentsAdded: 0,
      };
    }

    // Move task to "In Progress" if currently "Todo"
    if (task.status === 'todo') {
      updateTaskStatus(task, 'in_progress', workspace);
      task.status = 'in_progress';
    }

    // Process agents in a loop
    const result = await processAgentsLoop(task, workspace, agents, config);

    // Update queue status
    taskRepository.updateQueueStatus(queueItem.id, result.success ? 'completed' : 'failed');

    logger.info('Task processing completed', {
      taskId,
      success: result.success,
      finalStatus: result.finalStatus,
      agentsProcessed: result.agentsProcessed,
      commentsAdded: result.commentsAdded,
    });

    return result;
  } catch (error) {
    logger.error('Unexpected error during task processing', {
      taskId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    taskRepository.updateQueueStatus(queueItem.id, 'failed');

    return {
      success: false,
      finalStatus: 'in_progress',
      agentsProcessed: 0,
      commentsAdded: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process agents in a loop until status is changed or all agents are processed
 *
 * After all agents are processed, if any comment was added, the loop restarts.
 * If all agents skipped, the task is moved to "In Review".
 */
async function processAgentsLoop(
  task: Task,
  workspace: Workspace,
  agents: Agent[],
  config: TaskWorkerConfig
): Promise<TaskProcessResult> {
  let totalAgentsProcessed = 0;
  let totalCommentsAdded = 0;
  let currentTask = task;
  let maxIterations = 100; // Safety limit to prevent infinite loops

  while (maxIterations > 0) {
    maxIterations--;

    const iterationResult = await processAgentsIteration(
      currentTask,
      workspace,
      agents,
      config
    );

    totalAgentsProcessed += iterationResult.agentsProcessed;
    totalCommentsAdded += iterationResult.commentsAdded;

    // If an error occurred, return immediately
    if (!iterationResult.success) {
      return {
        success: false,
        finalStatus: currentTask.status,
        agentsProcessed: totalAgentsProcessed,
        commentsAdded: totalCommentsAdded,
        error: iterationResult.error,
      };
    }

    // If status was changed to something other than in_progress, we're done
    if (iterationResult.statusChanged && iterationResult.newStatus !== 'in_progress') {
      return {
        success: true,
        finalStatus: iterationResult.newStatus,
        agentsProcessed: totalAgentsProcessed,
        commentsAdded: totalCommentsAdded,
      };
    }

    // If a comment was added, retrigger the loop
    if (iterationResult.commentsAdded > 0) {
      logger.debug('Comments added, restarting agent loop', {
        taskId: currentTask.id,
        commentsAdded: iterationResult.commentsAdded,
      });

      // Refresh task to get latest state
      const refreshedTask = taskRepository.findById(currentTask.id);
      if (!refreshedTask) {
        return {
          success: false,
          finalStatus: currentTask.status,
          agentsProcessed: totalAgentsProcessed,
          commentsAdded: totalCommentsAdded,
          error: 'Task was deleted during processing',
        };
      }
      currentTask = refreshedTask;
      continue;
    }

    // All agents skipped, move to "In Review"
    if (iterationResult.allSkipped) {
      updateTaskStatus(currentTask, 'in_review', workspace);
      return {
        success: true,
        finalStatus: 'in_review',
        agentsProcessed: totalAgentsProcessed,
        commentsAdded: totalCommentsAdded,
      };
    }

    // No comments and not all skipped - this shouldn't happen, but break to be safe
    break;
  }

  // If we hit max iterations, that's an error condition
  if (maxIterations === 0) {
    logger.error('Task processing hit max iterations limit', { taskId: task.id });
    return {
      success: false,
      finalStatus: currentTask.status,
      agentsProcessed: totalAgentsProcessed,
      commentsAdded: totalCommentsAdded,
      error: 'Processing hit maximum iterations limit',
    };
  }

  return {
    success: true,
    finalStatus: currentTask.status,
    agentsProcessed: totalAgentsProcessed,
    commentsAdded: totalCommentsAdded,
  };
}

/**
 * Result of a single iteration through agents
 */
interface IterationResult {
  success: boolean;
  agentsProcessed: number;
  commentsAdded: number;
  allSkipped: boolean;
  statusChanged: boolean;
  newStatus: TaskStatus;
  error?: string;
}

/**
 * Process all agents in a single iteration
 */
async function processAgentsIteration(
  task: Task,
  workspace: Workspace,
  agents: Agent[],
  config: TaskWorkerConfig
): Promise<IterationResult> {
  let agentsProcessed = 0;
  let commentsAdded = 0;
  let allSkipped = true;
  let currentStatus = task.status;

  for (const agent of agents) {
    // Check if agent's CLI is available
    if (!isCliAdapterAvailable(agent.cliType)) {
      logger.warn('CLI adapter not available for agent', {
        agentId: agent.id,
        agentName: agent.name,
        cliType: agent.cliType,
      });
      // Skip this agent but don't mark as "skipped" since it's not the agent's decision
      continue;
    }

    // Emit agent execution started event
    emit('agent.execution_started', {
      workspaceId: workspace.id,
      taskId: task.id,
      taskSummary: task.summary,
      agentName: agent.name,
    });

    // Create activity log for agent started
    taskRepository.createLog({
      taskId: task.id,
      workspaceId: workspace.id,
      eventType: 'agent_started',
      actorType: 'agent',
      actorId: agent.id,
      metadata: { agentName: agent.name },
    });

    agentsProcessed++;

    // Process the agent
    const agentResult = await processAgent(task, workspace, agent, agents, config);

    // Create activity log for agent finished
    taskRepository.createLog({
      taskId: task.id,
      workspaceId: workspace.id,
      eventType: 'agent_finished',
      actorType: 'agent',
      actorId: agent.id,
      metadata: {
        agentName: agent.name,
        success: agentResult.success,
        error: agentResult.error,
      },
    });

    // Emit agent execution finished event
    emit('agent.execution_finished', {
      workspaceId: workspace.id,
      taskId: task.id,
      taskSummary: task.summary,
      agentName: agent.name,
    });

    // Handle agent error
    if (!agentResult.success) {
      // Add system error comment
      const errorComment = agentResult.error || 'Unknown error occurred';
      addSystemComment(task, workspace, `[${agent.name}] Error: ${errorComment}`);

      // Emit error event
      emit('task.error_occurred', {
        workspaceId: workspace.id,
        taskId: task.id,
        taskSummary: task.summary,
        errorMessage: errorComment,
      });

      // Continue to next agent or stop based on error severity
      // For now, we'll stop on any error to avoid cascading failures
      return {
        success: false,
        agentsProcessed,
        commentsAdded,
        allSkipped: false,
        statusChanged: false,
        newStatus: currentStatus,
        error: errorComment,
      };
    }

    // Process actions from the agent
    for (const action of agentResult.actions) {
      switch (action.type) {
        case 'skip':
          // Agent skipped, continue to next agent
          break;

        case 'comment':
          allSkipped = false;
          commentsAdded++;
          addAgentComment(task, workspace, agent, action.content);

          // Emit comment added event
          emit('task.comment_added', {
            workspaceId: workspace.id,
            taskId: task.id,
            taskSummary: task.summary,
            authorName: agent.name,
          });
          break;

        case 'change_status': {
          allSkipped = false;
          const newStatus = action.status;
          const oldStatus = currentStatus;

          if (newStatus !== oldStatus) {
            updateTaskStatus(task, newStatus, workspace);
            currentStatus = newStatus;

            // Emit status changed event
            emit('task.status_changed', {
              workspaceId: workspace.id,
              taskId: task.id,
              taskSummary: task.summary,
              oldStatus,
              newStatus,
            });
          }

          // If status changed to anything other than in_progress, stop processing
          if (newStatus !== 'in_progress') {
            return {
              success: true,
              agentsProcessed,
              commentsAdded,
              allSkipped: false,
              statusChanged: true,
              newStatus,
            };
          }
          break;
        }
      }
    }
  }

  return {
    success: true,
    agentsProcessed,
    commentsAdded,
    allSkipped: agentsProcessed > 0 ? allSkipped : false,
    statusChanged: false,
    newStatus: currentStatus,
  };
}

/**
 * Result of processing a single agent
 */
interface AgentProcessResult {
  success: boolean;
  actions: TaskAction[];
  error?: string;
}

/**
 * Process a single agent for a task
 */
async function processAgent(
  task: Task,
  workspace: Workspace,
  agent: Agent,
  allAgents: Agent[],
  config: TaskWorkerConfig
): Promise<AgentProcessResult> {
  const { tempDir } = config;

  try {
    // Build the task context for CLI input
    const context = buildTaskContext(task, workspace, agent);

    // Get list of other agent names
    const otherAgentNames = allAgents
      .filter((a) => a.id !== agent.id)
      .map((a) => a.name);

    // Build the input file
    const { content: inputContent, outputPath } = buildTaskInput(context, otherAgentNames, tempDir);

    // Write input file
    const inputPath = `${tempDir}/malamar_task_${task.id}.md`;
    await Bun.write(inputPath, inputContent);

    // Determine working directory
    const cwd = getWorkingDirectory(workspace, tempDir);

    // Get CLI adapter
    const adapter = getCliAdapter(agent.cliType);

    // Invoke CLI
    logger.debug('Invoking CLI for task', {
      taskId: task.id,
      agentId: agent.id,
      agentName: agent.name,
      cliType: agent.cliType,
      inputPath,
      outputPath,
      cwd,
    });

    const invocationResult = await adapter.invoke({
      inputPath,
      outputPath,
      cwd,
      type: 'task',
    });

    // Clean up input file (best effort)
    try {
      const inputFile = Bun.file(inputPath);
      if (await inputFile.exists()) {
        await Bun.write(inputPath, '');
      }
    } catch {
      // Ignore cleanup errors
    }

    // Handle CLI failure
    if (!invocationResult.success) {
      const errorMessage = generateErrorComment(
        invocationResult.exitCode,
        invocationResult.stderr
      );
      return {
        success: false,
        actions: [],
        error: errorMessage,
      };
    }

    // Parse output file
    const parseResult = await parseTaskOutputFile(outputPath);

    // Clean up output file (best effort)
    try {
      const outputFile = Bun.file(outputPath);
      if (await outputFile.exists()) {
        await Bun.write(outputPath, '');
      }
    } catch {
      // Ignore cleanup errors
    }

    // Handle parse error
    if (!parseResult.success) {
      return {
        success: false,
        actions: [],
        error: parseResult.error,
      };
    }

    return {
      success: true,
      actions: parseResult.data.actions,
    };
  } catch (error) {
    return {
      success: false,
      actions: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Build task context for CLI input
 */
function buildTaskContext(task: Task, workspace: Workspace, agent: Agent): TaskContext {
  // Fetch comments
  const comments = taskRepository.findCommentsByTaskId(task.id);
  const commentContexts: TaskCommentContext[] = comments.map((c) => ({
    author: getCommentAuthor(c.userId, c.agentId),
    content: c.content,
    createdAt: c.createdAt,
  }));

  // Fetch activity logs
  const logs = taskRepository.findLogsByTaskId(task.id);
  const logContexts: TaskActivityLogContext[] = logs.map((l) => ({
    eventType: l.eventType,
    actorType: l.actorType,
    actorId: l.actorId,
    metadata: l.metadata,
    createdAt: l.createdAt,
  }));

  return {
    taskId: task.id,
    taskSummary: task.summary,
    taskDescription: task.description || null,
    workspaceId: workspace.id,
    workspaceTitle: workspace.title,
    workspaceDescription: workspace.description || null,
    workspaceInstruction: null, // Workspace instruction would come from workspace settings if implemented
    agentId: agent.id,
    agentName: agent.name,
    agentInstruction: agent.instruction,
    agentCliType: agent.cliType,
    comments: commentContexts,
    activityLogs: logContexts,
  };
}

/**
 * Get comment author name from user/agent ID
 */
function getCommentAuthor(userId: string | null, agentId: string | null): string {
  if (agentId) {
    // Try to get agent name
    try {
      const agent = agentService.getAgent(agentId);
      return agent.name;
    } catch {
      return `Agent (${agentId})`;
    }
  }
  if (userId) {
    return 'User';
  }
  return 'System';
}

/**
 * Get working directory for CLI invocation
 */
function getWorkingDirectory(workspace: Workspace, tempDir: string): string {
  if (workspace.workingDirectoryMode === 'static' && workspace.workingDirectoryPath) {
    return workspace.workingDirectoryPath;
  }
  // For temp mode or if no path configured, use temp directory
  return tempDir;
}

/**
 * Update task status and create activity log
 */
function updateTaskStatus(task: Task, newStatus: TaskStatus, workspace: Workspace): void {
  const oldStatus = task.status;
  taskRepository.updateStatus(task.id, newStatus);

  // Create activity log
  taskRepository.createLog({
    taskId: task.id,
    workspaceId: workspace.id,
    eventType: 'status_changed',
    actorType: 'system',
    metadata: { oldStatus, newStatus },
  });

  logger.debug('Task status updated', {
    taskId: task.id,
    oldStatus,
    newStatus,
  });
}

/**
 * Add a comment from an agent
 */
function addAgentComment(
  task: Task,
  workspace: Workspace,
  agent: Agent,
  content: string
): void {
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
    eventType: 'comment_added',
    actorType: 'agent',
    actorId: agent.id,
    metadata: { agentName: agent.name },
  });
}

/**
 * Add a system comment (for errors, etc.)
 */
function addSystemComment(task: Task, workspace: Workspace, content: string): void {
  taskRepository.createComment({
    taskId: task.id,
    workspaceId: workspace.id,
    content,
  });

  // Create activity log
  taskRepository.createLog({
    taskId: task.id,
    workspaceId: workspace.id,
    eventType: 'comment_added',
    actorType: 'system',
  });
}
