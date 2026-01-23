import { ArrowDownIcon, Loader2Icon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";

import type { ChatMessage as ChatMessageType } from "../types/chat.types.ts";
import { ChatMessage } from "./chat-message.tsx";
import { TypingIndicator } from "./typing-indicator.tsx";

interface ChatMessagesListProps {
  messages: ChatMessageType[];
  isProcessing: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  className?: string;
}

const SCROLL_THRESHOLD = 100; // pixels from bottom to consider "near bottom"

export const ChatMessagesList = ({
  messages,
  isProcessing,
  hasMore,
  isLoadingMore,
  onLoadMore,
  className,
}: ChatMessagesListProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showNewMessageIndicator, setShowNewMessageIndicator] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const prevMessagesLengthRef = useRef(messages.length);

  // Check if user is near the bottom of the scroll container
  const checkIsNearBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return true;

    const { scrollHeight, scrollTop, clientHeight } = container;
    return scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD;
  }, []);

  // Scroll to bottom of the container
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
    setShowNewMessageIndicator(false);
  }, []);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    const nearBottom = checkIsNearBottom();
    setIsNearBottom(nearBottom);

    if (nearBottom) {
      setShowNewMessageIndicator(false);
    }
  }, [checkIsNearBottom]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    const hasNewMessages = messages.length > prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages.length;

    if (hasNewMessages) {
      if (isNearBottom) {
        // User is near bottom, auto-scroll
        scrollToBottom();
      } else {
        // User has scrolled up, show indicator
        setShowNewMessageIndicator(true);
      }
    }
  }, [messages.length, isNearBottom, scrollToBottom]);

  // Initial scroll to bottom on mount
  useEffect(() => {
    scrollToBottom("instant");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Messages are returned newest first from API, so we need to reverse for display
  const displayMessages = [...messages].reverse();

  return (
    <div className={cn("relative flex-1 overflow-hidden", className)}>
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto"
      >
        <div className="mx-auto max-w-3xl space-y-4 p-4">
          {/* Load more button at top */}
          {hasMore && (
            <div className="flex justify-center py-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2Icon className="animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load older messages"
                )}
              </Button>
            </div>
          )}

          {/* Messages */}
          {displayMessages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {/* Typing indicator */}
          {isProcessing && <TypingIndicator />}
        </div>
      </div>

      {/* New message indicator */}
      {showNewMessageIndicator && (
        <div className="absolute inset-x-0 bottom-4 flex justify-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => scrollToBottom()}
            className="shadow-lg"
          >
            <ArrowDownIcon className="mr-1 h-4 w-4" />
            New messages
          </Button>
        </div>
      )}
    </div>
  );
};
