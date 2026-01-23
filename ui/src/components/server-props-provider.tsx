import { type ReactNode, useEffect, useState } from "react";

import type { HealthResponse } from "@/features/settings/types/health.types.ts";
import {
  getDefaultCliType,
  ServerPropsContext,
  type ServerPropsState,
} from "@/hooks/use-server-props.ts";
import { apiClient } from "@/lib/api-client.ts";

interface ServerPropsProviderProps {
  children: ReactNode;
}

export function ServerPropsProvider({ children }: ServerPropsProviderProps) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await apiClient.get<HealthResponse>("/health");
        setHealth(data);
      } catch (error) {
        console.error("Failed to fetch health:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchHealth();

    // Poll every 5 seconds
    const interval = setInterval(fetchHealth, 5000);

    return () => clearInterval(interval);
  }, []);

  const value: ServerPropsState = {
    health,
    isLoading,
    defaultCliType: getDefaultCliType(health),
  };

  return (
    <ServerPropsContext.Provider value={value}>
      {children}
    </ServerPropsContext.Provider>
  );
}
