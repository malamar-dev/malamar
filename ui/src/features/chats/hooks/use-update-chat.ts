import { useMutation, useQueryClient } from "@tanstack/react-query";

import { chatsApi } from "../api/chats.api.ts";
import type { UpdateChatInput } from "../types/chat.types.ts";

export const useUpdateChat = (chatId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateChatInput) => chatsApi.update(chatId, input),
    onSuccess: (data) => {
      // Update the chat in cache
      queryClient.setQueryData(["chat", chatId], data);
      // Invalidate the chats list to reflect changes
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      // Invalidate messages to fetch new system message when agent changes
      queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
    },
  });
};
