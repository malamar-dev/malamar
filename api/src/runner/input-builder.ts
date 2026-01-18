import { generateId } from '../shared/nanoid.ts';
import type {
  ChatContext,
  ChatMessageContext,
  TaskActivityLogContext,
  TaskCommentContext,
  TaskContext,
  WorkspaceContext,
} from './types.ts';

/**
 * Result of building a task input file
 */
export interface TaskInputResult {
  content: string;
  outputPath: string;
}

/**
 * Result of building a chat input file
 */
export interface ChatInputResult {
  content: string;
  outputPath: string;
}

/**
 * Build the task input markdown file content for CLI consumption
 *
 * The input file follows this structure:
 * - Malamar Context (workspace instruction)
 * - Your Role (agent instruction)
 * - Other Agents in This Workflow
 * - Task (summary, description, comments, activity log)
 * - Output Instruction
 *
 * @param context - The task context containing all necessary data
 * @param otherAgents - List of agent names in the workflow (ordered)
 * @param tempDir - The temp directory path (default: /tmp)
 * @returns The markdown content and output file path
 */
export function buildTaskInput(
  context: TaskContext,
  otherAgents: string[],
  tempDir: string = '/tmp'
): TaskInputResult {
  const outputId = generateId();
  const outputPath = `${tempDir}/malamar_output_${outputId}.json`;

  const sections: string[] = [];

  // Malamar Context section
  sections.push('# Malamar Context');
  sections.push('You are being orchestrated by Malamar, a multi-agent workflow system.');
  if (context.workspaceInstruction) {
    sections.push(context.workspaceInstruction);
  }
  sections.push('');

  // Your Role section
  sections.push('# Your Role');
  sections.push(context.agentInstruction);
  sections.push('');

  // Other Agents section
  if (otherAgents.length > 0) {
    sections.push('## Other Agents in This Workflow');
    for (const agentName of otherAgents) {
      sections.push(`- ${agentName}`);
    }
    sections.push('');
  }

  // Task section
  sections.push('# Task');
  sections.push('## Summary');
  sections.push(context.taskSummary);
  sections.push('');

  if (context.taskDescription) {
    sections.push('## Description');
    sections.push(context.taskDescription);
    sections.push('');
  }

  // Comments section (JSONL format)
  sections.push('## Comments');
  sections.push('');
  if (context.comments.length > 0) {
    sections.push('```json');
    for (const comment of context.comments) {
      sections.push(formatTaskComment(comment));
    }
    sections.push('```');
  } else {
    sections.push('_No comments yet._');
  }
  sections.push('');

  // Activity Log section (JSONL format)
  sections.push('## Activity Log');
  sections.push('');
  if (context.activityLogs.length > 0) {
    sections.push('```json');
    for (const log of context.activityLogs) {
      sections.push(formatActivityLog(log));
    }
    sections.push('```');
  } else {
    sections.push('_No activity yet._');
  }
  sections.push('');

  // Output Instruction section
  sections.push('# Output Instruction');
  sections.push(`Write your response as JSON to: ${outputPath}`);

  return {
    content: sections.join('\n'),
    outputPath,
  };
}

/**
 * Build the chat input markdown file content for CLI consumption
 *
 * The input file follows this structure:
 * - Malamar Chat Context
 * - Chat Metadata
 * - Conversation History (JSONL)
 * - Additional Context reference
 * - Output Instruction
 *
 * @param context - The chat context containing all necessary data
 * @param tempDir - The temp directory path (default: /tmp)
 * @returns The markdown content and output file path
 */
export function buildChatInput(context: ChatContext, tempDir: string = '/tmp'): ChatInputResult {
  const outputId = generateId();
  const outputPath = `${tempDir}/malamar_chat_output_${outputId}.json`;

  const sections: string[] = [];

  // Malamar Chat Context section
  sections.push('# Malamar Chat Context');
  sections.push('');
  sections.push('You are being invoked by Malamar\'s chat feature.');
  if (context.agentInstruction) {
    sections.push(context.agentInstruction);
  }
  sections.push('');

  // Chat Metadata section
  sections.push('## Chat Metadata');
  sections.push('');
  sections.push(`- Chat ID: ${context.chatId}`);
  sections.push(`- Workspace: ${context.workspaceTitle}`);
  sections.push(`- Agent: ${context.agentName || 'Malamar'}`);
  sections.push('');

  // Conversation History section (JSONL format)
  sections.push('## Conversation History');
  sections.push('');
  if (context.messages.length > 0) {
    sections.push('```json');
    for (const message of context.messages) {
      sections.push(formatChatMessage(message));
    }
    sections.push('```');
  } else {
    sections.push('_No messages yet._');
  }
  sections.push('');

  // Additional Context section
  sections.push('## Additional Context');
  sections.push('');
  sections.push(`For workspace state and settings, read: ${tempDir}/malamar_chat_${context.chatId}_context.md`);
  sections.push('');

  // Output Instruction section
  sections.push('# Output Instruction');
  sections.push('');
  sections.push(`Write your response as JSON to: ${outputPath}`);

  return {
    content: sections.join('\n'),
    outputPath,
  };
}

/**
 * Build the chat context markdown file content
 *
 * This file contains workspace state information that agents can read when needed:
 * - Workspace settings
 * - All agents with IDs (for structured actions)
 * - Available CLIs and health status
 * - Mailgun configuration status
 *
 * Note: Task summaries are NOT included per technical design.
 *
 * @param context - The workspace context containing all necessary data
 * @returns The markdown content
 */
export function buildChatContext(context: WorkspaceContext): string {
  const sections: string[] = [];

  // Header
  sections.push('# Workspace Context');
  sections.push('');

  // Workspace Settings section
  sections.push('## Workspace Settings');
  sections.push('');
  sections.push(`- **ID:** ${context.workspaceId}`);
  sections.push(`- **Title:** ${context.workspaceTitle}`);
  if (context.workspaceDescription) {
    sections.push(`- **Description:** ${context.workspaceDescription}`);
  }
  if (context.workspaceInstruction) {
    sections.push(`- **Instruction:** ${context.workspaceInstruction}`);
  }
  if (context.workspaceWorkingDirectory) {
    sections.push(`- **Working Directory:** ${context.workspaceWorkingDirectory}`);
  }
  sections.push(`- **Notify on Error:** ${context.notifyOnError ? 'Yes' : 'No'}`);
  sections.push(`- **Notify on In Review:** ${context.notifyOnInReview ? 'Yes' : 'No'}`);
  sections.push('');

  // Agents section
  sections.push('## Agents');
  sections.push('');
  if (context.agents.length > 0) {
    sections.push(
      'The following agents are configured in this workspace, listed in execution order:'
    );
    sections.push('');
    for (const agent of context.agents) {
      const cliInfo = agent.cliType ? ` [CLI: ${agent.cliType}]` : '';
      sections.push(`### ${agent.name} (id: ${agent.id})${cliInfo}`);
      sections.push('');
      sections.push(agent.instruction);
      sections.push('');
    }
  } else {
    sections.push('_No agents configured in this workspace._');
    sections.push('');
  }

  // Available CLIs section
  sections.push('## Available CLIs');
  sections.push('');
  if (context.availableClis.length > 0) {
    for (const cli of context.availableClis) {
      const statusIcon = cli.status === 'healthy' ? '✓' : cli.status === 'unhealthy' ? '✗' : '?';
      sections.push(`- ${cli.cliType}: ${statusIcon} ${cli.status}`);
    }
  } else {
    sections.push('_No CLI health information available._');
  }
  sections.push('');

  // Mailgun Configuration section
  sections.push('## Email Notifications');
  sections.push('');
  if (context.mailgunConfigured) {
    sections.push('Mailgun is configured. Email notifications are available.');
  } else {
    sections.push(
      'Mailgun is not configured. Email notifications are disabled. Configure Mailgun in settings to enable notifications.'
    );
  }

  return sections.join('\n');
}

/**
 * Format a task comment as a JSONL line
 */
function formatTaskComment(comment: TaskCommentContext): string {
  const obj: Record<string, unknown> = {
    author: comment.author,
    content: comment.content,
    created_at: comment.createdAt,
  };
  return JSON.stringify(obj);
}

/**
 * Format an activity log entry as a JSONL line
 */
function formatActivityLog(log: TaskActivityLogContext): string {
  const obj: Record<string, unknown> = {
    event_type: log.eventType,
    actor_type: log.actorType,
    created_at: log.createdAt,
  };

  if (log.actorId) {
    obj.actor_id = log.actorId;
  }

  if (log.metadata && Object.keys(log.metadata).length > 0) {
    obj.metadata = log.metadata;
  }

  return JSON.stringify(obj);
}

/**
 * Format a chat message as a JSONL line
 */
function formatChatMessage(message: ChatMessageContext): string {
  const obj: Record<string, unknown> = {
    role: message.role,
    content: message.content,
    created_at: message.createdAt,
  };
  return JSON.stringify(obj);
}
