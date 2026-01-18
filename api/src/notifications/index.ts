// Mailgun client
export { buildEmailMessage, isMailgunConfigured, sendEmail } from './mailgun.ts';

// Service
export { notify, sendTestEmail } from './service.ts';

// Types
export type {
  BaseNotificationPayload,
  EmailMessage,
  EmailResult,
  ErrorOccurredPayload,
  MailgunConfig,
  NotificationEvent,
  NotificationPayload,
  NotificationPayloadMap,
  TaskInReviewPayload,
} from './types.ts';
export { isNotificationEvent, NOTIFICATION_EVENTS } from './types.ts';
