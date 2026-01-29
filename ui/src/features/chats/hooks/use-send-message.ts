import { useMutation, useQueryClient } from "@tanstack/react-query";
import { nanoid } from "nanoid";

import { chatsApi } from "../api/chats.api.ts";
import type { ChatMessage, MessagesResponse } from "../types/chat.types.ts";

export const useSendMessage = (chatId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (message: string) => chatsApi.sendMessage(chatId, { message }),
    onMutate: async (message: string) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({
        queryKey: ["chats", chatId, "messages"],
      });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueriesData<MessagesResponse>({
        queryKey: ["chats", chatId, "messages"],
      });

      // Create optimistic message
      const optimisticMessage: ChatMessage = {
        id: `optimistic-${nanoid()}`,
        chatId,
        role: "user",
        message,
        actions: null,
        createdAt: new Date().toISOString(),
      };

      // Optimistically update all message queries for this chat
      queryClient.setQueriesData<MessagesResponse>(
        { queryKey: ["chats", chatId, "messages"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            messages: [optimisticMessage, ...old.messages],
          };
        },
      );

      return { previousMessages };
    },
    onError: (_err, _message, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        for (const [queryKey, data] of context.previousMessages) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSettled: () => {
      // Invalidate to refetch with actual server data
      queryClient.invalidateQueries({
        queryKey: ["chats", chatId, "messages"],
      });
      // Invalidate chat to update isProcessing status
      queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
    },
  });
};
