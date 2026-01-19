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

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ chatId, message }: { chatId: string; message: string }) =>
      chatApi.sendMessage(chatId, { message }),
    onSuccess: (_, { chatId }) => {
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
