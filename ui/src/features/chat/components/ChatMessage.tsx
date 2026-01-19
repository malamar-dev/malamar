import { Bot, Info, User } from 'lucide-react';

import { Markdown } from '@/components/Markdown';
import { TimeAgo } from '@/components/TimeAgo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

import type { ChatMessage as ChatMessageType } from '../types/chat.types';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isAgent = message.role === 'agent';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-xs text-muted-foreground">
          <Info className="h-3 w-3" />
          {message.message}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback
          className={cn(isUser && 'bg-primary text-primary-foreground', isAgent && 'bg-secondary')}
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div className={cn('flex-1 min-w-0', isUser && 'text-right')}>
        <div
          className={cn(
            'inline-block rounded-lg px-4 py-2 max-w-[85%]',
            isUser && 'bg-primary text-primary-foreground',
            isAgent && 'bg-muted'
          )}
        >
          {isAgent ? (
            <Markdown content={message.message} className="text-sm" />
          ) : (
            <p className="text-sm whitespace-pre-wrap">{message.message}</p>
          )}
        </div>
        <div className={cn('mt-1', isUser && 'text-right')}>
          <TimeAgo date={message.created_at} className="text-xs text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
