import { Link } from "react-router";

import { Badge } from "@/components/ui/badge.tsx";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item.tsx";
import { useServerProps } from "@/hooks/use-server-props.ts";
import { formatRelativeTime } from "@/lib/date-utils.ts";

import type { Chat } from "../types/chat.types.ts";

interface ChatItemProps {
  chat: Chat;
  agentName?: string;
}

export function ChatItem({ chat, agentName }: ChatItemProps) {
  const { defaultCliType } = useServerProps();
  const displayCliType = chat.cliType ?? defaultCliType;

  return (
    <Link to={`/chat/${chat.id}`}>
      <Item variant="muted">
        <ItemContent>
          <ItemTitle>
            {chat.title}{" "}
            <Badge variant="outline" className="text-xs uppercase">
              {displayCliType}
            </Badge>
          </ItemTitle>

          <ItemDescription className="line-clamp-1">
            {agentName ?? "Malamar"} · {formatRelativeTime(chat.updatedAt)}
          </ItemDescription>
        </ItemContent>
      </Item>
    </Link>
  );
}
