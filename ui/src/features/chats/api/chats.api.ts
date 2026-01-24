import { apiClient } from "@/lib/api-client.ts";

import type {
  Chat,
  ChatsResponse,
  CreateChatInput,
  ListChatsParams,
  MessagesResponse,
  PaginationParams,
  SendMessageInput,
  SendMessageResponse,
} from "../types/chat.types.ts";

export const chatsApi = {
  // Chat operations
  list: (workspaceId: string, params?: ListChatsParams) => {
    const searchParams = new URLSearchParams();
    if (params?.q) {
      searchParams.set("q", params.q);
    }
    if (params?.offset !== undefined) {
      searchParams.set("offset", String(params.offset));
    }
    if (params?.limit !== undefined) {
      searchParams.set("limit", String(params.limit));
    }
    const query = searchParams.toString();
    const url = `/workspaces/${workspaceId}/chats${query ? `?${query}` : ""}`;
    return apiClient.get<ChatsResponse>(url);
  },
  get: (id: string) => apiClient.get<Chat>(`/chats/${id}`),
  create: (workspaceId: string, input: CreateChatInput) =>
    apiClient.post<Chat>(`/workspaces/${workspaceId}/chats`, input),

  // Message operations
  getMessages: (chatId: string, params?: PaginationParams) => {
    const searchParams = new URLSearchParams();
    if (params?.offset !== undefined) {
      searchParams.set("offset", String(params.offset));
    }
    if (params?.limit !== undefined) {
      searchParams.set("limit", String(params.limit));
    }
    const query = searchParams.toString();
    const url = `/chats/${chatId}/messages${query ? `?${query}` : ""}`;
    return apiClient.get<MessagesResponse>(url);
  },
  sendMessage: (chatId: string, input: SendMessageInput) =>
    apiClient.post<SendMessageResponse>(`/chats/${chatId}/messages`, input),
  cancelProcessing: (chatId: string) =>
    apiClient.post<{ success: boolean }>(`/chats/${chatId}/cancel`, {}),
};
