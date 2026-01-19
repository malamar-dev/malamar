import { Link } from 'react-router-dom';

import { TimeAgo } from '@/components/TimeAgo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import type { Workspace } from '../types/workspace.types';

interface WorkspaceCardProps {
  workspace: Workspace;
}

export function WorkspaceCard({ workspace }: WorkspaceCardProps) {
  return (
    <Link to={`/workspaces/${workspace.id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg truncate">{workspace.title}</CardTitle>
          {workspace.description && (
            <CardDescription className="line-clamp-2">{workspace.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <TimeAgo date={workspace.updated_at} />
            <div className="flex gap-1">
              {/* Task count badges will be added when we have task data */}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
