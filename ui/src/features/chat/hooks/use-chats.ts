import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { chatApi } from '../api/chat.api';
import type { CreateChatInput, UpdateChatInput } from '../types/chat.types';

export const chatKeys = {
  all: ['chats'] as const,
  lists: () => [...chatKeys.all, 'list'] as const,
  list: (workspaceId: string, query?: string) => [...chatKeys.lists(), workspaceId, { query }] as const,
  details: () => [...chatKeys.all, 'detail'] as const,
  detail: (id: string) => [...chatKeys.details(), id] as const,
};

export function useChats(workspaceId: string, query?: string) {
  return useQuery({
    queryKey: chatKeys.list(workspaceId, query),
    queryFn: () => chatApi.list(workspaceId, query),
    enabled: !!workspaceId,
  });
}

export function useChat(id: string) {
  return useQuery({
    queryKey: chatKeys.detail(id),
    queryFn: () => chatApi.get(id),
    enabled: !!id,
  });
}

export function useCreateChat(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateChatInput) => chatApi.create(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.lists() });
    },
  });
}

export function useUpdateChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateChatInput }) => chatApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: chatKeys.lists() });
    },
  });
}

export function useDeleteChat(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => chatApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.list(workspaceId) });
    },
  });
}

interface ChatWithMessages {
  id: string;
  messages?: { id: string; role: string; message: string; created_at: string }[];
  is_processing?: boolean;
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ chatId, message }: { chatId: string; message: string }) =>
      chatApi.sendMessage(chatId, { message }),
    onMutate: async ({ chatId, message }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: chatKeys.detail(chatId) });

      // Snapshot previous value
      const previousChat = queryClient.getQueryData<ChatWithMessages>(chatKeys.detail(chatId));

      // Optimistically add the user message and set processing state
      queryClient.setQueryData<ChatWithMessages>(chatKeys.detail(chatId), (old) => {
        if (!old) return old;
        return {
          ...old,
          is_processing: true,
          messages: [
            ...(old.messages || []),
            {
              id: `temp-${Date.now()}`,
              role: 'user',
              message,
              created_at: new Date().toISOString(),
            },
          ],
        };
      });

      return { previousChat };
    },
    onError: (_, { chatId }, context) => {
      // Rollback on error
      if (context?.previousChat) {
        queryClient.setQueryData(chatKeys.detail(chatId), context.previousChat);
      }
    },
    onSettled: (_, __, { chatId }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: chatKeys.detail(chatId) });
    },
  });
}

export function useCancelChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => chatApi.cancel(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.detail(id) });
    },
  });
}
