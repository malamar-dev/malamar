import {
  ArrowDownIcon,
  ArrowUpIcon,
  MessageSquareIcon,
  MoreVerticalIcon,
  PencilIcon,
  TrashIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item.tsx";

import type { Agent } from "../types/agent.types.ts";

interface AgentItemProps {
  agent: Agent;
  isFirst: boolean;
  isLast: boolean;
  onEdit: (agent: Agent) => void;
  onDelete: (agent: Agent) => void;
  onMoveUp: (agent: Agent) => void;
  onMoveDown: (agent: Agent) => void;
  onChat: (agent: Agent) => void;
}

export function AgentItem({
  agent,
  isFirst,
  isLast,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onChat,
}: AgentItemProps) {
  return (
    <Item variant="muted">
      <ItemContent>
        <ItemTitle>
          {agent.name}{" "}
          <Badge variant="outline" className="text-xs uppercase">
            {agent.cliType}
          </Badge>
        </ItemTitle>

        <ItemDescription className="line-clamp-1">
          {agent.instruction}
        </ItemDescription>
      </ItemContent>

      <ItemActions>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVerticalIcon />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(agent)}>
              <PencilIcon />
              Edit
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => onChat(agent)}>
              <MessageSquareIcon />
              Chat
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => onMoveUp(agent)}
              disabled={isFirst}
            >
              <ArrowUpIcon />
              Move Up
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => onMoveDown(agent)}
              disabled={isLast}
            >
              <ArrowDownIcon />
              Move Down
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(agent)}
            >
              <TrashIcon />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ItemActions>
    </Item>
  );
}
