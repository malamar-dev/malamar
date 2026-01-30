import { useQuery } from "@tanstack/react-query";

import { notificationSettingsApi } from "../api/notification-settings.api.ts";

export const notificationSettingsKeys = {
  all: ["notification-settings"] as const,
};

/**
 * Hook to fetch notification settings.
 */
export function useNotificationSettings() {
  return useQuery({
    queryKey: notificationSettingsKeys.all,
    queryFn: () => notificationSettingsApi.get(),
  });
}
