import { ArrowLeft, Bot, ListTodo, MessageSquare, Settings } from 'lucide-react';
import { Link, Outlet, useLocation, useParams } from 'react-router-dom';

import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkspace } from '@/features/workspace/hooks/use-workspaces';
import { cn } from '@/lib/utils';

const tabs = [
  { path: 'tasks', label: 'Tasks', icon: ListTodo },
  { path: 'chats', label: 'Chat', icon: MessageSquare },
  { path: 'agents', label: 'Agents', icon: Bot },
  { path: 'settings', label: 'Settings', icon: Settings },
];

export function WorkspaceLayout() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const location = useLocation();
  const { data: workspace, isLoading, error } = useWorkspace(workspaceId!);

  if (isLoading) {
    return (
      <div className="container px-4 py-4">
        <div className="flex items-center gap-4 mb-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="container px-4 py-4">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-xl font-semibold">Error</h1>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Workspace not found</p>
          <Button asChild className="mt-4">
            <Link to="/">Go back home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const currentPath = location.pathname.split('/').pop() || 'tasks';

  return (
    <div className="flex flex-col h-full">
      {/* Workspace header */}
      <div className="border-b bg-background">
        <div className="container px-4 py-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-xl font-semibold truncate">{workspace.title}</h1>
          </div>
        </div>

        {/* Horizontal tabs */}
        <div className="container px-4">
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {tabs.map((tab) => {
              const isActive =
                currentPath === tab.path || (tab.path === 'chats' && currentPath.startsWith('chat'));
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.path}
                  to={`/workspaces/${workspaceId}/${tab.path}`}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
