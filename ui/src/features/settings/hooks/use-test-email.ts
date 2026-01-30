import { useMutation } from "@tanstack/react-query";

import { notificationSettingsApi } from "../api/notification-settings.api.ts";

/**
 * Hook to send a test email.
 */
export function useTestEmail() {
  return useMutation({
    mutationFn: () => notificationSettingsApi.testEmail(),
  });
}
