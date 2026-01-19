import { Bot, User } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { TimeAgo } from '@/components/TimeAgo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

import type { Chat } from '../types/chat.types';

interface ChatListItemProps {
  chat: Chat;
}

export function ChatListItem({ chat }: ChatListItemProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  return (
    <Link
      to={`/workspaces/${workspaceId}/chats/${chat.id}`}
      className="flex items-center gap-3 p-4 rounded-lg border hover:border-primary/50 transition-colors"
    >
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarFallback className="bg-secondary">
          {chat.agent_id ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium truncate">{chat.title}</h3>
          {chat.is_processing && (
            <Badge variant="secondary" className="text-xs animate-pulse">
              Processing
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{chat.agent_name || 'Malamar'}</span>
          <span>·</span>
          <TimeAgo date={chat.updated_at} />
        </div>
      </div>
    </Link>
  );
}
