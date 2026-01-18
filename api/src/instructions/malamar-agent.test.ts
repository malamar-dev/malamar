import { describe, expect, test } from 'bun:test';

import { getMalamarAgentInstruction } from './malamar-agent.ts';

describe('malamar-agent', () => {
  describe('getMalamarAgentInstruction', () => {
    test('should return a non-empty string', () => {
      const instruction = getMalamarAgentInstruction();
      expect(instruction).toBeDefined();
      expect(typeof instruction).toBe('string');
      expect(instruction.length).toBeGreaterThan(0);
    });

    test('should include capability descriptions', () => {
      const instruction = getMalamarAgentInstruction();
      expect(instruction).toContain('create_agent');
      expect(instruction).toContain('update_agent');
      expect(instruction).toContain('delete_agent');
      expect(instruction).toContain('reorder_agents');
      expect(instruction).toContain('update_workspace');
      expect(instruction).toContain('rename_chat');
    });

    test('should include limitations', () => {
      const instruction = getMalamarAgentInstruction();
      expect(instruction).toContain('CANNOT delete workspaces');
      expect(instruction).toContain('CANNOT create tasks');
    });

    test('should include knowledge base reference', () => {
      const instruction = getMalamarAgentInstruction();
      expect(instruction).toContain('Knowledge Base');
      expect(instruction).toContain('malamar-dev/specs');
    });
  });

  describe('module exports', () => {
    test('should export getMalamarAgentInstruction function', async () => {
      const module = await import('./malamar-agent.ts');
      expect(module.getMalamarAgentInstruction).toBeDefined();
      expect(typeof module.getMalamarAgentInstruction).toBe('function');
    });
  });
});
