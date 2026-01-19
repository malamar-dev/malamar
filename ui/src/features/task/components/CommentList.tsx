import { Bot, MessageSquare, User } from 'lucide-react';

import { Markdown } from '@/components/Markdown';
import { TimeAgo } from '@/components/TimeAgo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

import type { TaskComment } from '../types/task.types';

interface CommentListProps {
  comments: TaskComment[];
}

export function CommentList({ comments }: CommentListProps) {
  if (comments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No comments yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
    </div>
  );
}

function CommentItem({ comment }: { comment: TaskComment }) {
  const isUser = comment.author_type === 'user';
  const isAgent = comment.author_type === 'agent';
  const isSystem = comment.author_type === 'system';

  return (
    <div
      className={cn('flex gap-3', isSystem && 'justify-center')}
    >
      {!isSystem && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className={cn(
            isUser && 'bg-primary text-primary-foreground',
            isAgent && 'bg-secondary'
          )}>
            {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn(
        'flex-1 min-w-0',
        isSystem && 'text-center'
      )}>
        {!isSystem && (
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">
              {isUser ? 'You' : comment.author_name || 'Agent'}
            </span>
            <TimeAgo date={comment.created_at} className="text-xs text-muted-foreground" />
          </div>
        )}

        {isSystem ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            {comment.content}
            <TimeAgo date={comment.created_at} className="ml-2" />
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <Markdown content={comment.content} />
          </div>
        )}
      </div>
    </div>
  );
}
