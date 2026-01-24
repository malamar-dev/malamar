import { Link } from "react-router";

import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item.tsx";
import type { Chat } from "@/features/chats";
import { formatRelativeTime } from "@/lib/date-utils.ts";

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
            {agentName ?? "Malamar"} · {formatRelativeTime(chat.updatedAt)}
          </ItemDescription>
        </ItemContent>
      </Item>
    </Link>
  );
}
