import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import { RootLayout } from '@/components/layouts/RootLayout';
import { WorkspaceLayout } from '@/components/layouts/WorkspaceLayout';
import { SuspenseWrapper } from '@/components/SuspenseWrapper';

// Lazy load pages for code splitting
const WorkspaceList = lazy(() =>
  import('@/features/workspace/pages/WorkspaceList').then((m) => ({ default: m.WorkspaceList }))
);
const GlobalSettingsPage = lazy(() =>
  import('@/features/settings/pages/GlobalSettingsPage').then((m) => ({
    default: m.GlobalSettingsPage,
  }))
);
const KanbanBoardPage = lazy(() =>
  import('@/features/task/pages/KanbanBoardPage').then((m) => ({ default: m.KanbanBoardPage }))
);
const TaskDetailPage = lazy(() =>
  import('@/features/task/pages/TaskDetailPage').then((m) => ({ default: m.TaskDetailPage }))
);
const ChatListPage = lazy(() =>
  import('@/features/chat/pages/ChatListPage').then((m) => ({ default: m.ChatListPage }))
);
const ChatDetailPage = lazy(() =>
  import('@/features/chat/pages/ChatDetailPage').then((m) => ({ default: m.ChatDetailPage }))
);
const AgentListPage = lazy(() =>
  import('@/features/agent/pages/AgentListPage').then((m) => ({ default: m.AgentListPage }))
);
const WorkspaceSettingsPage = lazy(() =>
  import('@/features/workspace/pages/WorkspaceSettings').then((m) => ({
    default: m.WorkspaceSettings,
  }))
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: (
          <SuspenseWrapper>
            <WorkspaceList />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'settings',
        element: (
          <SuspenseWrapper>
            <GlobalSettingsPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'workspaces/:workspaceId',
        element: <WorkspaceLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="tasks" replace />,
          },
          {
            path: 'tasks',
            element: (
              <SuspenseWrapper>
                <KanbanBoardPage />
              </SuspenseWrapper>
            ),
            children: [
              {
                path: ':taskId',
                element: (
                  <SuspenseWrapper>
                    <TaskDetailPage />
                  </SuspenseWrapper>
                ),
              },
            ],
          },
          {
            path: 'chats',
            element: (
              <SuspenseWrapper>
                <ChatListPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'chats/:chatId',
            element: (
              <SuspenseWrapper>
                <ChatDetailPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'agents',
            element: (
              <SuspenseWrapper>
                <AgentListPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'settings',
            element: (
              <SuspenseWrapper>
                <WorkspaceSettingsPage />
              </SuspenseWrapper>
            ),
          },
        ],
      },
    ],
  },
]);
