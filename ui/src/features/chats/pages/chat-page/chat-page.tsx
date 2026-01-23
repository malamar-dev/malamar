import { AlertCircleIcon } from "lucide-react";
import { useParams } from "react-router";

import { AppLayout } from "@/components/layout/app-layout/app-layout.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useWorkspace } from "@/features/workspaces/hooks/use-workspace.ts";

import { useChat } from "../../hooks/use-chat.ts";

const ChatPage = () => {
  const { id: chatId } = useParams<{ id: string }>();
  const { data: chat, isLoading, isError, error } = useChat(chatId ?? "");
  const { data: workspace } = useWorkspace(chat?.workspaceId ?? "");

  const workspaceChatsHref = chat?.workspaceId
    ? `/workspaces/${chat.workspaceId}/chats`
    : "/workspaces";

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
            (chat?.title ?? "")
          ),
        },
      ]}
      variant="sm"
    >
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            <p>{error?.message ?? "An unexpected error occurred"}</p>
          </AlertDescription>
        </Alert>
      ) : (
        <div>{/* Chat content will be added later */}</div>
      )}
    </AppLayout>
  );
};

export default ChatPage;
