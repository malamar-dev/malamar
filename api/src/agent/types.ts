/**
 * Supported CLI types for agents.
 */
export type CliType = "claude" | "gemini" | "codex" | "opencode";

/**
 * Agent entity as returned by the API.
 */
export interface Agent {
  id: string;
  workspaceId: string;
  name: string;
  instruction: string;
  cliType: CliType;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Database row representation of an agent.
 */
export interface AgentRow {
  id: string;
  workspace_id: string;
  name: string;
  instruction: string;
  cli_type: string;
  order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a new agent.
 */
export interface CreateAgentInput {
  name: string;
  instruction: string;
  cliType: CliType;
}

/**
 * Input for updating an existing agent.
 */
export interface UpdateAgentInput {
  name?: string;
  instruction?: string;
  cliType?: CliType;
}
