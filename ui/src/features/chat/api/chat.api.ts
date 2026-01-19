import { apiClient } from '@/lib/api-client';

import type { Chat, ChatMessage, CreateChatInput, SendMessageInput, UpdateChatInput } from '../types/chat.types';

export const chatApi = {
  list: (workspaceId: string, query?: string) =>
    apiClient.get<Chat[]>(`/workspaces/${workspaceId}/chats${query ? `?q=${encodeURIComponent(query)}` : ''}`),

  get: (id: string) => apiClient.get<Chat & { messages: ChatMessage[] }>(`/chats/${id}`),

  create: (workspaceId: string, data: CreateChatInput) =>
    apiClient.post<Chat>(`/workspaces/${workspaceId}/chats`, data),

  update: (id: string, data: UpdateChatInput) => apiClient.put<Chat>(`/chats/${id}`, data),

  delete: (id: string) => apiClient.delete<void>(`/chats/${id}`),

  sendMessage: (id: string, data: SendMessageInput) =>
    apiClient.post<ChatMessage>(`/chats/${id}/messages`, data),

  cancel: (id: string) => apiClient.post<void>(`/chats/${id}/cancel`),
};
