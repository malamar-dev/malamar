import { useParams } from 'react-router-dom';

import { ErrorMessage } from '@/components/ErrorMessage';
import { ListSkeleton } from '@/components/skeletons/ListSkeleton';

import { AgentList } from '../components/AgentList';
import { useAgents } from '../hooks/use-agents';

export function AgentListPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: agents, isLoading, error } = useAgents(workspaceId!);

  return (
    <div className="container px-4 py-6 max-w-2xl">
      <h2 className="text-xl font-semibold mb-6">Agents</h2>

      {error && <ErrorMessage error={error} className="mb-6" />}

      {isLoading && <ListSkeleton items={3} />}

      {!isLoading && !error && agents && <AgentList agents={agents} workspaceId={workspaceId!} />}
    </div>
  );
}
