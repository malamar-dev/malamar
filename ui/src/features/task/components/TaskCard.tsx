import { MessageSquare, Star } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { TimeAgo } from '@/components/TimeAgo';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import type { Task } from '../types/task.types';

interface TaskCardProps {
  task: Task;
  commentCount?: number;
  isProcessing?: boolean;
}

export function TaskCard({ task, commentCount = 0, isProcessing = false }: TaskCardProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  return (
    <Link to={`/workspaces/${workspaceId}/tasks/${task.id}`}>
      <Card
        className={cn(
          'hover:border-primary/50 transition-colors cursor-pointer',
          isProcessing && 'animate-pulse border-primary'
        )}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium line-clamp-2">{task.summary}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <TimeAgo date={task.updated_at} />
            <div className="flex items-center gap-2">
              {task.is_prioritized && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  <Star className="h-3 w-3 mr-1 fill-current" />
                  Priority
                </Badge>
              )}
              {commentCount > 0 && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {commentCount}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
