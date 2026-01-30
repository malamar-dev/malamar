import { useMutation, useQueryClient } from "@tanstack/react-query";

import { chatsApi } from "../api/chats.api.ts";

export const useUploadAttachment = (chatId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => chatsApi.uploadAttachment(chatId, file),
    onSuccess: () => {
      // Invalidate messages to show the new system message about the upload
      queryClient.invalidateQueries({
        queryKey: ["chats", chatId, "messages"],
      });
    },
  });
};
