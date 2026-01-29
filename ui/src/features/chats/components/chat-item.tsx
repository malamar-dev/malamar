import { Link } from "react-router";

import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import type { Chat } from "@/features/chats";
import { formatFullTimestamp, formatRelativeTime } from "@/lib/date-utils.ts";

interface ChatItemProps {
  chat: Chat;
  agentName?: string;
}

export function ChatItem({ chat, agentName }: ChatItemProps) {
  return (
    <Link to={`/chat/${chat.id}`}>
      <Item variant="muted">
        <ItemContent>
          <ItemTitle>{chat.title}</ItemTitle>

          <ItemDescription className="line-clamp-1">
            {agentName ?? "Malamar"} ·{" "}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default">
                  {formatRelativeTime(chat.updatedAt)}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{formatFullTimestamp(chat.updatedAt)}</p>
              </TooltipContent>
            </Tooltip>
          </ItemDescription>
        </ItemContent>
      </Item>
    </Link>
  );
}
