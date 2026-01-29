import { useMutation, useQueryClient } from "@tanstack/react-query";

import { chatsApi } from "../api/chats.api.ts";

export const useUpdateChat = (chatId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { title: string }) => chatsApi.update(chatId, input),
    onSuccess: (data) => {
      // Update the chat in cache
      queryClient.setQueryData(["chat", chatId], data);
      // Invalidate the chats list to reflect the new title
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
};
