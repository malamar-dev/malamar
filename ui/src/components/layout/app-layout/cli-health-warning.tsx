import { TriangleAlertIcon } from "lucide-react";
import { Link } from "react-router";

import { Badge } from "@/components/ui/badge.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { useHealth } from "@/features/settings/hooks/use-health.ts";

/**
 * Displays a warning badge when no CLIs are healthy.
 * Links to the CLI settings page for configuration.
 */
export const CliHealthWarning = () => {
  const { data: health, isLoading } = useHealth();

  // Don't show anything while loading or if we have data
  if (isLoading || !health) {
    return null;
  }

  // Check if all CLIs are unhealthy
  const healthyClis = health.clis.filter((cli) => cli.status === "healthy");
  const hasHealthyCli = healthyClis.length > 0;

  // If at least one CLI is healthy, don't show warning
  if (hasHealthyCli) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link to="/settings/clis">
          <Badge
            variant="outline"
            className="border-amber-500/50 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-500"
          >
            <TriangleAlertIcon className="mr-1 h-3 w-3" />
            No CLIs available
          </Badge>
        </Link>
      </TooltipTrigger>
      <TooltipContent>
        <p>No AI CLIs are available. Configure in settings.</p>
      </TooltipContent>
    </Tooltip>
  );
};
