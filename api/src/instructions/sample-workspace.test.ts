import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { listAgents } from '../agent/index.ts';
import { initDb, resetConfig, runMigrations } from '../core/index.ts';
import { listWorkspaces } from '../workspace/index.ts';
import { createSampleWorkspace } from './sample-workspace.ts';

describe('sample-workspace', () => {
  const testDataDir = join(tmpdir(), `malamar-sample-workspace-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const testDbPath = join(testDataDir, 'test.db');

  beforeEach(() => {
    // Re-establish the singleton to point to our test database
    initDb(testDbPath);
    resetConfig();

    // Create test data directory
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true });
    }
    mkdirSync(testDataDir, { recursive: true });

    // Initialize test database
    initDb(testDbPath);
    runMigrations();
  });

  afterEach(() => {
    resetConfig();
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true });
    }
  });

  describe('createSampleWorkspace', () => {
    test('should create a workspace with the correct title', () => {
      createSampleWorkspace();

      const workspaces = listWorkspaces();
      expect(workspaces.length).toBe(1);
      expect(workspaces[0]!.title).toBe('Sample: Code Assistant');
    });

    test('should create workspace with temp working directory mode', () => {
      createSampleWorkspace();

      const workspaces = listWorkspaces();
      expect(workspaces[0]!.workingDirectoryMode).toBe('temp');
    });

    test('should create workspace with auto-delete enabled', () => {
      createSampleWorkspace();

      const workspaces = listWorkspaces();
      expect(workspaces[0]!.autoDeleteDoneTasks).toBe(true);
      expect(workspaces[0]!.retentionDays).toBe(7);
    });

    test('should create workspace with notifications enabled', () => {
      createSampleWorkspace();

      const workspaces = listWorkspaces();
      expect(workspaces[0]!.notifyOnError).toBe(true);
      expect(workspaces[0]!.notifyOnInReview).toBe(true);
    });

    test('should create 4 agents', () => {
      createSampleWorkspace();

      const workspaces = listWorkspaces();
      const agents = listAgents(workspaces[0]!.id);
      expect(agents.length).toBe(4);
    });

    test('should create agents with correct names', () => {
      createSampleWorkspace();

      const workspaces = listWorkspaces();
      const agents = listAgents(workspaces[0]!.id);
      const names = agents.map((a) => a.name);

      expect(names).toContain('Planner');
      expect(names).toContain('Implementer');
      expect(names).toContain('Reviewer');
      expect(names).toContain('Approver');
    });

    test('should create agents in correct order', () => {
      createSampleWorkspace();

      const workspaces = listWorkspaces();
      const agents = listAgents(workspaces[0]!.id);

      // Agents should be ordered by their order field
      expect(agents[0]!.name).toBe('Planner');
      expect(agents[1]!.name).toBe('Implementer');
      expect(agents[2]!.name).toBe('Reviewer');
      expect(agents[3]!.name).toBe('Approver');
    });

    test('should create agents with claude CLI type', () => {
      createSampleWorkspace();

      const workspaces = listWorkspaces();
      const agents = listAgents(workspaces[0]!.id);

      for (const agent of agents) {
        expect(agent.cliType).toBe('claude');
      }
    });

    test('should create agents with non-empty instructions', () => {
      createSampleWorkspace();

      const workspaces = listWorkspaces();
      const agents = listAgents(workspaces[0]!.id);

      for (const agent of agents) {
        expect(agent.instruction.length).toBeGreaterThan(0);
      }
    });
  });

  describe('module exports', () => {
    test('should export createSampleWorkspace function', async () => {
      const module = await import('./sample-workspace.ts');
      expect(module.createSampleWorkspace).toBeDefined();
      expect(typeof module.createSampleWorkspace).toBe('function');
    });
  });
});
