/**
 * Notification events that can trigger email notifications
 */
export type NotificationEvent = 'error_occurred' | 'task_in_review';

export const NOTIFICATION_EVENTS: NotificationEvent[] = ['error_occurred', 'task_in_review'];

/**
 * Type guard for notification events
 */
export function isNotificationEvent(value: string): value is NotificationEvent {
  return NOTIFICATION_EVENTS.includes(value as NotificationEvent);
}

/**
 * Base notification payload with common fields
 */
export interface BaseNotificationPayload {
  workspaceId: string;
  workspaceTitle: string;
}

/**
 * Payload for error occurred notifications
 */
export interface ErrorOccurredPayload extends BaseNotificationPayload {
  taskId: string;
  taskSummary: string;
  errorMessage: string;
  agentName?: string;
}

/**
 * Payload for task in review notifications
 */
export interface TaskInReviewPayload extends BaseNotificationPayload {
  taskId: string;
  taskSummary: string;
  completedByAgent?: string;
}

/**
 * Map of notification events to their payload types
 */
export interface NotificationPayloadMap {
  error_occurred: ErrorOccurredPayload;
  task_in_review: TaskInReviewPayload;
}

/**
 * Generic notification payload type
 */
export type NotificationPayload<T extends NotificationEvent = NotificationEvent> =
  NotificationPayloadMap[T];

/**
 * Mailgun configuration required for sending emails
 */
export interface MailgunConfig {
  apiKey: string;
  domain: string;
  fromEmail: string;
  toEmail: string;
}

/**
 * Email message structure
 */
export interface EmailMessage {
  to: string;
  from: string;
  subject: string;
  text: string;
}

/**
 * Result of sending an email
 */
export interface EmailResult {
  success: boolean;
  error?: string;
}
