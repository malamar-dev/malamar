import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import type {
  AgentExecutionFinishedEvent,
  AgentExecutionStartedEvent,
  ChatMessageAddedEvent,
  ChatProcessingFinishedEvent,
  ChatProcessingStartedEvent,
  TaskCommentAddedEvent,
  TaskErrorOccurredEvent,
  TaskStatusChangedEvent,
} from "@/lib/sse-types.ts";

const SSE_ENDPOINT = "/api/events";
const RECONNECT_DELAY_MS = 3000;

/**
 * Truncate a string to maxLength, adding "..." if truncated.
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

/**
 * Provider component that manages SSE connection, triggers
 * React Query invalidation, and shows toast notifications.
 */
export const SSEEventProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    const connect = () => {
      // Clean up any existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const eventSource = new EventSource(SSE_ENDPOINT);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log("[SSE] Connected to event stream");
      };

      eventSource.onerror = () => {
        console.log("[SSE] Connection error, will reconnect...");
        eventSource.close();
        eventSourceRef.current = null;

        // Schedule reconnection
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("[SSE] Attempting to reconnect...");
          connect();
        }, RECONNECT_DELAY_MS);
      };

      // Handle task status changed
      eventSource.addEventListener("task.status_changed", (event) => {
        const data = JSON.parse(event.data) as TaskStatusChangedEvent;
        queryClient.invalidateQueries({
          queryKey: ["tasks", data.workspaceId],
        });
        queryClient.invalidateQueries({ queryKey: ["tasks", data.taskId] });
        queryClient.invalidateQueries({
          queryKey: ["tasks", data.taskId, "logs"],
        });

        // Show toast for status change to in_review (task needs attention)
        if (data.newStatus === "in_review") {
          toast.info(`Task moved to review`, {
            description: truncate(data.taskSummary, 50),
            action: {
              label: "View",
              onClick: () => {
                window.location.href = `/workspaces/${data.workspaceId}/tasks`;
              },
            },
          });
        }
      });

      // Handle task comment added
      eventSource.addEventListener("task.comment_added", (event) => {
        const data = JSON.parse(event.data) as TaskCommentAddedEvent;
        queryClient.invalidateQueries({
          queryKey: ["tasks", data.taskId, "comments"],
        });
        queryClient.invalidateQueries({
          queryKey: ["tasks", data.taskId, "logs"],
        });
        queryClient.invalidateQueries({
          queryKey: ["tasks", data.workspaceId],
        });

        // Show toast for agent comments (user might want to see)
        if (data.authorName !== "User" && data.authorName !== "System") {
          toast.info(`${data.authorName} commented`, {
            description: truncate(data.taskSummary, 50),
            action: {
              label: "View",
              onClick: () => {
                window.location.href = `/workspaces/${data.workspaceId}/tasks`;
              },
            },
          });
        }
      });

      // Handle task error occurred
      eventSource.addEventListener("task.error_occurred", (event) => {
        const data = JSON.parse(event.data) as TaskErrorOccurredEvent;
        queryClient.invalidateQueries({
          queryKey: ["tasks", data.workspaceId],
        });
        queryClient.invalidateQueries({ queryKey: ["tasks", data.taskId] });
        queryClient.invalidateQueries({
          queryKey: ["tasks", data.taskId, "logs"],
        });

        // Show error toast
        toast.error(`Task error`, {
          description: truncate(data.errorMessage, 80),
          action: {
            label: "View",
            onClick: () => {
              window.location.href = `/workspaces/${data.workspaceId}/tasks`;
            },
          },
        });
      });

      // Handle agent execution started
      eventSource.addEventListener("agent.execution_started", (event) => {
        const data = JSON.parse(event.data) as AgentExecutionStartedEvent;
        queryClient.invalidateQueries({
          queryKey: ["tasks", data.workspaceId],
        });
        queryClient.invalidateQueries({ queryKey: ["tasks", data.taskId] });
        queryClient.invalidateQueries({
          queryKey: ["tasks", data.taskId, "logs"],
        });
      });

      // Handle agent execution finished
      eventSource.addEventListener("agent.execution_finished", (event) => {
        const data = JSON.parse(event.data) as AgentExecutionFinishedEvent;
        queryClient.invalidateQueries({
          queryKey: ["tasks", data.workspaceId],
        });
        queryClient.invalidateQueries({ queryKey: ["tasks", data.taskId] });
        queryClient.invalidateQueries({
          queryKey: ["tasks", data.taskId, "logs"],
        });
      });

      // Handle chat message added
      eventSource.addEventListener("chat.message_added", (event) => {
        const data = JSON.parse(event.data) as ChatMessageAddedEvent;
        queryClient.invalidateQueries({
          queryKey: ["chats", data.chatId, "messages"],
        });
        queryClient.invalidateQueries({ queryKey: ["chat", data.chatId] });
      });

      // Handle chat processing started
      eventSource.addEventListener("chat.processing_started", (event) => {
        const data = JSON.parse(event.data) as ChatProcessingStartedEvent;
        queryClient.invalidateQueries({ queryKey: ["chat", data.chatId] });
        queryClient.invalidateQueries({
          queryKey: ["chats", data.chatId, "messages"],
        });
      });

      // Handle chat processing finished
      eventSource.addEventListener("chat.processing_finished", (event) => {
        const data = JSON.parse(event.data) as ChatProcessingFinishedEvent;
        queryClient.invalidateQueries({ queryKey: ["chat", data.chatId] });
        queryClient.invalidateQueries({
          queryKey: ["chats", data.chatId, "messages"],
        });
      });
    };

    connect();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [queryClient]);

  return <>{children}</>;
};
