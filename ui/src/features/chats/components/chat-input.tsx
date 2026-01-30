import {
  AlertCircleIcon,
  Loader2Icon,
  PaperclipIcon,
  SendIcon,
  SquareIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Link } from "react-router";

import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { cn } from "@/lib/utils.ts";

interface ChatInputProps {
  onSend: (message: string) => void;
  onCancel: () => void;
  onUploadFile: (file: File) => void;
  isProcessing: boolean;
  isSending: boolean;
  isCancelling: boolean;
  isUploading: boolean;
  disabled?: boolean;
  className?: string;
  error?: Error | null;
  onClearError?: () => void;
  noCliError?: boolean;
}

export const ChatInput = ({
  onSend,
  onCancel,
  onUploadFile,
  isProcessing,
  isSending,
  isCancelling,
  isUploading,
  disabled = false,
  className,
  error,
  onClearError,
  noCliError = false,
}: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    // Ctrl/Cmd+Enter or plain Enter to send, Shift+Enter for new line
    if (e.key === "Enter") {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl || !e.shiftKey) {
        e.preventDefault();
        if (!isProcessing) {
          handleSend();
        }
      }
    }
  };

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onUploadFile(file);
        // Reset the input so the same file can be uploaded again
        e.target.value = "";
      }
    },
    [onUploadFile],
  );

  const handleAttachClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const canSend = message.trim().length > 0 && !isSending && !disabled;
  const showCancelButton = isProcessing;
  const showSendButton = !isProcessing;
  const canAttach = !disabled && !isProcessing && !isUploading;

  return (
    <div className={cn("bg-background border-t p-4", className)}>
      <div className="mx-auto max-w-3xl">
        {/* No CLI warning */}
        {noCliError && (
          <Alert variant="warning" className="mb-3">
            <TriangleAlertIcon className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                No CLI available.{" "}
                <Link to="/settings/clis" className="underline">
                  Configure in settings
                </Link>
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Error message */}
        {error && !noCliError && (
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
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Attachment button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleAttachClick}
            disabled={!canAttach}
            className="shrink-0"
            title="Attach file"
          >
            {isUploading ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <PaperclipIcon />
            )}
          </Button>

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
          Press Enter or ⌘/Ctrl+Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};
