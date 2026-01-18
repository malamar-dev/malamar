import type { CliType } from '../core/types.ts';

/**
 * Agent entity as returned from the database
 */
export interface AgentRow {
  id: string;
  workspace_id: string;
  name: string;
  instruction: string;
  cli_type: CliType;
  order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Agent entity with normalized types
 */
export interface Agent {
  id: string;
  workspaceId: string;
  name: string;
  instruction: string;
  cliType: CliType;
  order: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating a new agent
 */
export interface CreateAgentInput {
  workspaceId: string;
  name: string;
  instruction: string;
  cliType: CliType;
  order?: number;
}

/**
 * Input for updating an existing agent
 */
export interface UpdateAgentInput {
  name?: string;
  instruction?: string;
  cliType?: CliType;
}

/**
 * Input for reordering agents
 */
export interface ReorderAgentsInput {
  agentIds: string[];
}

/**
 * Convert database row to Agent entity
 */
export function rowToAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    instruction: row.instruction,
    cliType: row.cli_type,
    order: row.order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
