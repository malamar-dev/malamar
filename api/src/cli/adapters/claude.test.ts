import { describe, expect, test } from 'bun:test';

import {
  CHAT_OUTPUT_SCHEMA,
  ClaudeAdapter,
  createClaudeAdapter,
  TASK_OUTPUT_SCHEMA,
} from './claude.ts';

describe('cli/adapters/claude', () => {
  describe('ClaudeAdapter', () => {
    test('has correct cliType', () => {
      const adapter = new ClaudeAdapter();
      expect(adapter.cliType).toBe('claude');
    });

    test('creates adapter with custom binary path', () => {
      const adapter = new ClaudeAdapter({ binaryPath: '/custom/path/claude' });
      expect(adapter.cliType).toBe('claude');
    });
  });

  describe('createClaudeAdapter', () => {
    test('creates adapter instance', () => {
      const adapter = createClaudeAdapter();
      expect(adapter).toBeInstanceOf(ClaudeAdapter);
      expect(adapter.cliType).toBe('claude');
    });

    test('creates adapter with options', () => {
      const adapter = createClaudeAdapter({ binaryPath: '/custom/path' });
      expect(adapter).toBeInstanceOf(ClaudeAdapter);
    });
  });

  describe('invoke', () => {
    test('returns error when binary not found', async () => {
      const adapter = new ClaudeAdapter({ binaryPath: '/non/existent/binary' });
      const result = await adapter.invoke({
        inputPath: '/tmp/test-input.md',
        outputPath: '/tmp/test-output.json',
        cwd: '/tmp',
      });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(-1);
      expect(result.error).toBeDefined();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    test('includes durationMs in result', async () => {
      const adapter = new ClaudeAdapter({ binaryPath: '/non/existent/binary' });
      const result = await adapter.invoke({
        inputPath: '/tmp/test-input.md',
        outputPath: '/tmp/test-output.json',
        cwd: '/tmp',
      });

      expect(typeof result.durationMs).toBe('number');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    test('handles timeout parameter', async () => {
      const adapter = new ClaudeAdapter({ binaryPath: '/non/existent/binary' });
      const result = await adapter.invoke({
        inputPath: '/tmp/test-input.md',
        outputPath: '/tmp/test-output.json',
        cwd: '/tmp',
        timeout: 1000,
      });

      // Should fail immediately since binary doesn't exist
      // (not hit timeout because binary check happens first)
      expect(result.success).toBe(false);
    });

    test('accepts type parameter for schema selection', async () => {
      const adapter = new ClaudeAdapter({ binaryPath: '/non/existent/binary' });

      // Test task type (default)
      const taskResult = await adapter.invoke({
        inputPath: '/tmp/test-input.md',
        outputPath: '/tmp/test-output.json',
        cwd: '/tmp',
        type: 'task',
      });
      expect(taskResult.success).toBe(false); // Expected since binary doesn't exist

      // Test chat type
      const chatResult = await adapter.invoke({
        inputPath: '/tmp/test-input.md',
        outputPath: '/tmp/test-output.json',
        cwd: '/tmp',
        type: 'chat',
      });
      expect(chatResult.success).toBe(false); // Expected since binary doesn't exist
    });
  });

  describe('healthCheck', () => {
    test('returns health result', async () => {
      const adapter = new ClaudeAdapter();
      const result = await adapter.healthCheck();

      expect(result).toHaveProperty('status');
      expect(['healthy', 'unhealthy', 'not_found'].includes(result.status)).toBe(true);
    });

    test('uses custom binary path for health check', async () => {
      const adapter = new ClaudeAdapter({ binaryPath: '/custom/path/claude' });
      const result = await adapter.healthCheck();

      // Should return unhealthy or not_found because the custom path doesn't exist
      expect(['unhealthy', 'not_found'].includes(result.status)).toBe(true);
    });

    test('accepts binary path parameter', async () => {
      const adapter = new ClaudeAdapter();
      const result = await adapter.healthCheck('/custom/path/claude');

      // Should return unhealthy or not_found because the custom path doesn't exist
      expect(['unhealthy', 'not_found'].includes(result.status)).toBe(true);
    });
  });

  describe('TASK_OUTPUT_SCHEMA', () => {
    test('is a valid JSON schema', () => {
      expect(TASK_OUTPUT_SCHEMA).toHaveProperty('$schema');
      expect(TASK_OUTPUT_SCHEMA).toHaveProperty('type');
      expect(TASK_OUTPUT_SCHEMA).toHaveProperty('properties');
    });

    test('requires actions array', () => {
      expect(TASK_OUTPUT_SCHEMA.required).toContain('actions');
    });

    test('defines skip action', () => {
      const actionSchemas = TASK_OUTPUT_SCHEMA.properties.actions.items.oneOf;
      const skipSchema = actionSchemas.find(
        (s: { properties?: { type?: { const?: string } } }) => s.properties?.type?.const === 'skip'
      );
      expect(skipSchema).toBeDefined();
    });

    test('defines comment action', () => {
      const actionSchemas = TASK_OUTPUT_SCHEMA.properties.actions.items.oneOf;
      const commentSchema = actionSchemas.find(
        (s: { properties?: { type?: { const?: string } } }) =>
          s.properties?.type?.const === 'comment'
      );
      expect(commentSchema).toBeDefined();
      expect(commentSchema?.required).toContain('content');
    });

    test('defines change_status action', () => {
      const actionSchemas = TASK_OUTPUT_SCHEMA.properties.actions.items.oneOf;
      const statusSchema = actionSchemas.find(
        (s: { properties?: { type?: { const?: string } } }) =>
          s.properties?.type?.const === 'change_status'
      );
      expect(statusSchema).toBeDefined();
      expect(statusSchema?.required).toContain('status');
    });
  });

  describe('CHAT_OUTPUT_SCHEMA', () => {
    test('is a valid JSON schema', () => {
      expect(CHAT_OUTPUT_SCHEMA).toHaveProperty('$schema');
      expect(CHAT_OUTPUT_SCHEMA).toHaveProperty('type');
      expect(CHAT_OUTPUT_SCHEMA).toHaveProperty('properties');
    });

    test('allows optional message field', () => {
      expect(CHAT_OUTPUT_SCHEMA.properties).toHaveProperty('message');
      // Message is not required
      expect(CHAT_OUTPUT_SCHEMA.required ?? []).not.toContain('message');
    });

    test('defines create_agent action', () => {
      const actionSchemas = CHAT_OUTPUT_SCHEMA.properties.actions?.items?.oneOf ?? [];
      const createAgentSchema = actionSchemas.find(
        (s: { properties?: { type?: { const?: string } } }) =>
          s.properties?.type?.const === 'create_agent'
      );
      expect(createAgentSchema).toBeDefined();
      expect(createAgentSchema?.required).toContain('name');
      expect(createAgentSchema?.required).toContain('instruction');
      expect(createAgentSchema?.required).toContain('cli_type');
    });

    test('defines update_agent action', () => {
      const actionSchemas = CHAT_OUTPUT_SCHEMA.properties.actions?.items?.oneOf ?? [];
      const updateAgentSchema = actionSchemas.find(
        (s: { properties?: { type?: { const?: string } } }) =>
          s.properties?.type?.const === 'update_agent'
      );
      expect(updateAgentSchema).toBeDefined();
      expect(updateAgentSchema?.required).toContain('agent_id');
    });

    test('defines delete_agent action', () => {
      const actionSchemas = CHAT_OUTPUT_SCHEMA.properties.actions?.items?.oneOf ?? [];
      const deleteAgentSchema = actionSchemas.find(
        (s: { properties?: { type?: { const?: string } } }) =>
          s.properties?.type?.const === 'delete_agent'
      );
      expect(deleteAgentSchema).toBeDefined();
      expect(deleteAgentSchema?.required).toContain('agent_id');
    });

    test('defines reorder_agents action', () => {
      const actionSchemas = CHAT_OUTPUT_SCHEMA.properties.actions?.items?.oneOf ?? [];
      const reorderSchema = actionSchemas.find(
        (s: { properties?: { type?: { const?: string } } }) =>
          s.properties?.type?.const === 'reorder_agents'
      );
      expect(reorderSchema).toBeDefined();
      expect(reorderSchema?.required).toContain('agent_ids');
    });

    test('defines update_workspace action', () => {
      const actionSchemas = CHAT_OUTPUT_SCHEMA.properties.actions?.items?.oneOf ?? [];
      const updateWorkspaceSchema = actionSchemas.find(
        (s: { properties?: { type?: { const?: string } } }) =>
          s.properties?.type?.const === 'update_workspace'
      );
      expect(updateWorkspaceSchema).toBeDefined();
    });

    test('defines rename_chat action', () => {
      const actionSchemas = CHAT_OUTPUT_SCHEMA.properties.actions?.items?.oneOf ?? [];
      const renameChatSchema = actionSchemas.find(
        (s: { properties?: { type?: { const?: string } } }) =>
          s.properties?.type?.const === 'rename_chat'
      );
      expect(renameChatSchema).toBeDefined();
      expect(renameChatSchema?.required).toContain('title');
    });
  });

  describe('result structure', () => {
    test('invoke result has correct properties', async () => {
      const adapter = new ClaudeAdapter({ binaryPath: '/non/existent' });
      const result = await adapter.invoke({
        inputPath: '/tmp/input.md',
        outputPath: '/tmp/output.json',
        cwd: '/tmp',
      });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('exitCode');
      expect(result).toHaveProperty('durationMs');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.exitCode).toBe('number');
      expect(typeof result.durationMs).toBe('number');
    });

    test('health result has correct properties', async () => {
      const adapter = new ClaudeAdapter();
      const result = await adapter.healthCheck();

      expect(result).toHaveProperty('status');
      expect(['healthy', 'unhealthy', 'not_found'].includes(result.status)).toBe(true);
    });
  });
});
