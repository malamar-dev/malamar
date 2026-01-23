import { useMutation, useQueryClient } from "@tanstack/react-query";

import { chatsApi } from "../api/chats.api.ts";

export const useSendMessage = (chatId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (message: string) => chatsApi.sendMessage(chatId, { message }),
    onSuccess: () => {
      // Invalidate messages to show the new user message
      queryClient.invalidateQueries({ queryKey: ["chat-messages", chatId] });
      // Invalidate chat to update isProcessing status
      queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
    },
  });
};
