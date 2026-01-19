import { useQuery } from "@tanstack/react-query";

import { healthApi } from "../api/health.api.ts";

export const useHealth = () => {
  return useQuery({
    queryKey: ["health"],
    queryFn: healthApi.get,
    refetchInterval: 30 * 1000, // 30s polling
  });
};
