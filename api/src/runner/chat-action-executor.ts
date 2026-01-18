import * as agentService from '../agent/service.ts';
import * as chatService from '../chat/service.ts';
import type { Chat } from '../chat/types.ts';
import { logger } from '../core/logger.ts';
import * as workspaceService from '../workspace/service.ts';
import type { Workspace } from '../workspace/types.ts';
import type { ActionResult, ChatAction } from './types.ts';

/**
 * Context for executing chat actions
 */
export interface ChatActionContext {
  chat: Chat;
  workspace: Workspace;
  canRename: boolean;
}

/**
 * Execute a list of chat actions (Malamar agent actions)
 *
 * This function processes actions from CLI output and executes them:
 * - create_agent: Creates a new agent in the workspace
 * - update_agent: Updates an existing agent
 * - delete_agent: Deletes an agent
 * - reorder_agents: Changes the order of agents in the workspace
 * - update_workspace: Updates workspace settings
 * - rename_chat: Renames the chat title (only on first agent response)
 *
 * All actions are executed in sequence. If any action fails, an error is
 * recorded but processing continues for remaining actions.
 *
 * @param context - The chat, workspace, and rename permission context
 * @param actions - List of actions to execute
 * @returns Array of results for each action with success/failure status
 */
export function executeChatActions(
  context: ChatActionContext,
  actions: ChatAction[]
): ActionResult[] {
  const { chat, workspace, canRename } = context;
  const results: ActionResult[] = [];

  for (const action of actions) {
    const result = executeSingleAction(chat, workspace, action, canRename);
    results.push(result);
  }

  // Add system message if any actions failed
  const failedResults = results.filter((r) => !r.success);
  if (failedResults.length > 0) {
    const errorSummary = `Some actions failed:\n${failedResults.map((r) => `- ${r.action.type}: ${r.error}`).join('\n')}`;
    chatService.addSystemMessage(chat.id, errorSummary);
  }

  return results;
}

/**
 * Execute a single chat action
 *
 * @param chat - The chat
 * @param workspace - The workspace
 * @param action - The action to execute
 * @param canRename - Whether rename_chat is allowed (first response only)
 * @returns Result of the action execution
 */
function executeSingleAction(
  chat: Chat,
  workspace: Workspace,
  action: ChatAction,
  canRename: boolean
): ActionResult {
  try {
    const success = executeActionByType(chat, workspace, action, canRename);
    return {
      action,
      success,
      error: success ? undefined : 'Action skipped',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to execute chat action', {
      chatId: chat.id,
      actionType: action.type,
      error: errorMessage,
    });
    return {
      action,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Execute an action by its type
 *
 * @param chat - The chat
 * @param workspace - The workspace
 * @param action - The action to execute
 * @param canRename - Whether rename_chat is allowed
 * @returns true if the action was executed successfully, false if skipped
 * @throws Error if the action fails
 */
function executeActionByType(
  chat: Chat,
  workspace: Workspace,
  action: ChatAction,
  canRename: boolean
): boolean {
  switch (action.type) {
    case 'create_agent':
      return executeCreateAgent(chat, workspace, action);

    case 'update_agent':
      return executeUpdateAgent(chat, action);

    case 'delete_agent':
      return executeDeleteAgent(chat, action);

    case 'reorder_agents':
      return executeReorderAgents(chat, workspace, action);

    case 'update_workspace':
      return executeUpdateWorkspace(chat, workspace, action);

    case 'rename_chat':
      return executeRenameChat(chat, action, canRename);

    default: {
      // Type exhaustiveness check - will fail at compile time if a new action type is added
      const _exhaustive: never = action;
      throw new Error(`Unhandled chat action type: ${(_exhaustive as ChatAction).type}`);
    }
  }
}

/**
 * Execute create_agent action
 */
function executeCreateAgent(
  chat: Chat,
  workspace: Workspace,
  action: Extract<ChatAction, { type: 'create_agent' }>
): boolean {
  agentService.createAgent({
    workspaceId: workspace.id,
    name: action.name,
    instruction: action.instruction,
    cliType: action.cliType,
    order: action.order,
  });

  logger.info('Created agent via chat action', {
    chatId: chat.id,
    agentName: action.name,
  });

  return true;
}

/**
 * Execute update_agent action
 */
function executeUpdateAgent(
  chat: Chat,
  action: Extract<ChatAction, { type: 'update_agent' }>
): boolean {
  agentService.updateAgent(action.agentId, {
    name: action.name,
    instruction: action.instruction,
    cliType: action.cliType,
    order: action.order,
  });

  logger.info('Updated agent via chat action', {
    chatId: chat.id,
    agentId: action.agentId,
  });

  return true;
}

/**
 * Execute delete_agent action
 */
function executeDeleteAgent(
  chat: Chat,
  action: Extract<ChatAction, { type: 'delete_agent' }>
): boolean {
  agentService.deleteAgent(action.agentId);

  logger.info('Deleted agent via chat action', {
    chatId: chat.id,
    agentId: action.agentId,
  });

  return true;
}

/**
 * Execute reorder_agents action
 */
function executeReorderAgents(
  chat: Chat,
  workspace: Workspace,
  action: Extract<ChatAction, { type: 'reorder_agents' }>
): boolean {
  agentService.reorderAgents(workspace.id, action.agentIds);

  logger.info('Reordered agents via chat action', {
    chatId: chat.id,
    agentIds: action.agentIds,
  });

  return true;
}

/**
 * Execute update_workspace action
 */
function executeUpdateWorkspace(
  chat: Chat,
  workspace: Workspace,
  action: Extract<ChatAction, { type: 'update_workspace' }>
): boolean {
  workspaceService.updateWorkspace(workspace.id, {
    title: action.title,
    description: action.description,
    workingDirectoryPath: action.workingDirectory,
    notifyOnError: action.notifyOnError,
    notifyOnInReview: action.notifyOnInReview,
  });

  logger.info('Updated workspace via chat action', {
    chatId: chat.id,
    workspaceId: workspace.id,
  });

  return true;
}

/**
 * Execute rename_chat action
 */
function executeRenameChat(
  chat: Chat,
  action: Extract<ChatAction, { type: 'rename_chat' }>,
  canRename: boolean
): boolean {
  if (!canRename) {
    logger.debug('Skipping rename_chat action - not first response', { chatId: chat.id });
    return false;
  }

  chatService.renameChat(chat.id, action.title);

  logger.info('Renamed chat via chat action', {
    chatId: chat.id,
    newTitle: action.title,
  });

  return true;
}

/**
 * Count successfully executed actions from results
 *
 * @param results - Array of action results
 * @returns Number of successful actions
 */
export function countSuccessfulActions(results: ActionResult[]): number {
  return results.filter((r) => r.success).length;
}

/**
 * Get error messages from failed actions
 *
 * @param results - Array of action results
 * @returns Array of error strings for failed actions
 */
export function getFailedActionErrors(results: ActionResult[]): string[] {
  return results
    .filter((r) => !r.success && r.error)
    .map((r) => `${r.action.type}: ${r.error}`);
}
