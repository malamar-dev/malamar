import { Send } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ChatInputProps {
  onSubmit: (message: string) => Promise<void>;
  isLoading?: boolean;
  isDisabled?: boolean;
}

export function ChatInput({ onSubmit, isLoading, isDisabled }: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    if (!message.trim() || isLoading || isDisabled) return;

    const msg = message;
    setMessage('');
    await onSubmit(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex gap-2 p-4 border-t">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
        rows={1}
        className="resize-none min-h-[40px] max-h-[120px]"
        disabled={isLoading || isDisabled}
        style={{
          height: 'auto',
          overflow: 'hidden',
        }}
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement;
          target.style.height = 'auto';
          target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
        }}
      />
      <Button
        onClick={handleSubmit}
        disabled={!message.trim() || isLoading || isDisabled}
        size="icon"
        className="flex-shrink-0"
      >
        <Send className="h-4 w-4" />
        <span className="sr-only">Send</span>
      </Button>
    </div>
  );
}
