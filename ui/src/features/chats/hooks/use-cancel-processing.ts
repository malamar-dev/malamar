import { useMutation, useQueryClient } from "@tanstack/react-query";

import { chatsApi } from "../api/chats.api.ts";

export const useCancelProcessing = (chatId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => chatsApi.cancelProcessing(chatId),
    onSuccess: () => {
      // Invalidate messages to show the cancellation system message
      queryClient.invalidateQueries({ queryKey: ["chat-messages", chatId] });
      // Invalidate chat to update isProcessing status
      queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
    },
  });
};
