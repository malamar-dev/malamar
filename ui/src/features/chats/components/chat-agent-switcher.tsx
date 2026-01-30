import {
  CheckIcon,
  ChevronDownIcon,
  Loader2Icon,
  SparklesIcon,
} from "lucide-react";
import { useCallback } from "react";

import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import type { Agent } from "@/features/workspaces/types/agent.types.ts";
import { cn } from "@/lib/utils.ts";

interface ChatAgentSwitcherProps {
  currentAgentId: string | null;
  agents: Agent[];
  onSwitch: (agentId: string | null) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export const ChatAgentSwitcher = ({
  currentAgentId,
  agents,
  onSwitch,
  isLoading = false,
  disabled = false,
}: ChatAgentSwitcherProps) => {
  const currentAgent = currentAgentId
    ? agents.find((a) => a.id === currentAgentId)
    : null;
  const currentName = currentAgent?.name ?? "Malamar";

  const handleSelect = useCallback(
    (agentId: string | null) => {
      if (agentId !== currentAgentId) {
        onSwitch(agentId);
      }
    },
    [currentAgentId, onSwitch],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isLoading}
          className="gap-1"
        >
          {isLoading ? (
            <Loader2Icon className="h-4 w-4 animate-spin" />
          ) : currentAgentId === null ? (
            <SparklesIcon className="h-4 w-4" />
          ) : null}
          <span className="max-w-[120px] truncate">{currentName}</span>
          <ChevronDownIcon className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        <DropdownMenuItem onClick={() => handleSelect(null)}>
          <SparklesIcon className="mr-2 h-4 w-4" />
          <span>Malamar</span>
          {currentAgentId === null && <CheckIcon className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        {agents.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {agents.map((agent) => (
              <DropdownMenuItem
                key={agent.id}
                onClick={() => handleSelect(agent.id)}
              >
                <span
                  className={cn(
                    "flex-1 truncate",
                    agent.id === currentAgentId && "font-medium",
                  )}
                >
                  {agent.name}
                </span>
                {agent.id === currentAgentId && (
                  <CheckIcon className="ml-auto h-4 w-4" />
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
