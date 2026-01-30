import { WifiOffIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { useNetworkStatus } from "@/hooks/use-network-status.ts";

/**
 * Displays an indicator when the browser is offline.
 * Shows a warning badge that helps users understand why operations may fail.
 */
export const NetworkStatusIndicator = () => {
  const isOnline = useNetworkStatus();

  // Don't show anything when online
  if (isOnline) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className="border-red-500/50 bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-500"
        >
          <WifiOffIcon className="mr-1 h-3 w-3" />
          Offline
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>No internet connection. Some features may not work.</p>
      </TooltipContent>
    </Tooltip>
  );
};
