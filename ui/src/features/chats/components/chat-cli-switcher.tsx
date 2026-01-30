import {
  CheckIcon,
  ChevronDownIcon,
  CircleIcon,
  Loader2Icon,
  TerminalIcon,
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
import type {
  CliHealth,
  CliType,
} from "@/features/settings/types/health.types.ts";
import { cn } from "@/lib/utils.ts";

interface ChatCliSwitcherProps {
  currentCliType: CliType | null;
  clis: CliHealth[];
  onSwitch: (cliType: CliType | null) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

/** Display name mapping for CLI types */
const CLI_DISPLAY_NAMES: Record<CliType, string> = {
  claude: "Claude Code",
  codex: "Codex CLI",
  gemini: "Gemini CLI",
  opencode: "OpenCode",
};

/** Get display name for a CLI type */
function getCliDisplayName(cliType: CliType | null): string {
  if (!cliType) return "Agent Default";
  return CLI_DISPLAY_NAMES[cliType] ?? cliType;
}

export const ChatCliSwitcher = ({
  currentCliType,
  clis,
  onSwitch,
  isLoading = false,
  disabled = false,
}: ChatCliSwitcherProps) => {
  const currentName = getCliDisplayName(currentCliType);

  const handleSelect = useCallback(
    (cliType: CliType | null) => {
      if (cliType !== currentCliType) {
        onSwitch(cliType);
      }
    },
    [currentCliType, onSwitch],
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
          ) : (
            <TerminalIcon className="h-4 w-4" />
          )}
          <span className="max-w-[120px] truncate">{currentName}</span>
          <ChevronDownIcon className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        {/* Agent Default option (null = use agent's CLI) */}
        <DropdownMenuItem onClick={() => handleSelect(null)}>
          <span className="flex-1">Agent Default</span>
          {currentCliType === null && <CheckIcon className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {/* Available CLIs */}
        {clis.map((cli) => (
          <DropdownMenuItem
            key={cli.type}
            onClick={() => handleSelect(cli.type)}
            className="flex items-center"
          >
            <CircleIcon
              className={cn(
                "mr-2 h-2 w-2",
                cli.status === "healthy"
                  ? "fill-green-500 text-green-500"
                  : "fill-red-500 text-red-500",
              )}
            />
            <span
              className={cn(
                "flex-1 truncate",
                cli.type === currentCliType && "font-medium",
              )}
            >
              {getCliDisplayName(cli.type)}
            </span>
            {cli.type === currentCliType && (
              <CheckIcon className="ml-auto h-4 w-4" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
