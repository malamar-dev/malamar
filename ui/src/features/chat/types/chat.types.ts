import type { CliType } from '@/features/agent/types/agent.types';

export type MessageRole = 'user' | 'agent' | 'system';

export interface Chat {
  id: string;
  workspace_id: string;
  agent_id?: string;
  agent_name?: string;
  cli_type?: CliType;
  title: string;
  is_processing: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  role: MessageRole;
  message: string;
  created_at: string;
}

export interface CreateChatInput {
  title?: string;
  agent_id?: string;
}

export interface UpdateChatInput {
  title?: string;
  agent_id?: string;
  cli_type?: CliType;
}

export interface SendMessageInput {
  message: string;
}
