import type { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { chatKeys } from '@/features/chat/hooks/use-chats';
import { taskKeys } from '@/features/task/hooks/use-tasks';
import type { SSEEventHandler } from '@/hooks/use-sse';

interface SSEEventData {
  task_id?: string;
  chat_id?: string;
  workspace_id?: string;
  message?: string;
}

export function createSSEHandlers(queryClient: QueryClient) {
  const handlers: Record<string, SSEEventHandler> = {
    'task.status_changed': (data) => {
      const { task_id, workspace_id, message } = data as SSEEventData;
      if (task_id) {
        queryClient.invalidateQueries({ queryKey: taskKeys.detail(task_id) });
      }
      if (workspace_id) {
        queryClient.invalidateQueries({ queryKey: taskKeys.list(workspace_id) });
      }
      if (message) {
        toast.info(message);
      }
    },

    'task.comment_added': (data) => {
      const { task_id, message } = data as SSEEventData;
      if (task_id) {
        queryClient.invalidateQueries({ queryKey: taskKeys.comments(task_id) });
      }
      if (message) {
        toast.info(message);
      }
    },

    'task.error_occurred': (data) => {
      const { task_id, workspace_id, message } = data as SSEEventData;
      if (task_id) {
        queryClient.invalidateQueries({ queryKey: taskKeys.detail(task_id) });
      }
      if (workspace_id) {
        queryClient.invalidateQueries({ queryKey: taskKeys.list(workspace_id) });
      }
      if (message) {
        toast.error(message);
      }
    },

    'agent.execution_started': (data) => {
      const { task_id, workspace_id } = data as SSEEventData;
      if (task_id) {
        queryClient.invalidateQueries({ queryKey: taskKeys.detail(task_id) });
      }
      if (workspace_id) {
        queryClient.invalidateQueries({ queryKey: taskKeys.list(workspace_id) });
      }
    },

    'agent.execution_finished': (data) => {
      const { task_id, workspace_id } = data as SSEEventData;
      if (task_id) {
        queryClient.invalidateQueries({ queryKey: taskKeys.detail(task_id) });
      }
      if (workspace_id) {
        queryClient.invalidateQueries({ queryKey: taskKeys.list(workspace_id) });
      }
    },

    'chat.message_added': (data) => {
      const { chat_id, message } = data as SSEEventData;
      if (chat_id) {
        queryClient.invalidateQueries({ queryKey: chatKeys.detail(chat_id) });
      }
      if (message) {
        toast.info(message);
      }
    },

    'chat.processing_started': (data) => {
      const { chat_id } = data as SSEEventData;
      if (chat_id) {
        queryClient.invalidateQueries({ queryKey: chatKeys.detail(chat_id) });
      }
    },

    'chat.processing_finished': (data) => {
      const { chat_id } = data as SSEEventData;
      if (chat_id) {
        queryClient.invalidateQueries({ queryKey: chatKeys.detail(chat_id) });
      }
    },
  };

  return handlers;
}
