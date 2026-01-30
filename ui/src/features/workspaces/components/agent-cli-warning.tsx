import { AlertTriangleIcon } from "lucide-react";
import { Link } from "react-router";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useHealth } from "@/features/settings/hooks/use-health.ts";

import type { Agent } from "../types/agent.types.ts";

interface AgentCliWarningProps {
  agents: Agent[];
}

/**
 * Displays a warning banner when any agent's CLI is unhealthy.
 * Shows which agents are affected and links to settings.
 */
export const AgentCliWarning = ({ agents }: AgentCliWarningProps) => {
  const { data: health, isLoading } = useHealth();

  // Don't show anything while loading or if no health data
  if (isLoading || !health || agents.length === 0) {
    return null;
  }

  // Create a map of CLI types to their health status
  const cliHealthMap = new Map(
    health.clis.map((cli) => [cli.type, cli.status]),
  );

  // Find agents with unhealthy CLIs
  const agentsWithUnhealthyCli = agents.filter(
    (agent) => cliHealthMap.get(agent.cliType) !== "healthy",
  );

  // If all agents have healthy CLIs, don't show warning
  if (agentsWithUnhealthyCli.length === 0) {
    return null;
  }

  // Get unique unhealthy CLI types
  const unhealthyCliTypes = [
    ...new Set(agentsWithUnhealthyCli.map((a) => a.cliType)),
  ];

  return (
    <Alert variant="warning" className="mb-4">
      <AlertTriangleIcon />
      <AlertTitle>CLI unavailable</AlertTitle>
      <AlertDescription>
        <p className="mb-3">
          {agentsWithUnhealthyCli.length === 1 ? (
            <>
              Agent "{agentsWithUnhealthyCli[0].name}" uses{" "}
              {agentsWithUnhealthyCli[0].cliType} CLI which is currently
              unavailable.
            </>
          ) : (
            <>
              {agentsWithUnhealthyCli.length} agents use unavailable CLIs:{" "}
              {unhealthyCliTypes.join(", ")}.
            </>
          )}{" "}
          Tasks may fail until the CLI is configured.
        </p>
        <Button size="sm" variant="outline" asChild>
          <Link to="/settings/clis">Configure CLIs</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
};
