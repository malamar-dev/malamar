import { Outlet, useParams } from 'react-router-dom';

import { ErrorMessage } from '@/components/ErrorMessage';
import { ListSkeleton } from '@/components/skeletons/ListSkeleton';

import { KanbanBoard } from '../components/KanbanBoard';
import { useTasks } from '../hooks/use-tasks';

export function KanbanBoardPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: tasks, isLoading, error } = useTasks(workspaceId!);

  return (
    <div className="container px-4 py-4 h-full">
      {error && <ErrorMessage error={error} className="mb-4" />}

      {isLoading && <ListSkeleton items={4} />}

      {!isLoading && !error && tasks && <KanbanBoard tasks={tasks} />}

      {/* Task detail modal outlet */}
      <Outlet />
    </div>
  );
}
