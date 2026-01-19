import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { ErrorMessage } from '@/components/ErrorMessage';
import { ListSkeleton } from '@/components/skeletons/ListSkeleton';

import { ChatList } from '../components/ChatList';
import { useChats } from '../hooks/use-chats';

export function ChatListPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: chats, isLoading, error } = useChats(workspaceId!, searchQuery || undefined);

  return (
    <div className="container px-4 py-6 max-w-2xl">
      <h2 className="text-xl font-semibold mb-6">Chats</h2>

      {error && <ErrorMessage error={error} className="mb-6" />}

      {isLoading && <ListSkeleton items={4} hasAvatar />}

      {!isLoading && !error && chats && (
        <ChatList chats={chats} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      )}
    </div>
  );
}
