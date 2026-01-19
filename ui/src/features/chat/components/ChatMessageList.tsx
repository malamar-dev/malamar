import { useEffect, useRef } from 'react';

import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ScrollArea } from '@/components/ui/scroll-area';

import type { ChatMessage as ChatMessageType } from '../types/chat.types';
import { ChatMessage } from './ChatMessage';

interface ChatMessageListProps {
  messages: ChatMessageType[];
  isProcessing?: boolean;
}

export function ChatMessageList({ messages, isProcessing }: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  return (
    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
      <div className="space-y-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {isProcessing && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <LoadingSpinner size="sm" />
            <span className="text-sm">Agent is typing...</span>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
