import { Bot, MessageSquare, Plus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { EmptyState } from '@/components/EmptyState';
import { SearchInput } from '@/components/SearchInput';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAgents } from '@/features/agent/hooks/use-agents';

import { useCreateChat } from '../hooks/use-chats';
import type { Chat } from '../types/chat.types';
import { ChatListItem } from './ChatListItem';

interface ChatListProps {
  chats: Chat[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function ChatList({ chats, searchQuery, onSearchChange }: ChatListProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { data: agents = [] } = useAgents(workspaceId!);
  const createChat = useCreateChat(workspaceId!);

  const handleCreateChat = async (agentId?: string) => {
    try {
      const chat = await createChat.mutateAsync({
        agent_id: agentId,
        title: 'New Chat',
      });
      navigate(`/workspaces/${workspaceId}/chats/${chat.id}`);
    } catch {
      toast.error('Failed to create chat');
    }
  };

  if (chats.length === 0 && !searchQuery) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <NewChatDropdown
            agents={agents.map((a) => ({ id: a.id, name: a.name }))}
            onSelect={handleCreateChat}
            isLoading={createChat.isPending}
          />
        </div>
        <EmptyState
          icon={MessageSquare}
          title="No conversations yet"
          description="Start a chat with Malamar or one of your agents."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <SearchInput
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search chats..."
          className="flex-1"
        />
        <NewChatDropdown
          agents={agents.map((a) => ({ id: a.id, name: a.name }))}
          onSelect={handleCreateChat}
          isLoading={createChat.isPending}
        />
      </div>

      {/* Chat list */}
      {chats.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No chats found"
          description={`No chats match "${searchQuery}". Try a different search term.`}
        />
      ) : (
        <div className="space-y-2">
          {chats.map((chat) => (
            <ChatListItem key={chat.id} chat={chat} />
          ))}
        </div>
      )}
    </div>
  );
}

interface NewChatDropdownProps {
  agents: { id: string; name: string }[];
  onSelect: (agentId?: string) => void;
  isLoading: boolean;
}

function NewChatDropdown({ agents, onSelect, isLoading }: NewChatDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={isLoading}>
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onSelect(undefined)}>
          <Bot className="h-4 w-4 mr-2" />
          Chat with Malamar
        </DropdownMenuItem>
        {agents.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {agents.map((agent) => (
              <DropdownMenuItem key={agent.id} onClick={() => onSelect(agent.id)}>
                <Bot className="h-4 w-4 mr-2" />
                {agent.name}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
