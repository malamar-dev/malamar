import { apiClient } from "@/lib/api-client.ts";

import type {
  NotificationSettingsResponse,
  TestEmailResponse,
  UpdateNotificationSettingsRequest,
} from "../types/notification.types.ts";

export const notificationSettingsApi = {
  /**
   * Get notification settings.
   */
  get: () =>
    apiClient.get<NotificationSettingsResponse>("/settings/notifications"),

  /**
   * Update notification settings.
   */
  update: (data: UpdateNotificationSettingsRequest) =>
    apiClient.put<NotificationSettingsResponse>(
      "/settings/notifications",
      data,
    ),

  /**
   * Send a test email.
   */
  testEmail: () => apiClient.post<TestEmailResponse>("/settings/test-email"),
};
