import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test';

import * as agentRepository from '../../src/agent/repository.ts';
import * as workspaceRepository from '../../src/workspace/repository.ts';
import { cleanupTestDb, clearTables, getTestDb, setupTestDb } from '../helpers/index.ts';

describe('agent repository integration', () => {
  beforeAll(() => {
    setupTestDb();
  });

  afterEach(() => {
    clearTables();
  });

  afterAll(() => {
    cleanupTestDb();
  });

  describe('CRUD operations with real SQLite', () => {
    test('creates, reads, updates, and deletes an agent', () => {
      const db = getTestDb();

      // Create workspace first
      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);

      // Create agent
      const created = agentRepository.create(
        {
          workspaceId: workspace.id,
          name: 'Test Agent',
          instruction: 'Test instruction for agent',
          cliType: 'claude',
        },
        db
      );
      expect(created.id).toHaveLength(21);
      expect(created.name).toBe('Test Agent');
      expect(created.instruction).toBe('Test instruction for agent');
      expect(created.cliType).toBe('claude');
      expect(created.workspaceId).toBe(workspace.id);
      expect(created.order).toBe(1);

      // Read
      const found = agentRepository.findById(created.id, db);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('Test Agent');

      // Update
      const updated = agentRepository.update(created.id, { name: 'Updated Agent' }, db);
      expect(updated?.name).toBe('Updated Agent');

      // Verify update persisted
      const refetched = agentRepository.findById(created.id, db);
      expect(refetched?.name).toBe('Updated Agent');

      // Delete
      const deleted = agentRepository.remove(created.id, db);
      expect(deleted).toBe(true);

      // Verify deletion
      const afterDelete = agentRepository.findById(created.id, db);
      expect(afterDelete).toBeNull();
    });

    test('handles multiple agents correctly', () => {
      const db = getTestDb();

      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);

      const agent1 = agentRepository.create(
        {
          workspaceId: workspace.id,
          name: 'Agent 1',
          instruction: 'First agent',
          cliType: 'claude',
        },
        db
      );
      const agent2 = agentRepository.create(
        {
          workspaceId: workspace.id,
          name: 'Agent 2',
          instruction: 'Second agent',
          cliType: 'gemini',
        },
        db
      );
      const agent3 = agentRepository.create(
        {
          workspaceId: workspace.id,
          name: 'Agent 3',
          instruction: 'Third agent',
          cliType: 'codex',
        },
        db
      );

      const all = agentRepository.findByWorkspaceId(workspace.id, db);
      expect(all).toHaveLength(3);

      // Verify each agent can be retrieved individually
      expect(agentRepository.findById(agent1.id, db)?.name).toBe('Agent 1');
      expect(agentRepository.findById(agent2.id, db)?.name).toBe('Agent 2');
      expect(agentRepository.findById(agent3.id, db)?.name).toBe('Agent 3');
    });

    test('creates agent with all supported CLI types', () => {
      const db = getTestDb();

      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);

      const cliTypes = ['claude', 'gemini', 'codex', 'opencode'] as const;

      for (const cliType of cliTypes) {
        const agent = agentRepository.create(
          {
            workspaceId: workspace.id,
            name: `Agent ${cliType}`,
            instruction: `Instruction for ${cliType}`,
            cliType,
          },
          db
        );

        const found = agentRepository.findById(agent.id, db);
        expect(found?.cliType).toBe(cliType);
      }
    });

    test('updates multiple fields', () => {
      const db = getTestDb();

      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);
      const agent = agentRepository.create(
        {
          workspaceId: workspace.id,
          name: 'Original Name',
          instruction: 'Original instruction',
          cliType: 'claude',
        },
        db
      );

      const updated = agentRepository.update(
        agent.id,
        {
          name: 'New Name',
          instruction: 'New instruction',
          cliType: 'gemini',
        },
        db
      );

      expect(updated?.name).toBe('New Name');
      expect(updated?.instruction).toBe('New instruction');
      expect(updated?.cliType).toBe('gemini');
    });

    test('preserves unchanged fields on update', () => {
      const db = getTestDb();

      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);
      const agent = agentRepository.create(
        {
          workspaceId: workspace.id,
          name: 'Test Agent',
          instruction: 'Keep this instruction',
          cliType: 'claude',
        },
        db
      );

      const updated = agentRepository.update(agent.id, { name: 'Changed Name' }, db);

      expect(updated?.name).toBe('Changed Name');
      expect(updated?.instruction).toBe('Keep this instruction');
      expect(updated?.cliType).toBe('claude');
    });

    test('returns null when updating non-existent agent', () => {
      const db = getTestDb();

      const updated = agentRepository.update('nonexistent-id', { name: 'Test' }, db);
      expect(updated).toBeNull();
    });

    test('returns false when deleting non-existent agent', () => {
      const db = getTestDb();

      const deleted = agentRepository.remove('nonexistent-id', db);
      expect(deleted).toBe(false);
    });
  });

  describe('findByName', () => {
    test('finds agent by name in workspace', () => {
      const db = getTestDb();

      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);
      agentRepository.create(
        {
          workspaceId: workspace.id,
          name: 'Unique Agent',
          instruction: 'Instruction',
          cliType: 'claude',
        },
        db
      );

      const found = agentRepository.findByName(workspace.id, 'Unique Agent', db);
      expect(found).not.toBeNull();
      expect(found?.name).toBe('Unique Agent');
    });

    test('returns null when agent name not found', () => {
      const db = getTestDb();

      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);

      const found = agentRepository.findByName(workspace.id, 'Nonexistent', db);
      expect(found).toBeNull();
    });

    test('does not find agent from different workspace', () => {
      const db = getTestDb();

      const workspace1 = workspaceRepository.create({ title: 'Workspace 1' }, db);
      const workspace2 = workspaceRepository.create({ title: 'Workspace 2' }, db);

      agentRepository.create(
        {
          workspaceId: workspace1.id,
          name: 'Shared Name',
          instruction: 'In workspace 1',
          cliType: 'claude',
        },
        db
      );

      const found = agentRepository.findByName(workspace2.id, 'Shared Name', db);
      expect(found).toBeNull();
    });

    test('finds correct agent when same name exists in different workspaces', () => {
      const db = getTestDb();

      const workspace1 = workspaceRepository.create({ title: 'Workspace 1' }, db);
      const workspace2 = workspaceRepository.create({ title: 'Workspace 2' }, db);

      const agent1 = agentRepository.create(
        {
          workspaceId: workspace1.id,
          name: 'Same Name',
          instruction: 'In workspace 1',
          cliType: 'claude',
        },
        db
      );

      const agent2 = agentRepository.create(
        {
          workspaceId: workspace2.id,
          name: 'Same Name',
          instruction: 'In workspace 2',
          cliType: 'gemini',
        },
        db
      );

      const found1 = agentRepository.findByName(workspace1.id, 'Same Name', db);
      const found2 = agentRepository.findByName(workspace2.id, 'Same Name', db);

      expect(found1?.id).toBe(agent1.id);
      expect(found1?.instruction).toBe('In workspace 1');
      expect(found2?.id).toBe(agent2.id);
      expect(found2?.instruction).toBe('In workspace 2');
    });
  });

  describe('ordering', () => {
    test('assigns sequential order to agents', () => {
      const db = getTestDb();

      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);

      const agent1 = agentRepository.create(
        {
          workspaceId: workspace.id,
          name: 'First',
          instruction: 'First agent',
          cliType: 'claude',
        },
        db
      );
      const agent2 = agentRepository.create(
        {
          workspaceId: workspace.id,
          name: 'Second',
          instruction: 'Second agent',
          cliType: 'claude',
        },
        db
      );
      const agent3 = agentRepository.create(
        {
          workspaceId: workspace.id,
          name: 'Third',
          instruction: 'Third agent',
          cliType: 'claude',
        },
        db
      );

      expect(agent1.order).toBe(1);
      expect(agent2.order).toBe(2);
      expect(agent3.order).toBe(3);
    });

    test('findByWorkspaceId returns agents ordered by order ascending', () => {
      const db = getTestDb();

      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);

      // Create agents in random order values
      agentRepository.create(
        {
          workspaceId: workspace.id,
          name: 'Third',
          instruction: 'Third',
          cliType: 'claude',
          order: 3,
        },
        db
      );
      agentRepository.create(
        {
          workspaceId: workspace.id,
          name: 'First',
          instruction: 'First',
          cliType: 'claude',
          order: 1,
        },
        db
      );
      agentRepository.create(
        {
          workspaceId: workspace.id,
          name: 'Second',
          instruction: 'Second',
          cliType: 'claude',
          order: 2,
        },
        db
      );

      const agents = agentRepository.findByWorkspaceId(workspace.id, db);
      expect(agents[0]?.name).toBe('First');
      expect(agents[1]?.name).toBe('Second');
      expect(agents[2]?.name).toBe('Third');
    });

    test('getNextOrder returns 1 for empty workspace', () => {
      const db = getTestDb();

      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);

      const nextOrder = agentRepository.getNextOrder(workspace.id, db);
      expect(nextOrder).toBe(1);
    });

    test('getNextOrder returns correct value after agents created', () => {
      const db = getTestDb();

      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);
      agentRepository.create(
        {
          workspaceId: workspace.id,
          name: 'Agent 1',
          instruction: 'First',
          cliType: 'claude',
        },
        db
      );
      agentRepository.create(
        {
          workspaceId: workspace.id,
          name: 'Agent 2',
          instruction: 'Second',
          cliType: 'claude',
        },
        db
      );

      const nextOrder = agentRepository.getNextOrder(workspace.id, db);
      expect(nextOrder).toBe(3);
    });

    test('allows explicit order on create', () => {
      const db = getTestDb();

      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);

      const agent = agentRepository.create(
        {
          workspaceId: workspace.id,
          name: 'Custom Order',
          instruction: 'Custom',
          cliType: 'claude',
          order: 10,
        },
        db
      );

      expect(agent.order).toBe(10);
    });
  });

  describe('reorder', () => {
    test('reorders agents correctly', () => {
      const db = getTestDb();

      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);

      const agent1 = agentRepository.create(
        {
          workspaceId: workspace.id,
          name: 'Agent A',
          instruction: 'A',
          cliType: 'claude',
        },
        db
      );
      const agent2 = agentRepository.create(
        {
          workspaceId: workspace.id,
          name: 'Agent B',
          instruction: 'B',
          cliType: 'claude',
        },
        db
      );
      const agent3 = agentRepository.create(
        {
          workspaceId: workspace.id,
          name: 'Agent C',
          instruction: 'C',
          cliType: 'claude',
        },
        db
      );

      // Initial order: A(1), B(2), C(3)
      // Reorder to: C, A, B
      agentRepository.reorder(workspace.id, [agent3.id, agent1.id, agent2.id], db);

      const agents = agentRepository.findByWorkspaceId(workspace.id, db);
      expect(agents[0]?.name).toBe('Agent C');
      expect(agents[0]?.order).toBe(1);
      expect(agents[1]?.name).toBe('Agent A');
      expect(agents[1]?.order).toBe(2);
      expect(agents[2]?.name).toBe('Agent B');
      expect(agents[2]?.order).toBe(3);
    });

    test('reorder updates updated_at timestamp', () => {
      const db = getTestDb();

      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);

      const agent = agentRepository.create(
        {
          workspaceId: workspace.id,
          name: 'Agent',
          instruction: 'Agent',
          cliType: 'claude',
        },
        db
      );

      const originalUpdatedAt = agent.updatedAt;

      // Wait a tiny bit to ensure timestamp difference
      Bun.sleepSync(10);

      agentRepository.reorder(workspace.id, [agent.id], db);

      const updated = agentRepository.findById(agent.id, db);
      expect(updated?.updatedAt).not.toBe(originalUpdatedAt);
    });

    test('reorder only affects agents in specified workspace', () => {
      const db = getTestDb();

      const workspace1 = workspaceRepository.create({ title: 'Workspace 1' }, db);
      const workspace2 = workspaceRepository.create({ title: 'Workspace 2' }, db);

      const agent1 = agentRepository.create(
        {
          workspaceId: workspace1.id,
          name: 'Agent in W1',
          instruction: 'W1',
          cliType: 'claude',
        },
        db
      );

      const agent2 = agentRepository.create(
        {
          workspaceId: workspace2.id,
          name: 'Agent in W2',
          instruction: 'W2',
          cliType: 'claude',
        },
        db
      );

      const originalOrder = agent2.order;

      // Reorder workspace1 agents
      agentRepository.reorder(workspace1.id, [agent1.id], db);

      // Agent in workspace2 should be unaffected
      const refetched = agentRepository.findById(agent2.id, db);
      expect(refetched?.order).toBe(originalOrder);
    });
  });

  describe('cascade delete behavior', () => {
    test('agents are deleted when workspace is deleted', () => {
      const db = getTestDb();

      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);
      const agent = agentRepository.create(
        {
          workspaceId: workspace.id,
          name: 'Agent',
          instruction: 'Will be deleted',
          cliType: 'claude',
        },
        db
      );

      // Verify agent exists
      expect(agentRepository.findById(agent.id, db)).not.toBeNull();

      // Delete workspace
      workspaceRepository.remove(workspace.id, db);

      // Agent should be gone
      expect(agentRepository.findById(agent.id, db)).toBeNull();
    });
  });

  describe('timestamps', () => {
    test('sets created_at and updated_at on create', () => {
      const db = getTestDb();

      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);
      const agent = agentRepository.create(
        {
          workspaceId: workspace.id,
          name: 'Agent',
          instruction: 'Instruction',
          cliType: 'claude',
        },
        db
      );

      expect(agent.createdAt).toBeTruthy();
      expect(agent.updatedAt).toBeTruthy();
      expect(() => new Date(agent.createdAt)).not.toThrow();
      expect(() => new Date(agent.updatedAt)).not.toThrow();
    });

    test('updates updated_at on update', () => {
      const db = getTestDb();

      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);
      const agent = agentRepository.create(
        {
          workspaceId: workspace.id,
          name: 'Agent',
          instruction: 'Instruction',
          cliType: 'claude',
        },
        db
      );

      const originalUpdatedAt = agent.updatedAt;

      // Wait to ensure timestamp difference
      Bun.sleepSync(10);

      const updated = agentRepository.update(agent.id, { name: 'New Name' }, db);

      expect(updated?.updatedAt).not.toBe(originalUpdatedAt);
      expect(updated?.createdAt).toBe(agent.createdAt);
    });
  });

  describe('concurrent access', () => {
    test('handles rapid sequential operations correctly', () => {
      const db = getTestDb();

      const workspace = workspaceRepository.create({ title: 'Test Workspace' }, db);

      // Create multiple agents rapidly
      const agents = [];
      for (let i = 0; i < 10; i++) {
        agents.push(
          agentRepository.create(
            {
              workspaceId: workspace.id,
              name: `Agent ${i}`,
              instruction: `Instruction ${i}`,
              cliType: 'claude',
            },
            db
          )
        );
      }

      // Verify all were created
      expect(agentRepository.findByWorkspaceId(workspace.id, db)).toHaveLength(10);

      // Update all agents
      for (const agent of agents) {
        agentRepository.update(agent.id, { instruction: 'Updated' }, db);
      }

      // Verify all updates persisted
      const all = agentRepository.findByWorkspaceId(workspace.id, db);
      expect(all.every((a) => a.instruction === 'Updated')).toBe(true);
    });
  });
});
