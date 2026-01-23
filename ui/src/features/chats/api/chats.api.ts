import { apiClient } from "@/lib/api-client.ts";

import type {
  Chat,
  ChatsResponse,
  CreateChatInput,
} from "../types/chat.types.ts";

export const chatsApi = {
  list: (workspaceId: string) =>
    apiClient.get<ChatsResponse>(`/workspaces/${workspaceId}/chats`),
  get: (id: string) => apiClient.get<Chat>(`/chats/${id}`),
  create: (workspaceId: string, input: CreateChatInput) =>
    apiClient.post<Chat>(`/workspaces/${workspaceId}/chats`, input),
};
