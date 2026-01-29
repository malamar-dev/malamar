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
  /**
   * Fetches a paginated list of chats for a workspace.
   * @param workspaceId - The workspace ID to fetch chats for
   * @param params - Optional pagination and search parameters
   * @returns Paginated list of chats
   */
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

  /**
   * Fetches a single chat by its ID.
   * @param id - The chat ID
   * @returns The chat details
   */
  get: (id: string) => apiClient.get<Chat>(`/chats/${id}`),

  /**
   * Updates a chat's title.
   * @param id - The chat ID
   * @param input - The update data
   * @returns The updated chat
   */
  update: (id: string, input: { title: string }) =>
    apiClient.patch<Chat>(`/chats/${id}`, input),

  /**
   * Creates a new chat in a workspace.
   * @param workspaceId - The workspace ID to create the chat in
   * @param input - The chat creation data
   * @returns The newly created chat
   */
  create: (workspaceId: string, input: CreateChatInput) =>
    apiClient.post<Chat>(`/workspaces/${workspaceId}/chats`, input),

  /**
   * Fetches messages for a chat with pagination.
   * @param chatId - The chat ID to fetch messages for
   * @param params - Optional pagination parameters
   * @returns Paginated list of messages
   */
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

  /**
   * Sends a message to a chat.
   * @param chatId - The chat ID to send the message to
   * @param input - The message content
   * @returns The response from sending the message
   */
  sendMessage: (chatId: string, input: SendMessageInput) =>
    apiClient.post<SendMessageResponse>(`/chats/${chatId}/messages`, input),

  /**
   * Cancels ongoing message processing for a chat.
   * @param chatId - The chat ID to cancel processing for
   * @returns Success status
   */
  cancelProcessing: (chatId: string) =>
    apiClient.post<{ success: boolean }>(`/chats/${chatId}/cancel`, {}),
};
