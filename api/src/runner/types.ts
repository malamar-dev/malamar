import type { CliType, TaskStatus } from '../core/types.ts';

/**
 * Task agent action types
 */
export type TaskActionType = 'skip' | 'comment' | 'change_status';

export const TASK_ACTION_TYPES: TaskActionType[] = ['skip', 'comment', 'change_status'];

/**
 * Type guard for task action types
 */
export function isTaskActionType(value: string): value is TaskActionType {
  return TASK_ACTION_TYPES.includes(value as TaskActionType);
}

/**
 * Skip action - agent has nothing to add
 */
export interface SkipAction {
  type: 'skip';
}

/**
 * Comment action - agent adds a comment to the task
 */
export interface CommentAction {
  type: 'comment';
  content: string;
}

/**
 * Change status action - agent changes task status
 */
export interface ChangeStatusAction {
  type: 'change_status';
  status: TaskStatus;
}

/**
 * Union of all task agent actions
 */
export type TaskAction = SkipAction | CommentAction | ChangeStatusAction;

/**
 * Parsed task CLI output
 */
export interface TaskOutput {
  actions: TaskAction[];
}

/**
 * Chat action types
 */
export type ChatActionType =
  | 'create_agent'
  | 'update_agent'
  | 'delete_agent'
  | 'reorder_agents'
  | 'update_workspace'
  | 'rename_chat';

export const CHAT_ACTION_TYPES: ChatActionType[] = [
  'create_agent',
  'update_agent',
  'delete_agent',
  'reorder_agents',
  'update_workspace',
  'rename_chat',
];

/**
 * Type guard for chat action types
 */
export function isChatActionType(value: string): value is ChatActionType {
  return CHAT_ACTION_TYPES.includes(value as ChatActionType);
}

/**
 * Create agent action
 */
export interface CreateAgentAction {
  type: 'create_agent';
  name: string;
  instruction: string;
  cliType?: CliType;
  order?: number;
}

/**
 * Update agent action
 */
export interface UpdateAgentAction {
  type: 'update_agent';
  agentId: string;
  name?: string;
  instruction?: string;
  cliType?: CliType | null;
  order?: number;
}

/**
 * Delete agent action
 */
export interface DeleteAgentAction {
  type: 'delete_agent';
  agentId: string;
}

/**
 * Reorder agents action
 */
export interface ReorderAgentsAction {
  type: 'reorder_agents';
  agentIds: string[];
}

/**
 * Update workspace action
 */
export interface UpdateWorkspaceAction {
  type: 'update_workspace';
  title?: string;
  description?: string;
  workingDirectory?: string;
  notifyOnError?: boolean;
  notifyOnInReview?: boolean;
}

/**
 * Rename chat action (only available on first agent response)
 */
export interface RenameChatAction {
  type: 'rename_chat';
  title: string;
}

/**
 * Union of all chat actions
 */
export type ChatAction =
  | CreateAgentAction
  | UpdateAgentAction
  | DeleteAgentAction
  | ReorderAgentsAction
  | UpdateWorkspaceAction
  | RenameChatAction;

/**
 * Parsed chat CLI output
 */
export interface ChatOutput {
  message?: string;
  actions?: ChatAction[];
}

/**
 * Result of executing an action
 */
export interface ActionResult {
  action: ChatAction;
  success: boolean;
  error?: string;
}

/**
 * Task context for building CLI input file
 */
export interface TaskContext {
  taskId: string;
  taskSummary: string;
  taskDescription: string | null;
  workspaceId: string;
  workspaceTitle: string;
  workspaceDescription: string | null;
  workspaceInstruction: string | null;
  agentId: string;
  agentName: string;
  agentInstruction: string;
  agentCliType: CliType | null;
  comments: TaskCommentContext[];
  activityLogs: TaskActivityLogContext[];
}

/**
 * Task comment in context format
 */
export interface TaskCommentContext {
  author: string;
  content: string;
  createdAt: string;
}

/**
 * Task activity log in context format
 */
export interface TaskActivityLogContext {
  eventType: string;
  actorType: string;
  actorId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

/**
 * Chat context for building CLI input file
 */
export interface ChatContext {
  chatId: string;
  chatTitle: string;
  workspaceId: string;
  workspaceTitle: string;
  workspaceDescription: string | null;
  workspaceInstruction: string | null;
  workspaceWorkingDirectory: string | null;
  agentId: string | null;
  agentName: string | null;
  agentInstruction: string | null;
  cliOverride: CliType | null;
  messages: ChatMessageContext[];
}

/**
 * Chat message in context format
 */
export interface ChatMessageContext {
  role: 'user' | 'agent' | 'system';
  content: string;
  createdAt: string;
}

/**
 * Workspace context for chat context file
 */
export interface WorkspaceContext {
  workspaceId: string;
  workspaceTitle: string;
  workspaceDescription: string | null;
  workspaceInstruction: string | null;
  workspaceWorkingDirectory: string | null;
  notifyOnError: boolean;
  notifyOnInReview: boolean;
  agents: AgentContext[];
  availableClis: CliHealthContext[];
  mailgunConfigured: boolean;
}

/**
 * Agent in workspace context format
 */
export interface AgentContext {
  id: string;
  name: string;
  instruction: string;
  cliType: CliType | null;
  order: number;
}

/**
 * CLI health in context format
 */
export interface CliHealthContext {
  cliType: CliType;
  status: 'healthy' | 'unhealthy' | 'unknown';
}

/**
 * Runner configuration
 */
export interface RunnerConfig {
  pollIntervalMs: number;
  tempDir: string;
}

/**
 * Default runner configuration
 */
export const DEFAULT_RUNNER_CONFIG: RunnerConfig = {
  pollIntervalMs: 1000,
  tempDir: '/tmp',
};

/**
 * File path patterns
 */
export const FILE_PATTERNS = {
  taskInput: (taskId: string) => `malamar_task_${taskId}.md`,
  taskOutput: (nanoid: string) => `malamar_output_${nanoid}.json`,
  chatInput: (chatId: string) => `malamar_chat_${chatId}.md`,
  chatContext: (chatId: string) => `malamar_chat_${chatId}_context.md`,
  chatOutput: (nanoid: string) => `malamar_chat_output_${nanoid}.json`,
  chatAttachments: (chatId: string) => `malamar_chat_${chatId}_attachments`,
} as const;
