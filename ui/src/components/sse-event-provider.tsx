import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import type {
  ChatMessageAddedEvent,
  ChatProcessingFinishedEvent,
  ChatProcessingStartedEvent,
  SSEEventType,
  TaskCommentAddedEvent,
  TaskErrorOccurredEvent,
  TaskStatusChangedEvent,
} from "@/lib/sse-types.ts";

const SSE_ENDPOINT = "/api/events";
const RECONNECT_DELAY_MS = 3000;

/**
 * Provider component that manages SSE connection and triggers
 * React Query invalidation when events are received.
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

      // Handle task events
      eventSource.addEventListener("task.status_changed", (event) => {
        const data = JSON.parse(event.data) as TaskStatusChangedEvent;
        queryClient.invalidateQueries({
          queryKey: ["tasks", data.workspaceId],
        });
        queryClient.invalidateQueries({ queryKey: ["tasks", data.taskId] });
        queryClient.invalidateQueries({
          queryKey: ["tasks", data.taskId, "logs"],
        });
      });

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
      });

      eventSource.addEventListener("task.error_occurred", (event) => {
        const data = JSON.parse(event.data) as TaskErrorOccurredEvent;
        queryClient.invalidateQueries({
          queryKey: ["tasks", data.workspaceId],
        });
        queryClient.invalidateQueries({ queryKey: ["tasks", data.taskId] });
        queryClient.invalidateQueries({
          queryKey: ["tasks", data.taskId, "logs"],
        });
      });

      // Handle agent events - refresh task data
      const handleAgentEvent = (eventType: SSEEventType) => {
        eventSource.addEventListener(eventType, (event) => {
          const data = JSON.parse(event.data) as {
            taskId: string;
            workspaceId: string;
          };
          queryClient.invalidateQueries({
            queryKey: ["tasks", data.workspaceId],
          });
          queryClient.invalidateQueries({ queryKey: ["tasks", data.taskId] });
          queryClient.invalidateQueries({
            queryKey: ["tasks", data.taskId, "logs"],
          });
        });
      };

      handleAgentEvent("agent.execution_started");
      handleAgentEvent("agent.execution_finished");

      // Handle chat events
      eventSource.addEventListener("chat.message_added", (event) => {
        const data = JSON.parse(event.data) as ChatMessageAddedEvent;
        queryClient.invalidateQueries({
          queryKey: ["chats", data.chatId, "messages"],
        });
        queryClient.invalidateQueries({ queryKey: ["chat", data.chatId] });
      });

      eventSource.addEventListener("chat.processing_started", (event) => {
        const data = JSON.parse(event.data) as ChatProcessingStartedEvent;
        queryClient.invalidateQueries({ queryKey: ["chat", data.chatId] });
        queryClient.invalidateQueries({
          queryKey: ["chats", data.chatId, "messages"],
        });
      });

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
