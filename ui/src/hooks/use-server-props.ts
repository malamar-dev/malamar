import { createContext, useContext } from "react";

import type { CliType } from "@/features/settings/types/cli.types.ts";
import type { HealthResponse } from "@/features/settings/types/health.types.ts";

export type ServerPropsState = {
  health: HealthResponse | null;
  isLoading: boolean;
  defaultCliType: CliType;
};

export const ServerPropsContext = createContext<ServerPropsState | null>(null);

export const useServerProps = () => {
  const context = useContext(ServerPropsContext);

  if (context === null) {
    throw new Error("useServerProps must be used within a ServerPropsProvider");
  }

  return context;
};

// CLI priority order per specs: Claude → Codex → Gemini → OpenCode
const CLI_PRIORITY: CliType[] = ["claude", "codex", "gemini", "opencode"];

export function getDefaultCliType(health: HealthResponse | null): CliType {
  if (!health?.clis) return "claude";

  for (const cliType of CLI_PRIORITY) {
    const cli = health.clis.find((c) => c.type === cliType);
    if (cli?.status === "healthy") return cliType;
  }

  return "claude"; // Fallback if none healthy
}
