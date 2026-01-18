import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test';

import * as agentService from '../../src/agent/service.ts';
import { ConflictError, NotFoundError } from '../../src/core/errors.ts';
import * as workspaceService from '../../src/workspace/service.ts';
import { cleanupTestDb, clearTables, setupTestDb } from '../helpers/index.ts';

describe('agent service integration', () => {
  beforeAll(() => {
    setupTestDb();
  });

  afterEach(() => {
    clearTables();
  });

  afterAll(() => {
    cleanupTestDb();
  });

  describe('createAgent', () => {
    test('creates an agent with required fields', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      const agent = agentService.createAgent({
        workspaceId: workspace.id,
        name: 'Test Agent',
        instruction: 'Test instruction',
        cliType: 'claude',
      });

      expect(agent.id).toHaveLength(21);
      expect(agent.name).toBe('Test Agent');
      expect(agent.instruction).toBe('Test instruction');
      expect(agent.cliType).toBe('claude');
      expect(agent.workspaceId).toBe(workspace.id);
      expect(agent.order).toBe(1);
    });

    test('creates multiple agents with sequential order', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      const agent1 = agentService.createAgent({
        workspaceId: workspace.id,
        name: 'Agent 1',
        instruction: 'First agent',
        cliType: 'claude',
      });

      const agent2 = agentService.createAgent({
        workspaceId: workspace.id,
        name: 'Agent 2',
        instruction: 'Second agent',
        cliType: 'gemini',
      });

      const agent3 = agentService.createAgent({
        workspaceId: workspace.id,
        name: 'Agent 3',
        instruction: 'Third agent',
        cliType: 'codex',
      });

      expect(agent1.order).toBe(1);
      expect(agent2.order).toBe(2);
      expect(agent3.order).toBe(3);
    });

    test('throws ConflictError when agent name already exists in workspace', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      agentService.createAgent({
        workspaceId: workspace.id,
        name: 'Duplicate Name',
        instruction: 'First',
        cliType: 'claude',
      });

      expect(() =>
        agentService.createAgent({
          workspaceId: workspace.id,
          name: 'Duplicate Name',
          instruction: 'Second',
          cliType: 'gemini',
        })
      ).toThrow(ConflictError);
    });

    test('ConflictError has correct properties', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      agentService.createAgent({
        workspaceId: workspace.id,
        name: 'Existing',
        instruction: 'First',
        cliType: 'claude',
      });

      try {
        agentService.createAgent({
          workspaceId: workspace.id,
          name: 'Existing',
          instruction: 'Second',
          cliType: 'claude',
        });
        expect.unreachable('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictError);
        const conflictError = error as ConflictError;
        expect(conflictError.statusCode).toBe(409);
        expect(conflictError.code).toBe('CONFLICT');
        expect(conflictError.message).toContain('Existing');
      }
    });

    test('allows same agent name in different workspaces', () => {
      const workspace1 = workspaceService.createWorkspace({ title: 'Workspace 1' });
      const workspace2 = workspaceService.createWorkspace({ title: 'Workspace 2' });

      const agent1 = agentService.createAgent({
        workspaceId: workspace1.id,
        name: 'Same Name',
        instruction: 'In workspace 1',
        cliType: 'claude',
      });

      const agent2 = agentService.createAgent({
        workspaceId: workspace2.id,
        name: 'Same Name',
        instruction: 'In workspace 2',
        cliType: 'gemini',
      });

      expect(agent1.id).not.toBe(agent2.id);
      expect(agent1.name).toBe(agent2.name);
    });
  });

  describe('getAgent', () => {
    test('returns agent when it exists', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const created = agentService.createAgent({
        workspaceId: workspace.id,
        name: 'Test Agent',
        instruction: 'Instruction',
        cliType: 'claude',
      });

      const retrieved = agentService.getAgent(created.id);

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.name).toBe('Test Agent');
    });

    test('throws NotFoundError when agent does not exist', () => {
      expect(() => agentService.getAgent('nonexistent-id')).toThrow(NotFoundError);
    });

    test('NotFoundError has correct properties', () => {
      try {
        agentService.getAgent('missing-agent-id');
        expect.unreachable('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        const notFoundError = error as NotFoundError;
        expect(notFoundError.statusCode).toBe(404);
        expect(notFoundError.code).toBe('NOT_FOUND');
        expect(notFoundError.message).toContain('missing-agent-id');
      }
    });
  });

  describe('listAgents', () => {
    test('returns empty array when no agents exist', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      const agents = agentService.listAgents(workspace.id);

      expect(agents).toEqual([]);
    });

    test('returns all agents in workspace ordered by order', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      agentService.createAgent({
        workspaceId: workspace.id,
        name: 'Agent C',
        instruction: 'C',
        cliType: 'claude',
      });

      agentService.createAgent({
        workspaceId: workspace.id,
        name: 'Agent A',
        instruction: 'A',
        cliType: 'claude',
      });

      agentService.createAgent({
        workspaceId: workspace.id,
        name: 'Agent B',
        instruction: 'B',
        cliType: 'claude',
      });

      const agents = agentService.listAgents(workspace.id);

      expect(agents).toHaveLength(3);
      // Should be in creation order (which matches order field)
      expect(agents[0]?.name).toBe('Agent C');
      expect(agents[1]?.name).toBe('Agent A');
      expect(agents[2]?.name).toBe('Agent B');
    });

    test('returns empty array for non-existent workspace', () => {
      const agents = agentService.listAgents('nonexistent-workspace-id');
      expect(agents).toEqual([]);
    });

    test('only returns agents from specified workspace', () => {
      const workspace1 = workspaceService.createWorkspace({ title: 'Workspace 1' });
      const workspace2 = workspaceService.createWorkspace({ title: 'Workspace 2' });

      agentService.createAgent({
        workspaceId: workspace1.id,
        name: 'Agent in W1',
        instruction: 'W1',
        cliType: 'claude',
      });

      agentService.createAgent({
        workspaceId: workspace2.id,
        name: 'Agent in W2',
        instruction: 'W2',
        cliType: 'claude',
      });

      const agents1 = agentService.listAgents(workspace1.id);
      const agents2 = agentService.listAgents(workspace2.id);

      expect(agents1).toHaveLength(1);
      expect(agents1[0]?.name).toBe('Agent in W1');
      expect(agents2).toHaveLength(1);
      expect(agents2[0]?.name).toBe('Agent in W2');
    });
  });

  describe('updateAgent', () => {
    test('updates agent name', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const created = agentService.createAgent({
        workspaceId: workspace.id,
        name: 'Original Name',
        instruction: 'Instruction',
        cliType: 'claude',
      });

      const updated = agentService.updateAgent(created.id, { name: 'New Name' });

      expect(updated.name).toBe('New Name');
    });

    test('updates agent instruction', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const created = agentService.createAgent({
        workspaceId: workspace.id,
        name: 'Agent',
        instruction: 'Original instruction',
        cliType: 'claude',
      });

      const updated = agentService.updateAgent(created.id, {
        instruction: 'Updated instruction',
      });

      expect(updated.instruction).toBe('Updated instruction');
    });

    test('updates agent cliType', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const created = agentService.createAgent({
        workspaceId: workspace.id,
        name: 'Agent',
        instruction: 'Instruction',
        cliType: 'claude',
      });

      const updated = agentService.updateAgent(created.id, { cliType: 'gemini' });

      expect(updated.cliType).toBe('gemini');
    });

    test('updates multiple fields at once', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const created = agentService.createAgent({
        workspaceId: workspace.id,
        name: 'Original',
        instruction: 'Original instruction',
        cliType: 'claude',
      });

      const updated = agentService.updateAgent(created.id, {
        name: 'New Name',
        instruction: 'New instruction',
        cliType: 'codex',
      });

      expect(updated.name).toBe('New Name');
      expect(updated.instruction).toBe('New instruction');
      expect(updated.cliType).toBe('codex');
    });

    test('preserves unchanged fields', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const created = agentService.createAgent({
        workspaceId: workspace.id,
        name: 'Keep This Name',
        instruction: 'Keep this instruction',
        cliType: 'claude',
      });

      const updated = agentService.updateAgent(created.id, { cliType: 'gemini' });

      expect(updated.name).toBe('Keep This Name');
      expect(updated.instruction).toBe('Keep this instruction');
      expect(updated.cliType).toBe('gemini');
    });

    test('throws NotFoundError when agent does not exist', () => {
      expect(() => agentService.updateAgent('nonexistent', { name: 'Test' })).toThrow(
        NotFoundError
      );
    });

    test('throws ConflictError when renaming to existing name in same workspace', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      agentService.createAgent({
        workspaceId: workspace.id,
        name: 'Existing Name',
        instruction: 'First',
        cliType: 'claude',
      });

      const agent2 = agentService.createAgent({
        workspaceId: workspace.id,
        name: 'Other Name',
        instruction: 'Second',
        cliType: 'claude',
      });

      expect(() => agentService.updateAgent(agent2.id, { name: 'Existing Name' })).toThrow(
        ConflictError
      );
    });

    test('allows keeping the same name on update', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const created = agentService.createAgent({
        workspaceId: workspace.id,
        name: 'My Name',
        instruction: 'Instruction',
        cliType: 'claude',
      });

      // This should not throw - updating other fields while keeping the same name
      const updated = agentService.updateAgent(created.id, {
        name: 'My Name',
        instruction: 'New instruction',
      });

      expect(updated.name).toBe('My Name');
      expect(updated.instruction).toBe('New instruction');
    });
  });

  describe('deleteAgent', () => {
    test('deletes an existing agent', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const created = agentService.createAgent({
        workspaceId: workspace.id,
        name: 'To Delete',
        instruction: 'Instruction',
        cliType: 'claude',
      });

      agentService.deleteAgent(created.id);

      expect(() => agentService.getAgent(created.id)).toThrow(NotFoundError);
    });

    test('throws NotFoundError when agent does not exist', () => {
      expect(() => agentService.deleteAgent('nonexistent')).toThrow(NotFoundError);
    });

    test('does not affect other agents in workspace', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      const agent1 = agentService.createAgent({
        workspaceId: workspace.id,
        name: 'Keep',
        instruction: 'Instruction',
        cliType: 'claude',
      });

      const agent2 = agentService.createAgent({
        workspaceId: workspace.id,
        name: 'Delete',
        instruction: 'Instruction',
        cliType: 'claude',
      });

      agentService.deleteAgent(agent2.id);

      // Agent1 should still exist
      const retrieved = agentService.getAgent(agent1.id);
      expect(retrieved.name).toBe('Keep');

      // Listing should only show agent1
      const agents = agentService.listAgents(workspace.id);
      expect(agents).toHaveLength(1);
      expect(agents[0]?.id).toBe(agent1.id);
    });
  });

  describe('reorderAgents', () => {
    test('reorders agents correctly', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      const agent1 = agentService.createAgent({
        workspaceId: workspace.id,
        name: 'Agent A',
        instruction: 'A',
        cliType: 'claude',
      });

      const agent2 = agentService.createAgent({
        workspaceId: workspace.id,
        name: 'Agent B',
        instruction: 'B',
        cliType: 'claude',
      });

      const agent3 = agentService.createAgent({
        workspaceId: workspace.id,
        name: 'Agent C',
        instruction: 'C',
        cliType: 'claude',
      });

      // Reorder to: C, A, B
      agentService.reorderAgents(workspace.id, [agent3.id, agent1.id, agent2.id]);

      const agents = agentService.listAgents(workspace.id);
      expect(agents[0]?.name).toBe('Agent C');
      expect(agents[1]?.name).toBe('Agent A');
      expect(agents[2]?.name).toBe('Agent B');
    });

    test('reorder handles single agent', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      const agent = agentService.createAgent({
        workspaceId: workspace.id,
        name: 'Only Agent',
        instruction: 'Only',
        cliType: 'claude',
      });

      // Should not throw
      agentService.reorderAgents(workspace.id, [agent.id]);

      const agents = agentService.listAgents(workspace.id);
      expect(agents).toHaveLength(1);
      expect(agents[0]?.name).toBe('Only Agent');
    });

    test('reorder handles empty array', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      // Should not throw
      agentService.reorderAgents(workspace.id, []);

      const agents = agentService.listAgents(workspace.id);
      expect(agents).toEqual([]);
    });
  });

  describe('data integrity', () => {
    test('agent data persists correctly through service layer', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      const input = {
        workspaceId: workspace.id,
        name: 'Persistence Test',
        instruction: 'Testing data persistence through service layer',
        cliType: 'opencode' as const,
      };

      const created = agentService.createAgent(input);
      const retrieved = agentService.getAgent(created.id);

      expect(retrieved.name).toBe(input.name);
      expect(retrieved.instruction).toBe(input.instruction);
      expect(retrieved.cliType).toBe(input.cliType);
      expect(retrieved.workspaceId).toBe(input.workspaceId);
    });

    test('timestamps are set correctly', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });
      const agent = agentService.createAgent({
        workspaceId: workspace.id,
        name: 'Timestamp Test',
        instruction: 'Instruction',
        cliType: 'claude',
      });

      expect(agent.createdAt).toBeTruthy();
      expect(agent.updatedAt).toBeTruthy();

      // Timestamps should be valid ISO strings
      expect(() => new Date(agent.createdAt)).not.toThrow();
      expect(() => new Date(agent.updatedAt)).not.toThrow();
    });
  });

  describe('workspace deletion cascade', () => {
    test('agents are deleted when workspace is deleted', () => {
      const workspace = workspaceService.createWorkspace({ title: 'Test Workspace' });

      const agent = agentService.createAgent({
        workspaceId: workspace.id,
        name: 'Agent',
        instruction: 'Will be deleted',
        cliType: 'claude',
      });

      // Verify agent exists
      expect(agentService.getAgent(agent.id)).toBeTruthy();

      // Delete workspace
      workspaceService.deleteWorkspace(workspace.id);

      // Agent should be gone
      expect(() => agentService.getAgent(agent.id)).toThrow(NotFoundError);
    });
  });
});
