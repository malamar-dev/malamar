import { describe, expect, test } from 'bun:test';

import { buildChatContext, buildChatInput, buildTaskInput } from './input-builder.ts';
import type {
  AgentContext,
  ChatContext,
  ChatMessageContext,
  CliHealthContext,
  TaskActivityLogContext,
  TaskCommentContext,
  TaskContext,
  WorkspaceContext,
} from './types.ts';

/**
 * Create a minimal task context for testing
 */
function createTaskContext(overrides?: Partial<TaskContext>): TaskContext {
  return {
    taskId: 'task-123',
    taskSummary: 'Fix the login bug',
    taskDescription: 'The login page shows a blank screen when credentials are invalid.',
    workspaceId: 'ws-456',
    workspaceTitle: 'My Project',
    workspaceDescription: 'A test workspace',
    workspaceInstruction: 'Always write clean, well-tested code.',
    agentId: 'agent-789',
    agentName: 'Implementer',
    agentInstruction: 'You are a skilled developer. Implement features carefully.',
    agentCliType: 'claude',
    comments: [],
    activityLogs: [],
    ...overrides,
  };
}

/**
 * Create a minimal chat context for testing
 */
function createChatContext(overrides?: Partial<ChatContext>): ChatContext {
  return {
    chatId: 'chat-123',
    chatTitle: 'Help with agents',
    workspaceId: 'ws-456',
    workspaceTitle: 'My Project',
    workspaceDescription: 'A test workspace',
    workspaceInstruction: 'Always write clean code.',
    workspaceWorkingDirectory: '/tmp/test-workspace',
    agentId: null,
    agentName: null,
    agentInstruction: null,
    cliOverride: null,
    messages: [],
    ...overrides,
  };
}

/**
 * Create a minimal workspace context for testing
 */
function createWorkspaceContext(overrides?: Partial<WorkspaceContext>): WorkspaceContext {
  return {
    workspaceId: 'ws-456',
    workspaceTitle: 'My Project',
    workspaceDescription: 'A test workspace',
    workspaceInstruction: 'Always write clean code.',
    workspaceWorkingDirectory: '/tmp/test-workspace',
    notifyOnError: true,
    notifyOnInReview: true,
    agents: [],
    availableClis: [],
    mailgunConfigured: false,
    ...overrides,
  };
}

describe('buildTaskInput', () => {
  test('builds basic task input with all sections', () => {
    const context = createTaskContext();
    const result = buildTaskInput(context, ['Planner', 'Implementer', 'Reviewer']);

    expect(result.content).toContain('# Malamar Context');
    expect(result.content).toContain('You are being orchestrated by Malamar');
    expect(result.content).toContain('Always write clean, well-tested code.');
    expect(result.content).toContain('# Your Role');
    expect(result.content).toContain('You are a skilled developer');
    expect(result.content).toContain('## Other Agents in This Workflow');
    expect(result.content).toContain('- Planner');
    expect(result.content).toContain('- Implementer');
    expect(result.content).toContain('- Reviewer');
    expect(result.content).toContain('# Task');
    expect(result.content).toContain('## Summary');
    expect(result.content).toContain('Fix the login bug');
    expect(result.content).toContain('## Description');
    expect(result.content).toContain('login page shows a blank screen');
    expect(result.content).toContain('## Comments');
    expect(result.content).toContain('## Activity Log');
    expect(result.content).toContain('# Output Instruction');
  });

  test('generates unique output path with nanoid', () => {
    const context = createTaskContext();
    const result1 = buildTaskInput(context, []);
    const result2 = buildTaskInput(context, []);

    expect(result1.outputPath).toMatch(/^\/tmp\/malamar_output_[A-Za-z0-9_-]{21}\.json$/);
    expect(result2.outputPath).toMatch(/^\/tmp\/malamar_output_[A-Za-z0-9_-]{21}\.json$/);
    expect(result1.outputPath).not.toBe(result2.outputPath);
  });

  test('uses custom temp directory', () => {
    const context = createTaskContext();
    const result = buildTaskInput(context, [], '/custom/temp');

    expect(result.outputPath).toMatch(/^\/custom\/temp\/malamar_output_[A-Za-z0-9_-]{21}\.json$/);
    expect(result.content).toContain('/custom/temp/malamar_output_');
  });

  test('handles missing workspace instruction', () => {
    const context = createTaskContext({ workspaceInstruction: null });
    const result = buildTaskInput(context, []);

    expect(result.content).toContain('# Malamar Context');
    expect(result.content).toContain('You are being orchestrated by Malamar');
    expect(result.content).not.toContain('Always write clean, well-tested code.');
  });

  test('handles missing task description', () => {
    const context = createTaskContext({ taskDescription: null });
    const result = buildTaskInput(context, []);

    expect(result.content).toContain('## Summary');
    expect(result.content).toContain('Fix the login bug');
    expect(result.content).not.toContain('## Description');
  });

  test('handles empty agent list', () => {
    const context = createTaskContext();
    const result = buildTaskInput(context, []);

    expect(result.content).not.toContain('## Other Agents in This Workflow');
    expect(result.content).not.toContain('- Planner');
  });

  test('formats comments in JSONL format', () => {
    const comments: TaskCommentContext[] = [
      {
        author: 'Planner',
        content: '## My Plan\n\n1. First step\n2. Second step',
        createdAt: '2025-01-17T10:00:00Z',
      },
      {
        author: 'User',
        content: 'Looks good, proceed!',
        createdAt: '2025-01-17T10:05:00Z',
      },
      {
        author: 'System',
        content: 'Error: CLI timeout after 30s',
        createdAt: '2025-01-17T10:10:00Z',
      },
    ];
    const context = createTaskContext({ comments });
    const result = buildTaskInput(context, []);

    expect(result.content).toContain('## Comments');
    expect(result.content).toContain('```json');
    expect(result.content).toContain(
      '{"author":"Planner","content":"## My Plan\\n\\n1. First step\\n2. Second step","created_at":"2025-01-17T10:00:00Z"}'
    );
    expect(result.content).toContain(
      '{"author":"User","content":"Looks good, proceed!","created_at":"2025-01-17T10:05:00Z"}'
    );
    expect(result.content).toContain(
      '{"author":"System","content":"Error: CLI timeout after 30s","created_at":"2025-01-17T10:10:00Z"}'
    );
  });

  test('shows placeholder for empty comments', () => {
    const context = createTaskContext({ comments: [] });
    const result = buildTaskInput(context, []);

    expect(result.content).toContain('## Comments');
    expect(result.content).toContain('_No comments yet._');
  });

  test('formats activity logs in JSONL format', () => {
    const activityLogs: TaskActivityLogContext[] = [
      {
        eventType: 'task_created',
        actorType: 'user',
        actorId: '000000000000000000000',
        metadata: null,
        createdAt: '2025-01-17T09:55:00Z',
      },
      {
        eventType: 'status_changed',
        actorType: 'system',
        actorId: null,
        metadata: { old_status: 'todo', new_status: 'in_progress' },
        createdAt: '2025-01-17T09:56:00Z',
      },
      {
        eventType: 'agent_started',
        actorType: 'agent',
        actorId: 'agent-123',
        metadata: { agent_name: 'Planner' },
        createdAt: '2025-01-17T09:56:01Z',
      },
    ];
    const context = createTaskContext({ activityLogs });
    const result = buildTaskInput(context, []);

    expect(result.content).toContain('## Activity Log');
    expect(result.content).toContain('```json');
    expect(result.content).toContain(
      '{"event_type":"task_created","actor_type":"user","created_at":"2025-01-17T09:55:00Z","actor_id":"000000000000000000000"}'
    );
    expect(result.content).toContain(
      '{"event_type":"status_changed","actor_type":"system","created_at":"2025-01-17T09:56:00Z","metadata":{"old_status":"todo","new_status":"in_progress"}}'
    );
    expect(result.content).toContain(
      '{"event_type":"agent_started","actor_type":"agent","created_at":"2025-01-17T09:56:01Z","actor_id":"agent-123","metadata":{"agent_name":"Planner"}}'
    );
  });

  test('shows placeholder for empty activity logs', () => {
    const context = createTaskContext({ activityLogs: [] });
    const result = buildTaskInput(context, []);

    expect(result.content).toContain('## Activity Log');
    expect(result.content).toContain('_No activity yet._');
  });

  test('handles special characters in comment content', () => {
    const comments: TaskCommentContext[] = [
      {
        author: 'Agent',
        content: 'Contains "quotes" and \\backslashes\\ and newlines\nand tabs\there',
        createdAt: '2025-01-17T10:00:00Z',
      },
    ];
    const context = createTaskContext({ comments });
    const result = buildTaskInput(context, []);

    // Verify JSON is valid by parsing the JSONL line
    const jsonSection = result.content.match(/```json\n([\s\S]*?)\n```/);
    expect(jsonSection).toBeTruthy();
    if (jsonSection) {
      const jsonLine = jsonSection[1]!.trim();
      const parsed = JSON.parse(jsonLine);
      expect(parsed.author).toBe('Agent');
      expect(parsed.content).toBe(
        'Contains "quotes" and \\backslashes\\ and newlines\nand tabs\there'
      );
    }
  });

  test('includes output instruction at the end', () => {
    const context = createTaskContext();
    const result = buildTaskInput(context, []);

    expect(result.content).toContain('# Output Instruction');
    expect(result.content).toContain(`Write your response as JSON to: ${result.outputPath}`);
  });
});

describe('buildChatInput', () => {
  test('builds basic chat input with all sections', () => {
    const context = createChatContext();
    const result = buildChatInput(context);

    expect(result.content).toContain('# Malamar Chat Context');
    expect(result.content).toContain("You are being invoked by Malamar's chat feature.");
    expect(result.content).toContain('## Chat Metadata');
    expect(result.content).toContain('- Chat ID: chat-123');
    expect(result.content).toContain('- Workspace: My Project');
    expect(result.content).toContain('- Agent: Malamar');
    expect(result.content).toContain('## Conversation History');
    expect(result.content).toContain('## Additional Context');
    expect(result.content).toContain('# Output Instruction');
  });

  test('generates unique output path with nanoid', () => {
    const context = createChatContext();
    const result1 = buildChatInput(context);
    const result2 = buildChatInput(context);

    expect(result1.outputPath).toMatch(/^\/tmp\/malamar_chat_output_[A-Za-z0-9_-]{21}\.json$/);
    expect(result2.outputPath).toMatch(/^\/tmp\/malamar_chat_output_[A-Za-z0-9_-]{21}\.json$/);
    expect(result1.outputPath).not.toBe(result2.outputPath);
  });

  test('uses custom temp directory', () => {
    const context = createChatContext();
    const result = buildChatInput(context, '/custom/temp');

    expect(result.outputPath).toMatch(
      /^\/custom\/temp\/malamar_chat_output_[A-Za-z0-9_-]{21}\.json$/
    );
    expect(result.content).toContain('/custom/temp/malamar_chat_output_');
    expect(result.content).toContain('/custom/temp/malamar_chat_chat-123_context.md');
  });

  test('includes agent instruction when present', () => {
    const context = createChatContext({
      agentName: 'Reviewer',
      agentInstruction: 'You are a code reviewer. Review code carefully.',
    });
    const result = buildChatInput(context);

    expect(result.content).toContain('You are a code reviewer. Review code carefully.');
    expect(result.content).toContain('- Agent: Reviewer');
  });

  test('shows Malamar as agent name when no agent', () => {
    const context = createChatContext({ agentName: null });
    const result = buildChatInput(context);

    expect(result.content).toContain('- Agent: Malamar');
  });

  test('formats messages in JSONL format', () => {
    const messages: ChatMessageContext[] = [
      {
        role: 'user',
        content: 'Help me create a reviewer agent',
        createdAt: '2025-01-17T10:00:00Z',
      },
      {
        role: 'agent',
        content: 'Sure! What kind of work will this reviewer focus on?',
        createdAt: '2025-01-17T10:00:30Z',
      },
      {
        role: 'user',
        content: 'Code review for TypeScript',
        createdAt: '2025-01-17T10:01:00Z',
      },
      {
        role: 'system',
        content: 'User has uploaded /tmp/malamar_chat_abc123_attachments/style-guide.md',
        createdAt: '2025-01-17T10:01:30Z',
      },
    ];
    const context = createChatContext({ messages });
    const result = buildChatInput(context);

    expect(result.content).toContain('## Conversation History');
    expect(result.content).toContain('```json');
    expect(result.content).toContain(
      '{"role":"user","content":"Help me create a reviewer agent","created_at":"2025-01-17T10:00:00Z"}'
    );
    expect(result.content).toContain(
      '{"role":"agent","content":"Sure! What kind of work will this reviewer focus on?","created_at":"2025-01-17T10:00:30Z"}'
    );
    expect(result.content).toContain(
      '{"role":"user","content":"Code review for TypeScript","created_at":"2025-01-17T10:01:00Z"}'
    );
    expect(result.content).toContain(
      '{"role":"system","content":"User has uploaded /tmp/malamar_chat_abc123_attachments/style-guide.md","created_at":"2025-01-17T10:01:30Z"}'
    );
  });

  test('shows placeholder for empty messages', () => {
    const context = createChatContext({ messages: [] });
    const result = buildChatInput(context);

    expect(result.content).toContain('## Conversation History');
    expect(result.content).toContain('_No messages yet._');
  });

  test('includes context file reference', () => {
    const context = createChatContext();
    const result = buildChatInput(context);

    expect(result.content).toContain('## Additional Context');
    expect(result.content).toContain(
      'For workspace state and settings, read: /tmp/malamar_chat_chat-123_context.md'
    );
  });
});

describe('buildChatContext', () => {
  test('builds basic workspace context with all sections', () => {
    const context = createWorkspaceContext();
    const result = buildChatContext(context);

    expect(result).toContain('# Workspace Context');
    expect(result).toContain('## Workspace Settings');
    expect(result).toContain('- **ID:** ws-456');
    expect(result).toContain('- **Title:** My Project');
    expect(result).toContain('- **Description:** A test workspace');
    expect(result).toContain('- **Instruction:** Always write clean code.');
    expect(result).toContain('- **Working Directory:** /tmp/test-workspace');
    expect(result).toContain('- **Notify on Error:** Yes');
    expect(result).toContain('- **Notify on In Review:** Yes');
    expect(result).toContain('## Agents');
    expect(result).toContain('## Available CLIs');
    expect(result).toContain('## Email Notifications');
  });

  test('handles missing optional workspace fields', () => {
    const context = createWorkspaceContext({
      workspaceDescription: null,
      workspaceInstruction: null,
      workspaceWorkingDirectory: null,
    });
    const result = buildChatContext(context);

    expect(result).toContain('- **ID:** ws-456');
    expect(result).toContain('- **Title:** My Project');
    expect(result).not.toContain('- **Description:**');
    expect(result).not.toContain('- **Instruction:**');
    expect(result).not.toContain('- **Working Directory:**');
  });

  test('formats agents with IDs and instructions', () => {
    const agents: AgentContext[] = [
      {
        id: 'agent-1',
        name: 'Planner',
        instruction: 'You are a planner. Plan tasks carefully.',
        cliType: 'claude',
        order: 1,
      },
      {
        id: 'agent-2',
        name: 'Implementer',
        instruction: 'You are an implementer. Write clean code.',
        cliType: 'gemini',
        order: 2,
      },
      {
        id: 'agent-3',
        name: 'Reviewer',
        instruction: 'You are a reviewer. Review thoroughly.',
        cliType: null,
        order: 3,
      },
    ];
    const context = createWorkspaceContext({ agents });
    const result = buildChatContext(context);

    expect(result).toContain('## Agents');
    expect(result).toContain(
      'The following agents are configured in this workspace, listed in execution order:'
    );
    expect(result).toContain('### Planner (id: agent-1) [CLI: claude]');
    expect(result).toContain('You are a planner. Plan tasks carefully.');
    expect(result).toContain('### Implementer (id: agent-2) [CLI: gemini]');
    expect(result).toContain('You are an implementer. Write clean code.');
    expect(result).toContain('### Reviewer (id: agent-3)');
    expect(result).not.toContain('### Reviewer (id: agent-3) [CLI:');
    expect(result).toContain('You are a reviewer. Review thoroughly.');
  });

  test('shows placeholder for empty agents', () => {
    const context = createWorkspaceContext({ agents: [] });
    const result = buildChatContext(context);

    expect(result).toContain('## Agents');
    expect(result).toContain('_No agents configured in this workspace._');
  });

  test('formats CLI health status', () => {
    const availableClis: CliHealthContext[] = [
      { cliType: 'claude', status: 'healthy' },
      { cliType: 'gemini', status: 'unhealthy' },
      { cliType: 'codex', status: 'unknown' },
    ];
    const context = createWorkspaceContext({ availableClis });
    const result = buildChatContext(context);

    expect(result).toContain('## Available CLIs');
    expect(result).toContain('- claude: ✓ healthy');
    expect(result).toContain('- gemini: ✗ unhealthy');
    expect(result).toContain('- codex: ? unknown');
  });

  test('shows placeholder for empty CLI list', () => {
    const context = createWorkspaceContext({ availableClis: [] });
    const result = buildChatContext(context);

    expect(result).toContain('## Available CLIs');
    expect(result).toContain('_No CLI health information available._');
  });

  test('shows mailgun configured message', () => {
    const context = createWorkspaceContext({ mailgunConfigured: true });
    const result = buildChatContext(context);

    expect(result).toContain('## Email Notifications');
    expect(result).toContain('Mailgun is configured. Email notifications are available.');
  });

  test('shows mailgun not configured message', () => {
    const context = createWorkspaceContext({ mailgunConfigured: false });
    const result = buildChatContext(context);

    expect(result).toContain('## Email Notifications');
    expect(result).toContain('Mailgun is not configured. Email notifications are disabled.');
    expect(result).toContain('Configure Mailgun in settings to enable notifications.');
  });

  test('formats notification settings correctly', () => {
    const context1 = createWorkspaceContext({ notifyOnError: true, notifyOnInReview: false });
    const result1 = buildChatContext(context1);
    expect(result1).toContain('- **Notify on Error:** Yes');
    expect(result1).toContain('- **Notify on In Review:** No');

    const context2 = createWorkspaceContext({ notifyOnError: false, notifyOnInReview: true });
    const result2 = buildChatContext(context2);
    expect(result2).toContain('- **Notify on Error:** No');
    expect(result2).toContain('- **Notify on In Review:** Yes');
  });
});
