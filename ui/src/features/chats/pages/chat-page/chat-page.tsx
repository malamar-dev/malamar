import { AlertCircleIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { useParams } from "react-router";

import { AppLayout } from "@/components/layout/app-layout/app-layout.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useWorkspace } from "@/features/workspaces/hooks/use-workspace.ts";

import { ChatInput } from "../../components/chat-input.tsx";
import { ChatMessagesList } from "../../components/chat-messages-list.tsx";
import { EditableChatTitle } from "../../components/editable-chat-title.tsx";
import { useCancelProcessing } from "../../hooks/use-cancel-processing.ts";
import { useChat } from "../../hooks/use-chat.ts";
import { useMessages } from "../../hooks/use-messages.ts";
import { useSendMessage } from "../../hooks/use-send-message.ts";
import { useUpdateChat } from "../../hooks/use-update-chat.ts";

const MESSAGES_PER_PAGE = 50;

const ChatPage = () => {
  const { id: chatId } = useParams<{ id: string }>();
  const [offset, setOffset] = useState(0);

  // Queries
  const { data: chat, isLoading, isError, error } = useChat(chatId ?? "");
  const { data: workspace } = useWorkspace(chat?.workspaceId ?? "");

  const isProcessing = chat?.isProcessing ?? false;

  // Pass isProcessing to enable conditional polling
  const { data: messagesData, isLoading: isLoadingMessages } = useMessages(
    chatId ?? "",
    { offset, limit: MESSAGES_PER_PAGE },
    isProcessing,
  );

  // Mutations
  const sendMessage = useSendMessage(chatId ?? "");
  const cancelProcessing = useCancelProcessing(chatId ?? "");
  const updateChat = useUpdateChat(chatId ?? "");

  // Combine errors from both mutations
  const mutationError = sendMessage.error || cancelProcessing.error;

  // Handlers
  const handleSend = useCallback(
    (message: string) => {
      sendMessage.mutate(message);
    },
    [sendMessage],
  );

  const handleCancel = useCallback(() => {
    cancelProcessing.mutate();
  }, [cancelProcessing]);

  const handleLoadMore = useCallback(() => {
    if (messagesData?.pagination.hasMore) {
      setOffset((prev) => prev + MESSAGES_PER_PAGE);
    }
  }, [messagesData?.pagination.hasMore]);

  const handleClearError = useCallback(() => {
    sendMessage.reset();
    cancelProcessing.reset();
  }, [sendMessage, cancelProcessing]);

  const handleUpdateTitle = useCallback(
    async (newTitle: string) => {
      await updateChat.mutateAsync({ title: newTitle });
    },
    [updateChat],
  );

  const workspaceChatsHref = chat?.workspaceId
    ? `/workspaces/${chat.workspaceId}/chats`
    : "/workspaces";

  const messages = messagesData?.messages ?? [];
  const hasMore = messagesData?.pagination.hasMore ?? false;

  return (
    <AppLayout
      breadcrumbItems={[
        { label: "Workspaces", href: "/workspaces" },
        { label: workspace?.title ?? "", href: workspaceChatsHref },
        { label: "Chats", href: workspaceChatsHref },
        {
          label: isLoading ? (
            <Skeleton className="h-4 w-24" />
          ) : (
            <EditableChatTitle
              title={chat?.title ?? ""}
              onSave={handleUpdateTitle}
              isSaving={updateChat.isPending}
            />
          ),
        },
      ]}
      variant="fluid"
      className="flex h-[calc(100vh-3.5rem)] flex-col p-0"
    >
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      ) : isError ? (
        <div className="flex flex-1 items-center justify-center p-4">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircleIcon />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>
              <p>{error?.message ?? "An unexpected error occurred"}</p>
            </AlertDescription>
          </Alert>
        </div>
      ) : (
        <>
          {/* Messages area */}
          {isLoadingMessages && messages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <Skeleton className="h-8 w-32" />
            </div>
          ) : (
            <ChatMessagesList
              messages={messages}
              isProcessing={isProcessing}
              hasMore={hasMore}
              isLoadingMore={isLoadingMessages && messages.length > 0}
              onLoadMore={handleLoadMore}
            />
          )}

          {/* Input area */}
          <ChatInput
            onSend={handleSend}
            onCancel={handleCancel}
            isProcessing={isProcessing}
            isSending={sendMessage.isPending}
            isCancelling={cancelProcessing.isPending}
            error={mutationError}
            onClearError={handleClearError}
          />
        </>
      )}
    </AppLayout>
  );
};

export default ChatPage;
