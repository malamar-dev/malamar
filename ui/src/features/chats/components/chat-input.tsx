import {
  AlertCircleIcon,
  Loader2Icon,
  SendIcon,
  SquareIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { cn } from "@/lib/utils.ts";

interface ChatInputProps {
  onSend: (message: string) => void;
  onCancel: () => void;
  isProcessing: boolean;
  isSending: boolean;
  isCancelling: boolean;
  disabled?: boolean;
  className?: string;
  error?: Error | null;
  onClearError?: () => void;
}

export const ChatInput = ({
  onSend,
  onCancel,
  isProcessing,
  isSending,
  isCancelling,
  disabled = false,
  className,
  error,
  onClearError,
}: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = message.trim();
    if (!trimmed || isSending || disabled) return;

    // Clear any previous error when sending a new message
    onClearError?.();
    onSend(trimmed);
    setMessage("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [message, isSending, disabled, onSend, onClearError]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send, Shift+Enter for new line
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isProcessing) {
        handleSend();
      }
    }
  };

  const canSend = message.trim().length > 0 && !isSending && !disabled;
  const showCancelButton = isProcessing;
  const showSendButton = !isProcessing;

  return (
    <div className={cn("bg-background border-t p-4", className)}>
      <div className="mx-auto max-w-3xl">
        {/* Error message */}
        {error && (
          <Alert variant="destructive" className="mb-3">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error.message || "Failed to send message"}</span>
              {onClearError && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={onClearError}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={disabled || isProcessing}
            className="max-h-32 min-h-10 resize-none"
            rows={1}
          />

          {showSendButton && (
            <Button
              onClick={handleSend}
              disabled={!canSend}
              size="icon"
              className="shrink-0"
            >
              {isSending ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <SendIcon />
              )}
            </Button>
          )}

          {showCancelButton && (
            <Button
              onClick={onCancel}
              disabled={isCancelling}
              variant="destructive"
              size="icon"
              className="shrink-0"
            >
              {isCancelling ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <SquareIcon />
              )}
            </Button>
          )}
        </div>
        <p className="text-muted-foreground mt-2 text-center text-xs">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};
