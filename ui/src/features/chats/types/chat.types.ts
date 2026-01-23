import type { CliType } from "@/types/cli.types.ts";

export interface Chat {
  id: string;
  workspaceId: string;
  agentId: string | null;
  cliType: CliType | null;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatsResponse {
  chats: Chat[];
  pagination: {
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface CreateChatInput {
  title?: string;
  agentId?: string | null;
}
