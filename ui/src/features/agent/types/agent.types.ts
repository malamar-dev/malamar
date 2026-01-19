export type CliType = 'claude' | 'gemini' | 'codex' | 'opencode';

export interface Agent {
  id: string;
  workspace_id: string;
  name: string;
  instruction: string;
  cli_type: CliType;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAgentInput {
  name: string;
  instruction: string;
  cli_type: CliType;
}

export interface UpdateAgentInput {
  name?: string;
  instruction?: string;
  cli_type?: CliType;
}
