import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { ErrorMessage } from '@/components/ErrorMessage';
import { LoadingSpinner } from '@/components/LoadingSpinner';

import { ChatHeader } from '../components/ChatHeader';
import { ChatInput } from '../components/ChatInput';
import { ChatMessageList } from '../components/ChatMessageList';
import { useChat, useSendMessage } from '../hooks/use-chats';

export function ChatDetailPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const { data: chat, isLoading, error } = useChat(chatId!);
  const sendMessage = useSendMessage();

  const handleSendMessage = async (message: string) => {
    try {
      await sendMessage.mutateAsync({ chatId: chatId!, message });
    } catch {
      toast.error('Failed to send message');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !chat) {
    return (
      <div className="container px-4 py-6">
        <ErrorMessage error={error} title="Chat not found" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ChatHeader chat={chat} />
      <ChatMessageList messages={chat.messages || []} isProcessing={chat.is_processing} />
      <ChatInput
        onSubmit={handleSendMessage}
        isLoading={sendMessage.isPending}
        isDisabled={chat.is_processing}
      />
    </div>
  );
}
