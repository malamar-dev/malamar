import { AlertCircleIcon, MoreVerticalIcon, Trash2Icon } from "lucide-react";
import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { AppLayout } from "@/components/layout/app-layout/app-layout.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useHealth } from "@/features/settings/hooks/use-health.ts";
import type { CliType } from "@/features/settings/types/health.types.ts";
import { useAgents } from "@/features/workspaces/hooks/use-agents.ts";
import { useWorkspace } from "@/features/workspaces/hooks/use-workspace.ts";

import { ChatAgentSwitcher } from "../../components/chat-agent-switcher.tsx";
import { ChatCliSwitcher } from "../../components/chat-cli-switcher.tsx";
import { ChatInput } from "../../components/chat-input.tsx";
import { ChatMessagesList } from "../../components/chat-messages-list.tsx";
import { DeleteChatDialog } from "../../components/delete-chat-dialog.tsx";
import { EditableChatTitle } from "../../components/editable-chat-title.tsx";
import { useCancelProcessing } from "../../hooks/use-cancel-processing.ts";
import { useChat } from "../../hooks/use-chat.ts";
import { useMessages } from "../../hooks/use-messages.ts";
import { useSendMessage } from "../../hooks/use-send-message.ts";
import { useUpdateChat } from "../../hooks/use-update-chat.ts";

const MESSAGES_PER_PAGE = 50;

const ChatPage = () => {
  const { id: chatId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Queries
  const { data: chat, isLoading, isError, error } = useChat(chatId ?? "");
  const { data: workspace } = useWorkspace(chat?.workspaceId ?? "");
  const { data: agentsData } = useAgents(chat?.workspaceId ?? "");
  const { data: healthData } = useHealth();

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

  const handleSwitchAgent = useCallback(
    (agentId: string | null) => {
      updateChat.mutate({ agentId });
    },
    [updateChat],
  );

  const handleSwitchCli = useCallback(
    (cliType: CliType | null) => {
      updateChat.mutate({ cliType });
    },
    [updateChat],
  );

  const handleDeleteSuccess = useCallback(() => {
    if (chat) {
      navigate(`/workspaces/${chat.workspaceId}/chats`);
    }
  }, [chat, navigate]);

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
          {/* Agent and CLI switcher header */}
          <div className="border-b px-4 py-2">
            <div className="mx-auto flex max-w-3xl items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">
                    Chatting with
                  </span>
                  <ChatAgentSwitcher
                    currentAgentId={chat?.agentId ?? null}
                    agents={agentsData?.agents ?? []}
                    onSwitch={handleSwitchAgent}
                    isLoading={updateChat.isPending}
                    disabled={isProcessing}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">using</span>
                  <ChatCliSwitcher
                    currentCliType={chat?.cliType ?? null}
                    clis={healthData?.clis ?? []}
                    onSwitch={handleSwitchCli}
                    isLoading={updateChat.isPending}
                    disabled={isProcessing}
                  />
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVerticalIcon className="h-4 w-4" />
                    <span className="sr-only">Chat options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2Icon className="mr-2 h-4 w-4" />
                    Delete chat
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

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

          {/* Delete chat dialog */}
          <DeleteChatDialog
            open={showDeleteDialog}
            setOpen={setShowDeleteDialog}
            workspaceId={chat?.workspaceId ?? ""}
            chat={chat ?? null}
            onSuccess={handleDeleteSuccess}
          />
        </>
      )}
    </AppLayout>
  );
};

export default ChatPage;
