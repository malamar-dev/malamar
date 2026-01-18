import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import {
  generateErrorComment,
  parseChatOutput,
  parseChatOutputFile,
  parseTaskOutput,
  parseTaskOutputFile,
  validateChatAction,
  validateChatOutput,
  validateTaskAction,
  validateTaskOutput,
} from './output-parser.ts';

describe('output-parser', () => {
  describe('parseTaskOutput', () => {
    test('parses valid skip action', () => {
      const content = JSON.stringify({
        actions: [{ type: 'skip' }],
      });

      const result = parseTaskOutput(content);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.actions).toHaveLength(1);
        expect(result.data.actions[0]).toEqual({ type: 'skip' });
      }
    });

    test('parses valid comment action', () => {
      const content = JSON.stringify({
        actions: [{ type: 'comment', content: 'This is a comment' }],
      });

      const result = parseTaskOutput(content);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.actions).toHaveLength(1);
        expect(result.data.actions[0]).toEqual({ type: 'comment', content: 'This is a comment' });
      }
    });

    test('parses valid change_status action', () => {
      const content = JSON.stringify({
        actions: [{ type: 'change_status', status: 'in_review' }],
      });

      const result = parseTaskOutput(content);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.actions).toHaveLength(1);
        expect(result.data.actions[0]).toEqual({ type: 'change_status', status: 'in_review' });
      }
    });

    test('parses multiple actions', () => {
      const content = JSON.stringify({
        actions: [
          { type: 'comment', content: 'Comment 1' },
          { type: 'comment', content: 'Comment 2' },
          { type: 'change_status', status: 'done' },
        ],
      });

      const result = parseTaskOutput(content);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.actions).toHaveLength(3);
      }
    });

    test('parses empty actions array', () => {
      const content = JSON.stringify({ actions: [] });

      const result = parseTaskOutput(content);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.actions).toHaveLength(0);
      }
    });

    test('returns error for empty content', () => {
      const result = parseTaskOutput('');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errorType).toBe('file_empty');
        expect(result.error).toContain('empty');
      }
    });

    test('returns error for whitespace-only content', () => {
      const result = parseTaskOutput('   \n\t  ');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errorType).toBe('file_empty');
      }
    });

    test('returns error for invalid JSON', () => {
      const result = parseTaskOutput('{ invalid json }');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errorType).toBe('json_parse');
        expect(result.error).toContain('not valid JSON');
      }
    });

    test('returns error when actions is missing', () => {
      const content = JSON.stringify({});

      const result = parseTaskOutput(content);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errorType).toBe('schema_validation');
        expect(result.error).toContain('actions');
      }
    });

    test('returns error when actions is not an array', () => {
      const content = JSON.stringify({ actions: 'not an array' });

      const result = parseTaskOutput(content);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errorType).toBe('schema_validation');
        expect(result.error).toContain('array');
      }
    });

    test('returns error for invalid action type', () => {
      const content = JSON.stringify({
        actions: [{ type: 'invalid_type' }],
      });

      const result = parseTaskOutput(content);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errorType).toBe('schema_validation');
        expect(result.error).toContain('invalid_type');
      }
    });

    test('returns error for comment without content', () => {
      const content = JSON.stringify({
        actions: [{ type: 'comment' }],
      });

      const result = parseTaskOutput(content);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errorType).toBe('schema_validation');
        expect(result.error).toContain('content');
      }
    });

    test('returns error for comment with empty content', () => {
      const content = JSON.stringify({
        actions: [{ type: 'comment', content: '   ' }],
      });

      const result = parseTaskOutput(content);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errorType).toBe('schema_validation');
        expect(result.error).toContain('empty');
      }
    });

    test('returns error for change_status without status', () => {
      const content = JSON.stringify({
        actions: [{ type: 'change_status' }],
      });

      const result = parseTaskOutput(content);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errorType).toBe('schema_validation');
        expect(result.error).toContain('status');
      }
    });

    test('returns error for change_status with invalid status', () => {
      const content = JSON.stringify({
        actions: [{ type: 'change_status', status: 'invalid_status' }],
      });

      const result = parseTaskOutput(content);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errorType).toBe('schema_validation');
        expect(result.error).toContain('invalid_status');
      }
    });

    test('handles unicode characters in content', () => {
      const content = JSON.stringify({
        actions: [{ type: 'comment', content: 'Unicode: \u{1F600} \u{1F4A9} 中文 العربية' }],
      });

      const result = parseTaskOutput(content);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.actions[0]).toEqual({
          type: 'comment',
          content: 'Unicode: \u{1F600} \u{1F4A9} 中文 العربية',
        });
      }
    });

    test('returns error when action is an array instead of object', () => {
      const content = JSON.stringify({
        actions: [[]],
      });

      const result = parseTaskOutput(content);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errorType).toBe('schema_validation');
        expect(result.error).toContain('object');
      }
    });
  });

  describe('parseChatOutput', () => {
    test('parses output with message only', () => {
      const content = JSON.stringify({
        message: 'Hello, I am the assistant',
      });

      const result = parseChatOutput(content);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.message).toBe('Hello, I am the assistant');
        expect(result.data.actions).toBeUndefined();
      }
    });

    test('parses output with actions only', () => {
      const content = JSON.stringify({
        actions: [{ type: 'rename_chat', title: 'New Title' }],
      });

      const result = parseChatOutput(content);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.message).toBeUndefined();
        expect(result.data.actions).toHaveLength(1);
      }
    });

    test('parses output with both message and actions', () => {
      const content = JSON.stringify({
        message: 'I have created an agent for you',
        actions: [
          {
            type: 'create_agent',
            name: 'Test Agent',
            instruction: 'Do something',
          },
        ],
      });

      const result = parseChatOutput(content);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.message).toBe('I have created an agent for you');
        expect(result.data.actions).toHaveLength(1);
      }
    });

    test('parses empty object', () => {
      const content = JSON.stringify({});

      const result = parseChatOutput(content);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.message).toBeUndefined();
        expect(result.data.actions).toBeUndefined();
      }
    });

    test('returns error for invalid JSON', () => {
      const result = parseChatOutput('not json');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errorType).toBe('json_parse');
      }
    });

    test('returns error when message is not a string', () => {
      const content = JSON.stringify({ message: 123 });

      const result = parseChatOutput(content);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errorType).toBe('schema_validation');
        expect(result.error).toContain('message');
      }
    });
  });

  describe('chat action validation', () => {
    describe('create_agent', () => {
      test('validates valid create_agent action', () => {
        const content = JSON.stringify({
          actions: [
            {
              type: 'create_agent',
              name: 'Test Agent',
              instruction: 'Test instruction',
              cliType: 'claude',
              order: 1,
            },
          ],
        });

        const result = parseChatOutput(content);

        expect(result.success).toBe(true);
        if (result.success && result.data.actions) {
          expect(result.data.actions[0]).toEqual({
            type: 'create_agent',
            name: 'Test Agent',
            instruction: 'Test instruction',
            cliType: 'claude',
            order: 1,
          });
        }
      });

      test('validates create_agent without optional fields', () => {
        const content = JSON.stringify({
          actions: [
            {
              type: 'create_agent',
              name: 'Test Agent',
              instruction: 'Test instruction',
            },
          ],
        });

        const result = parseChatOutput(content);

        expect(result.success).toBe(true);
      });

      test('returns error for missing name', () => {
        const content = JSON.stringify({
          actions: [
            {
              type: 'create_agent',
              instruction: 'Test instruction',
            },
          ],
        });

        const result = parseChatOutput(content);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('name');
        }
      });

      test('returns error for missing instruction', () => {
        const content = JSON.stringify({
          actions: [
            {
              type: 'create_agent',
              name: 'Test Agent',
            },
          ],
        });

        const result = parseChatOutput(content);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('instruction');
        }
      });

      test('returns error for invalid cliType', () => {
        const content = JSON.stringify({
          actions: [
            {
              type: 'create_agent',
              name: 'Test Agent',
              instruction: 'Test',
              cliType: 'invalid',
            },
          ],
        });

        const result = parseChatOutput(content);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('cliType');
        }
      });

      test('returns error for negative order', () => {
        const content = JSON.stringify({
          actions: [
            {
              type: 'create_agent',
              name: 'Test Agent',
              instruction: 'Test',
              order: -1,
            },
          ],
        });

        const result = parseChatOutput(content);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('order');
          expect(result.error).toContain('non-negative');
        }
      });
    });

    describe('update_agent', () => {
      test('validates valid update_agent action', () => {
        const content = JSON.stringify({
          actions: [
            {
              type: 'update_agent',
              agentId: 'agent123',
              name: 'Updated Name',
              instruction: 'Updated instruction',
              cliType: 'gemini',
            },
          ],
        });

        const result = parseChatOutput(content);

        expect(result.success).toBe(true);
      });

      test('validates update_agent with only agentId', () => {
        const content = JSON.stringify({
          actions: [
            {
              type: 'update_agent',
              agentId: 'agent123',
            },
          ],
        });

        const result = parseChatOutput(content);

        expect(result.success).toBe(true);
      });

      test('validates update_agent with cliType set to null', () => {
        const content = JSON.stringify({
          actions: [
            {
              type: 'update_agent',
              agentId: 'agent123',
              cliType: null,
            },
          ],
        });

        const result = parseChatOutput(content);

        expect(result.success).toBe(true);
        if (result.success && result.data.actions) {
          const action = result.data.actions[0] as { type: string; cliType?: string | null };
          expect(action.cliType).toBeNull();
        }
      });

      test('returns error for missing agentId', () => {
        const content = JSON.stringify({
          actions: [
            {
              type: 'update_agent',
              name: 'Updated Name',
            },
          ],
        });

        const result = parseChatOutput(content);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('agentId');
        }
      });

      test('returns error for empty name', () => {
        const content = JSON.stringify({
          actions: [
            {
              type: 'update_agent',
              agentId: 'agent123',
              name: '   ',
            },
          ],
        });

        const result = parseChatOutput(content);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('name');
          expect(result.error).toContain('empty');
        }
      });

      test('returns error for empty instruction', () => {
        const content = JSON.stringify({
          actions: [
            {
              type: 'update_agent',
              agentId: 'agent123',
              instruction: '',
            },
          ],
        });

        const result = parseChatOutput(content);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('instruction');
          expect(result.error).toContain('empty');
        }
      });

      test('returns error for negative order', () => {
        const content = JSON.stringify({
          actions: [
            {
              type: 'update_agent',
              agentId: 'agent123',
              order: -1,
            },
          ],
        });

        const result = parseChatOutput(content);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('order');
          expect(result.error).toContain('non-negative');
        }
      });
    });

    describe('delete_agent', () => {
      test('validates valid delete_agent action', () => {
        const content = JSON.stringify({
          actions: [
            {
              type: 'delete_agent',
              agentId: 'agent123',
            },
          ],
        });

        const result = parseChatOutput(content);

        expect(result.success).toBe(true);
      });

      test('returns error for missing agentId', () => {
        const content = JSON.stringify({
          actions: [
            {
              type: 'delete_agent',
            },
          ],
        });

        const result = parseChatOutput(content);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('agentId');
        }
      });
    });

    describe('reorder_agents', () => {
      test('validates valid reorder_agents action', () => {
        const content = JSON.stringify({
          actions: [
            {
              type: 'reorder_agents',
              agentIds: ['agent1', 'agent2', 'agent3'],
            },
          ],
        });

        const result = parseChatOutput(content);

        expect(result.success).toBe(true);
      });

      test('returns error for missing agentIds', () => {
        const content = JSON.stringify({
          actions: [
            {
              type: 'reorder_agents',
            },
          ],
        });

        const result = parseChatOutput(content);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('agentIds');
        }
      });

      test('returns error when agentIds is not an array', () => {
        const content = JSON.stringify({
          actions: [
            {
              type: 'reorder_agents',
              agentIds: 'not-an-array',
            },
          ],
        });

        const result = parseChatOutput(content);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('array');
        }
      });

      test('returns error when agentIds contains non-string', () => {
        const content = JSON.stringify({
          actions: [
            {
              type: 'reorder_agents',
              agentIds: ['agent1', 123],
            },
          ],
        });

        const result = parseChatOutput(content);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('string');
        }
      });
    });

    describe('update_workspace', () => {
      test('validates valid update_workspace action', () => {
        const content = JSON.stringify({
          actions: [
            {
              type: 'update_workspace',
              title: 'New Title',
              description: 'New Description',
              notifyOnError: true,
              notifyOnInReview: false,
            },
          ],
        });

        const result = parseChatOutput(content);

        expect(result.success).toBe(true);
      });

      test('validates update_workspace with no fields', () => {
        const content = JSON.stringify({
          actions: [
            {
              type: 'update_workspace',
            },
          ],
        });

        const result = parseChatOutput(content);

        expect(result.success).toBe(true);
      });

      test('returns error for empty title', () => {
        const content = JSON.stringify({
          actions: [
            {
              type: 'update_workspace',
              title: '   ',
            },
          ],
        });

        const result = parseChatOutput(content);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('title');
          expect(result.error).toContain('empty');
        }
      });

      test('allows empty description', () => {
        const content = JSON.stringify({
          actions: [
            {
              type: 'update_workspace',
              description: '',
            },
          ],
        });

        const result = parseChatOutput(content);

        expect(result.success).toBe(true);
      });

      test('returns error for invalid notifyOnError type', () => {
        const content = JSON.stringify({
          actions: [
            {
              type: 'update_workspace',
              notifyOnError: 'yes',
            },
          ],
        });

        const result = parseChatOutput(content);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('boolean');
        }
      });
    });

    describe('rename_chat', () => {
      test('validates valid rename_chat action', () => {
        const content = JSON.stringify({
          actions: [
            {
              type: 'rename_chat',
              title: 'New Chat Title',
            },
          ],
        });

        const result = parseChatOutput(content);

        expect(result.success).toBe(true);
      });

      test('returns error for missing title', () => {
        const content = JSON.stringify({
          actions: [
            {
              type: 'rename_chat',
            },
          ],
        });

        const result = parseChatOutput(content);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('title');
        }
      });

      test('returns error for empty title', () => {
        const content = JSON.stringify({
          actions: [
            {
              type: 'rename_chat',
              title: '   ',
            },
          ],
        });

        const result = parseChatOutput(content);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('empty');
        }
      });
    });
  });

  describe('file-based parsing', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await mkdtemp(join(tmpdir(), 'output-parser-test-'));
    });

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    describe('parseTaskOutputFile', () => {
      test('parses valid task output file', async () => {
        const filePath = join(tempDir, 'task-output.json');
        await writeFile(filePath, JSON.stringify({ actions: [{ type: 'skip' }] }));

        const result = await parseTaskOutputFile(filePath);

        expect(result.success).toBe(true);
      });

      test('returns error for missing file', async () => {
        const filePath = join(tempDir, 'nonexistent.json');

        const result = await parseTaskOutputFile(filePath);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errorType).toBe('file_missing');
          expect(result.error).toContain(filePath);
        }
      });

      test('returns error for empty file', async () => {
        const filePath = join(tempDir, 'empty.json');
        await writeFile(filePath, '');

        const result = await parseTaskOutputFile(filePath);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errorType).toBe('file_empty');
        }
      });

      test('returns error for invalid JSON in file', async () => {
        const filePath = join(tempDir, 'invalid.json');
        await writeFile(filePath, '{ not valid json }');

        const result = await parseTaskOutputFile(filePath);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errorType).toBe('json_parse');
        }
      });
    });

    describe('parseChatOutputFile', () => {
      test('parses valid chat output file', async () => {
        const filePath = join(tempDir, 'chat-output.json');
        await writeFile(filePath, JSON.stringify({ message: 'Hello' }));

        const result = await parseChatOutputFile(filePath);

        expect(result.success).toBe(true);
      });

      test('returns error for missing file', async () => {
        const filePath = join(tempDir, 'nonexistent.json');

        const result = await parseChatOutputFile(filePath);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errorType).toBe('file_missing');
          expect(result.error).toContain(filePath);
        }
      });
    });
  });

  describe('validateTaskOutput', () => {
    test('returns error for null input', () => {
      const result = validateTaskOutput(null);
      expect(result.valid).toBe(false);
    });

    test('returns error for array input', () => {
      const result = validateTaskOutput([]);
      expect(result.valid).toBe(false);
    });

    test('returns error for primitive input', () => {
      const result = validateTaskOutput('string');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateChatOutput', () => {
    test('returns error for null input', () => {
      const result = validateChatOutput(null);
      expect(result.valid).toBe(false);
    });

    test('returns error for array input', () => {
      const result = validateChatOutput([]);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateTaskAction', () => {
    test('validates action at specific index', () => {
      const result = validateTaskAction({ type: 'invalid' }, 5);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain('actions[5]');
      }
    });

    test('returns error for null action', () => {
      const result = validateTaskAction(null, 0);
      expect(result.valid).toBe(false);
    });

    test('returns error for action without type', () => {
      const result = validateTaskAction({}, 0);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain('type');
      }
    });

    test('returns error for action with non-string type', () => {
      const result = validateTaskAction({ type: 123 }, 0);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateChatAction', () => {
    test('validates action at specific index', () => {
      const result = validateChatAction({ type: 'invalid' }, 3);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain('actions[3]');
      }
    });
  });

  describe('generateErrorComment', () => {
    test('generates comment with exit code only', () => {
      const comment = generateErrorComment(1);
      expect(comment).toBe('CLI exited with code 1.');
    });

    test('generates comment with exit code and stderr', () => {
      const comment = generateErrorComment(1, 'Some error message');
      expect(comment).toBe('CLI exited with code 1. Some error message');
    });

    test('trims stderr whitespace', () => {
      const comment = generateErrorComment(127, '  Command not found  \n');
      expect(comment).toBe('CLI exited with code 127. Command not found');
    });

    test('ignores empty stderr', () => {
      const comment = generateErrorComment(2, '   ');
      expect(comment).toBe('CLI exited with code 2.');
    });
  });

  describe('all task status values', () => {
    const validStatuses = ['todo', 'in_progress', 'in_review', 'done'];

    for (const status of validStatuses) {
      test(`accepts status: ${status}`, () => {
        const content = JSON.stringify({
          actions: [{ type: 'change_status', status }],
        });

        const result = parseTaskOutput(content);

        expect(result.success).toBe(true);
      });
    }
  });

  describe('all cli types', () => {
    const validCliTypes = ['claude', 'gemini', 'codex', 'opencode'];

    for (const cliType of validCliTypes) {
      test(`accepts cliType: ${cliType}`, () => {
        const content = JSON.stringify({
          actions: [
            {
              type: 'create_agent',
              name: 'Test',
              instruction: 'Test',
              cliType,
            },
          ],
        });

        const result = parseChatOutput(content);

        expect(result.success).toBe(true);
      });
    }
  });
});
