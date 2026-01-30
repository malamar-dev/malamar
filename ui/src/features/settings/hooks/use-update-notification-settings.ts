import { useMutation, useQueryClient } from "@tanstack/react-query";

import { notificationSettingsApi } from "../api/notification-settings.api.ts";
import type { UpdateNotificationSettingsRequest } from "../types/notification.types.ts";
import { notificationSettingsKeys } from "./use-notification-settings.ts";

/**
 * Hook to update notification settings.
 */
export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateNotificationSettingsRequest) =>
      notificationSettingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationSettingsKeys.all });
    },
  });
}
