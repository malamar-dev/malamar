export type CliType = "claude" | "gemini" | "codex" | "opencode";

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

export interface AgentsResponse {
  agents: Agent[];
}

export interface CreateAgentInput {
  name: string;
  instruction: string;
  cliType: CliType;
}

export interface UpdateAgentInput {
  name?: string;
  instruction?: string;
  cliType?: CliType;
}

export interface ReorderAgentsInput {
  agentIds: string[];
}
