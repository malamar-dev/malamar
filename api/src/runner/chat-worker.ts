import * as agentService from '../agent/service.ts';
import type { Agent } from '../agent/types.ts';
import * as chatRepository from '../chat/repository.ts';
import * as chatService from '../chat/service.ts';
import type { Chat, ChatQueueItem } from '../chat/types.ts';
import { getCliAdapter, getFirstHealthyCli, isCliAdapterAvailable } from '../cli/index.ts';
import { logger } from '../core/logger.ts';
import type { CliType } from '../core/types.ts';
import { CLI_TYPES } from '../core/types.ts';
import { emit } from '../events/emitter.ts';
import * as settingsService from '../settings/service.ts';
import * as workspaceService from '../workspace/service.ts';
import type { Workspace } from '../workspace/types.ts';
import { buildChatContext, buildChatInput } from './input-builder.ts';
import { generateErrorComment, parseChatOutputFile } from './output-parser.ts';
import type {
  AgentContext,
  ChatAction,
  ChatContext,
  ChatMessageContext,
  CliHealthContext,
  WorkspaceContext,
} from './types.ts';

/**
 * Result of processing a chat
 */
export interface ChatProcessResult {
  success: boolean;
  messageAdded: boolean;
  actionsExecuted: number;
  error?: string;
}

/**
 * Configuration options for chat processing
 */
export interface ChatWorkerConfig {
  tempDir: string;
}

/**
 * Default chat worker configuration
 */
export const DEFAULT_CHAT_WORKER_CONFIG: ChatWorkerConfig = {
  tempDir: '/tmp',
};

/**
 * Process a chat from the queue
 *
 * This is the main entry point for chat processing. It:
 * 1. Fetches the chat, workspace, and agent
 * 2. Determines which CLI to use (chat override > agent default > first healthy)
 * 3. Builds input and context files
 * 4. Invokes the CLI adapter
 * 5. Parses the output
 * 6. Adds agent message to chat
 * 7. Executes any actions from the response
 * 8. Handles chat rename (only on first agent response)
 * 9. Updates queue status
 * 10. Emits SSE events
 *
 * @param queueItem - The queue item to process
 * @param config - Configuration options
 * @returns Result of processing
 */
export async function processChat(
  queueItem: ChatQueueItem,
  config: ChatWorkerConfig = DEFAULT_CHAT_WORKER_CONFIG
): Promise<ChatProcessResult> {
  const { chatId, workspaceId } = queueItem;

  logger.info('Starting chat processing', { chatId, workspaceId, queueItemId: queueItem.id });

  // Update queue status to in_progress
  chatRepository.updateQueueStatus(queueItem.id, 'in_progress');

  try {
    // Fetch chat
    const chat = chatRepository.findById(chatId);
    if (!chat) {
      logger.error('Chat not found', { chatId });
      chatRepository.updateQueueStatus(queueItem.id, 'failed');
      return {
        success: false,
        messageAdded: false,
        actionsExecuted: 0,
        error: `Chat not found: ${chatId}`,
      };
    }

    // Fetch workspace
    let workspace: Workspace;
    try {
      workspace = workspaceService.getWorkspace(workspaceId);
    } catch {
      logger.error('Workspace not found', { workspaceId });
      chatRepository.updateQueueStatus(queueItem.id, 'failed');
      return {
        success: false,
        messageAdded: false,
        actionsExecuted: 0,
        error: `Workspace not found: ${workspaceId}`,
      };
    }

    // Fetch agent (optional)
    let agent: Agent | null = null;
    if (chat.agentId) {
      try {
        agent = agentService.getAgent(chat.agentId);
      } catch {
        logger.warn('Agent not found, using Malamar agent', { agentId: chat.agentId });
        // Continue with null agent (Malamar agent)
      }
    }

    // Determine which CLI to use
    const cliType = determineCli(chat, agent);
    if (!cliType) {
      const errorMessage = 'No healthy CLI adapter available';
      logger.error(errorMessage, { chatId });

      // Add system message
      chatService.addSystemMessage(chatId, `Error: ${errorMessage}`);

      chatRepository.updateQueueStatus(queueItem.id, 'failed');
      return {
        success: false,
        messageAdded: false,
        actionsExecuted: 0,
        error: errorMessage,
      };
    }

    // Verify CLI is available
    if (!isCliAdapterAvailable(cliType)) {
      const errorMessage = `CLI adapter not available: ${cliType}`;
      logger.error(errorMessage, { chatId, cliType });

      // Add system message
      chatService.addSystemMessage(chatId, `Error: ${errorMessage}`);

      chatRepository.updateQueueStatus(queueItem.id, 'failed');
      return {
        success: false,
        messageAdded: false,
        actionsExecuted: 0,
        error: errorMessage,
      };
    }

    // Emit processing started event
    emit('chat.processing_started', {
      workspaceId: workspace.id,
      chatId: chat.id,
      chatTitle: chat.title,
      agentName: agent?.name || 'Malamar',
    });

    // Process the chat
    const result = await processChatWithCli(chat, workspace, agent, cliType, config);

    // Update queue status
    chatRepository.updateQueueStatus(queueItem.id, result.success ? 'completed' : 'failed');

    // Emit processing finished event
    emit('chat.processing_finished', {
      workspaceId: workspace.id,
      chatId: chat.id,
      chatTitle: chat.title,
      agentName: agent?.name || 'Malamar',
      success: result.success,
    });

    logger.info('Chat processing completed', {
      chatId,
      success: result.success,
      messageAdded: result.messageAdded,
      actionsExecuted: result.actionsExecuted,
    });

    return result;
  } catch (error) {
    logger.error('Unexpected error during chat processing', {
      chatId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    chatRepository.updateQueueStatus(queueItem.id, 'failed');

    return {
      success: false,
      messageAdded: false,
      actionsExecuted: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Determine which CLI to use for processing
 *
 * Priority:
 * 1. Chat's CLI override
 * 2. Agent's default CLI type
 * 3. First healthy CLI
 */
function determineCli(chat: Chat, agent: Agent | null): CliType | null {
  // Chat override takes priority
  if (chat.cliType) {
    return chat.cliType;
  }

  // Then agent's CLI type
  if (agent?.cliType) {
    return agent.cliType;
  }

  // Fall back to first healthy CLI
  return getFirstHealthyCli();
}

/**
 * Process the chat with a specific CLI
 */
async function processChatWithCli(
  chat: Chat,
  workspace: Workspace,
  agent: Agent | null,
  cliType: CliType,
  config: ChatWorkerConfig
): Promise<ChatProcessResult> {
  const { tempDir } = config;

  try {
    // Build chat context
    const context = buildChatContextData(chat, workspace, agent);

    // Build workspace context
    const workspaceContext = buildWorkspaceContextData(workspace);

    // Build the input file
    const { content: inputContent, outputPath } = buildChatInput(context, tempDir);

    // Build the context file
    const contextContent = buildChatContext(workspaceContext);

    // Write input file
    const inputPath = `${tempDir}/malamar_chat_${chat.id}.md`;
    await Bun.write(inputPath, inputContent);

    // Write context file
    const contextPath = `${tempDir}/malamar_chat_${chat.id}_context.md`;
    await Bun.write(contextPath, contextContent);

    // Determine working directory
    const cwd = getWorkingDirectory(workspace, tempDir);

    // Get CLI adapter
    const adapter = getCliAdapter(cliType);

    // Invoke CLI
    logger.debug('Invoking CLI for chat', {
      chatId: chat.id,
      cliType,
      inputPath,
      outputPath,
      cwd,
    });

    const invocationResult = await adapter.invoke({
      inputPath,
      outputPath,
      cwd,
      type: 'chat',
    });

    // Clean up input file (best effort)
    await cleanupFile(inputPath);

    // Clean up context file (best effort)
    await cleanupFile(contextPath);

    // Handle CLI failure
    if (!invocationResult.success) {
      const errorMessage = generateErrorComment(invocationResult.exitCode, invocationResult.stderr);

      // Add system error message
      chatService.addSystemMessage(chat.id, `Error: ${errorMessage}`);

      // Emit error event
      emit('chat.error_occurred', {
        workspaceId: workspace.id,
        chatId: chat.id,
        chatTitle: chat.title,
        errorMessage,
      });

      return {
        success: false,
        messageAdded: false,
        actionsExecuted: 0,
        error: errorMessage,
      };
    }

    // Parse output file
    const parseResult = await parseChatOutputFile(outputPath);

    // Clean up output file (best effort)
    await cleanupFile(outputPath);

    // Handle parse error
    if (!parseResult.success) {
      // Add system error message
      chatService.addSystemMessage(chat.id, `Error: ${parseResult.error}`);

      // Emit error event
      emit('chat.error_occurred', {
        workspaceId: workspace.id,
        chatId: chat.id,
        chatTitle: chat.title,
        errorMessage: parseResult.error,
      });

      return {
        success: false,
        messageAdded: false,
        actionsExecuted: 0,
        error: parseResult.error,
      };
    }

    const output = parseResult.data;
    let messageAdded = false;
    let actionsExecuted = 0;

    // Check canRename BEFORE adding the message, since we want to allow
    // rename_chat in the actions of the first agent response
    const canRename = chatService.canRenameChat(chat.id);

    // Add agent message if present
    if (output.message) {
      chatService.addAgentMessage(chat.id, output.message, output.actions);
      messageAdded = true;

      // Emit message added event
      emit('chat.message_added', {
        workspaceId: workspace.id,
        chatId: chat.id,
        chatTitle: chat.title,
        agentName: agent?.name || 'Malamar',
      });
    }

    // Execute actions if present
    if (output.actions && output.actions.length > 0) {
      actionsExecuted = await executeActions(
        chat,
        workspace,
        output.actions,
        canRename
      );
    }

    return {
      success: true,
      messageAdded,
      actionsExecuted,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Add system error message
    chatService.addSystemMessage(chat.id, `Error: ${errorMessage}`);

    return {
      success: false,
      messageAdded: false,
      actionsExecuted: 0,
      error: errorMessage,
    };
  }
}

/**
 * Build chat context data for input file
 */
function buildChatContextData(chat: Chat, workspace: Workspace, agent: Agent | null): ChatContext {
  // Fetch messages
  const messages = chatRepository.findMessagesByChatId(chat.id);
  const messageContexts: ChatMessageContext[] = messages.map((m) => ({
    role: m.role,
    content: m.message,
    createdAt: m.createdAt,
  }));

  return {
    chatId: chat.id,
    chatTitle: chat.title,
    workspaceId: workspace.id,
    workspaceTitle: workspace.title,
    workspaceDescription: workspace.description || null,
    workspaceInstruction: null, // Workspace instruction would come from workspace settings if implemented
    workspaceWorkingDirectory:
      workspace.workingDirectoryMode === 'static' ? workspace.workingDirectoryPath : null,
    agentId: agent?.id || null,
    agentName: agent?.name || null,
    agentInstruction: agent?.instruction || null,
    cliOverride: chat.cliType,
    messages: messageContexts,
  };
}

/**
 * Build workspace context data for context file
 */
function buildWorkspaceContextData(workspace: Workspace): WorkspaceContext {
  // Fetch agents
  const agents = agentService.listAgents(workspace.id);
  const agentContexts: AgentContext[] = agents.map((a) => ({
    id: a.id,
    name: a.name,
    instruction: a.instruction,
    cliType: a.cliType,
    order: a.order,
  }));

  // Get CLI health status for all CLI types
  const cliHealthContexts: CliHealthContext[] = CLI_TYPES.map((cliType) => ({
    cliType,
    status: isCliAdapterAvailable(cliType) ? 'healthy' : 'unhealthy',
  }));

  // Check if Mailgun is configured
  const mailgunConfigured = settingsService.isMailgunConfigured();

  return {
    workspaceId: workspace.id,
    workspaceTitle: workspace.title,
    workspaceDescription: workspace.description || null,
    workspaceInstruction: null,
    workspaceWorkingDirectory:
      workspace.workingDirectoryMode === 'static' ? workspace.workingDirectoryPath : null,
    notifyOnError: workspace.notifyOnError,
    notifyOnInReview: workspace.notifyOnInReview,
    agents: agentContexts,
    availableClis: cliHealthContexts,
    mailgunConfigured,
  };
}

/**
 * Execute chat actions
 *
 * This function processes actions from CLI output and executes them.
 * Actions are executed in order. If any action fails, an error message is added
 * but processing continues for remaining actions.
 *
 * @param chat - The chat
 * @param workspace - The workspace
 * @param actions - List of actions to execute
 * @param canRename - Whether rename_chat is allowed (first response only)
 * @returns Number of successfully executed actions
 */
async function executeActions(
  chat: Chat,
  workspace: Workspace,
  actions: ChatAction[],
  canRename: boolean
): Promise<number> {
  let executedCount = 0;
  const errors: string[] = [];

  for (const action of actions) {
    try {
      const success = await executeAction(chat, workspace, action, canRename);
      if (success) {
        executedCount++;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`${action.type}: ${errorMessage}`);
      logger.error('Failed to execute chat action', {
        chatId: chat.id,
        actionType: action.type,
        error: errorMessage,
      });
    }
  }

  // Add system message if any actions failed
  if (errors.length > 0) {
    const errorSummary = `Some actions failed:\n${errors.map((e) => `- ${e}`).join('\n')}`;
    chatService.addSystemMessage(chat.id, errorSummary);
  }

  return executedCount;
}

/**
 * Execute a single chat action
 */
async function executeAction(
  chat: Chat,
  workspace: Workspace,
  action: ChatAction,
  canRename: boolean
): Promise<boolean> {
  switch (action.type) {
    case 'create_agent':
      agentService.createAgent(workspace.id, {
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

    case 'update_agent':
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

    case 'delete_agent':
      agentService.deleteAgent(action.agentId);
      logger.info('Deleted agent via chat action', {
        chatId: chat.id,
        agentId: action.agentId,
      });
      return true;

    case 'reorder_agents':
      agentService.reorderAgents(workspace.id, action.agentIds);
      logger.info('Reordered agents via chat action', {
        chatId: chat.id,
        agentIds: action.agentIds,
      });
      return true;

    case 'update_workspace':
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

    case 'rename_chat':
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

    default: {
      // Type exhaustiveness check - will fail at compile time if a new action type is added
      const _exhaustive: never = action;
      throw new Error(`Unhandled chat action type: ${(_exhaustive as ChatAction).type}`);
    }
  }
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
 * Clean up a file (best effort)
 */
async function cleanupFile(filePath: string): Promise<void> {
  try {
    const file = Bun.file(filePath);
    if (await file.exists()) {
      await Bun.write(filePath, '');
    }
  } catch {
    // Ignore cleanup errors
  }
}
