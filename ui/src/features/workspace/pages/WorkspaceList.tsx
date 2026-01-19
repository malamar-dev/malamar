import { FolderOpen, Plus } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '@/components/EmptyState';
import { ErrorMessage } from '@/components/ErrorMessage';
import { SearchInput } from '@/components/SearchInput';
import { CardSkeleton } from '@/components/skeletons/CardSkeleton';
import { Button } from '@/components/ui/button';

import { WorkspaceCard } from '../components/WorkspaceCard';
import { WorkspaceCreateModal } from '../components/WorkspaceCreateModal';
import { useWorkspaces } from '../hooks/use-workspaces';

export function WorkspaceList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { data: workspaces, isLoading, error } = useWorkspaces(searchQuery || undefined);

  return (
    <div className="container px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Workspaces</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Workspace
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search workspaces..."
          className="max-w-sm"
        />
      </div>

      {/* Error state */}
      {error && <ErrorMessage error={error} className="mb-6" />}

      {/* Loading state */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && workspaces?.length === 0 && (
        <EmptyState
          icon={FolderOpen}
          title={searchQuery ? 'No workspaces found' : 'No workspaces yet'}
          description={
            searchQuery
              ? `No workspaces match "${searchQuery}". Try a different search term.`
              : 'Create your first workspace to get started.'
          }
          action={
            !searchQuery
              ? {
                  label: 'Create Workspace',
                  onClick: () => setIsCreateModalOpen(true),
                }
              : undefined
          }
        />
      )}

      {/* Workspace grid */}
      {!isLoading && !error && workspaces && workspaces.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace) => (
            <WorkspaceCard key={workspace.id} workspace={workspace} />
          ))}
        </div>
      )}

      {/* Create modal */}
      <WorkspaceCreateModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
    </div>
  );
}
