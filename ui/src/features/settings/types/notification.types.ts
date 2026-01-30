/**
 * Notification settings stored in database.
 */
export interface NotificationSettings {
  mailgunApiKey?: string;
  mailgunDomain?: string;
  mailgunFromEmail?: string;
  mailgunToEmail?: string;
  notifyOnError?: boolean;
  notifyOnInReview?: boolean;
}

/**
 * Response from GET /api/settings/notifications
 */
export interface NotificationSettingsResponse {
  settings: NotificationSettings;
}

/**
 * Request body for PUT /api/settings/notifications
 */
export interface UpdateNotificationSettingsRequest {
  mailgunApiKey?: string;
  mailgunDomain?: string;
  mailgunFromEmail?: string;
  mailgunToEmail?: string;
  notifyOnError?: boolean;
  notifyOnInReview?: boolean;
}

/**
 * Response from POST /api/settings/test-email
 */
export interface TestEmailResponse {
  success: boolean;
}
