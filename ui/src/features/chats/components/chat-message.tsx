import { formatRelativeTime } from "@/lib/date-utils.ts";
import { cn } from "@/lib/utils.ts";

import type { ChatMessage as ChatMessageType } from "../types/chat.types.ts";
import { ActionRenderer } from "./action-renderer.tsx";

interface ChatMessageProps {
  message: ChatMessageType;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  const formattedTime = formatRelativeTime(message.createdAt);

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <div className="bg-muted/50 text-muted-foreground rounded-lg px-4 py-2 text-center text-sm">
          <p className="whitespace-pre-wrap">{message.message}</p>
          <p className="mt-1 text-xs opacity-70">{formattedTime}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted rounded-bl-sm",
        )}
      >
        <p className="break-words whitespace-pre-wrap">{message.message}</p>

        {/* Render actions for agent messages */}
        {!isUser && message.actions && message.actions.length > 0 && (
          <ActionRenderer actions={message.actions} className="mt-3" />
        )}

        <p
          className={cn(
            "mt-1 text-xs",
            isUser ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {formattedTime}
        </p>
      </div>
    </div>
  );
};
