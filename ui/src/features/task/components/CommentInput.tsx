import { Send } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface CommentInputProps {
  onSubmit: (content: string) => Promise<void>;
  isLoading?: boolean;
}

export function CommentInput({ onSubmit, isLoading }: CommentInputProps) {
  const [content, setContent] = useState('');

  const handleSubmit = async () => {
    if (!content.trim() || isLoading) return;

    await onSubmit(content);
    setContent('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex gap-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add a comment... (Cmd+Enter to send)"
        rows={2}
        className="resize-none"
        disabled={isLoading}
      />
      <Button
        onClick={handleSubmit}
        disabled={!content.trim() || isLoading}
        size="icon"
        className="flex-shrink-0"
      >
        <Send className="h-4 w-4" />
        <span className="sr-only">Send</span>
      </Button>
    </div>
  );
}
