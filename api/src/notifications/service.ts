import { logger } from '../core/logger.ts';
import * as settingsService from '../settings/service.ts';
import { buildEmailMessage, isMailgunConfigured, sendEmail } from './mailgun.ts';
import type {
  ErrorOccurredPayload,
  MailgunConfig,
  NotificationEvent,
  NotificationPayload,
  TaskInReviewPayload,
} from './types.ts';

/**
 * Send a notification for the given event
 *
 * This is a fire-and-forget function that:
 * 1. Checks if notifications are enabled for the event type
 * 2. Checks if Mailgun is configured
 * 3. Sends the email asynchronously
 * 4. Logs errors but never throws
 *
 * @param event - The notification event type
 * @param payload - The event-specific payload
 */
export async function notify<T extends NotificationEvent>(
  event: T,
  payload: NotificationPayload<T>
): Promise<void> {
  try {
    // Check if notifications are enabled for this event
    if (!isNotificationEnabled(event)) {
      logger.debug('Notification disabled for event', { event });
      return;
    }

    // Check if Mailgun is configured
    const mailgunSettings = settingsService.getMailgunSettings();
    if (!isMailgunConfigured(mailgunSettings)) {
      logger.debug('Mailgun not configured, skipping notification', { event });
      return;
    }

    // Build email content
    const { subject, body } = buildEmailContent(event, payload);

    // Build config from settings
    const config: MailgunConfig = {
      apiKey: mailgunSettings!.apiKey,
      domain: mailgunSettings!.domain,
      fromEmail: mailgunSettings!.fromEmail,
      toEmail: mailgunSettings!.toEmail,
    };

    // Build and send email
    const message = buildEmailMessage(config, subject, body);
    const result = await sendEmail(config, message);

    if (!result.success) {
      logger.error('Failed to send notification email', {
        event,
        error: result.error,
      });
    }
  } catch (error) {
    // Fire-and-forget: log error but don't throw
    logger.error('Unexpected error in notification service', {
      event,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Check if notifications are enabled for the given event type
 */
function isNotificationEnabled(event: NotificationEvent): boolean {
  switch (event) {
    case 'error_occurred':
      return settingsService.isNotifyOnErrorEnabled();
    case 'task_in_review':
      return settingsService.isNotifyOnInReviewEnabled();
    default:
      return false;
  }
}

/**
 * Build email subject and body for the given event
 */
function buildEmailContent<T extends NotificationEvent>(
  event: T,
  payload: NotificationPayload<T>
): { subject: string; body: string } {
  switch (event) {
    case 'error_occurred':
      return buildErrorOccurredEmail(payload as ErrorOccurredPayload);
    case 'task_in_review':
      return buildTaskInReviewEmail(payload as TaskInReviewPayload);
    default:
      return {
        subject: 'Malamar Notification',
        body: `Event: ${event}\n\nWorkspace: ${payload.workspaceTitle}`,
      };
  }
}

/**
 * Build email for error_occurred event
 */
function buildErrorOccurredEmail(payload: ErrorOccurredPayload): { subject: string; body: string } {
  const subject = `[Malamar] Error in "${payload.workspaceTitle}"`;

  const lines = [
    `An error occurred while processing a task in workspace "${payload.workspaceTitle}".`,
    '',
    `Task: ${payload.taskSummary}`,
  ];

  if (payload.agentName) {
    lines.push(`Agent: ${payload.agentName}`);
  }

  lines.push('', 'Error:', payload.errorMessage);

  return { subject, body: lines.join('\n') };
}

/**
 * Build email for task_in_review event
 */
function buildTaskInReviewEmail(payload: TaskInReviewPayload): { subject: string; body: string } {
  const subject = `[Malamar] Task ready for review in "${payload.workspaceTitle}"`;

  const lines = [
    `A task has been moved to "In Review" in workspace "${payload.workspaceTitle}".`,
    '',
    `Task: ${payload.taskSummary}`,
  ];

  if (payload.completedByAgent) {
    lines.push(`Completed by: ${payload.completedByAgent}`);
  }

  lines.push('', 'Please review the task and take appropriate action.');

  return { subject, body: lines.join('\n') };
}

/**
 * Send a test email to verify Mailgun configuration
 *
 * Unlike notify(), this function DOES throw on error to allow
 * the caller to handle and report the error to the user.
 *
 * @returns void on success
 * @throws Error if Mailgun is not configured or email fails to send
 */
export async function sendTestEmail(): Promise<void> {
  const mailgunSettings = settingsService.getMailgunSettings();

  if (!isMailgunConfigured(mailgunSettings)) {
    throw new Error('Mailgun is not configured. Please configure API key, domain, and email addresses.');
  }

  const config: MailgunConfig = {
    apiKey: mailgunSettings!.apiKey,
    domain: mailgunSettings!.domain,
    fromEmail: mailgunSettings!.fromEmail,
    toEmail: mailgunSettings!.toEmail,
  };

  const message = buildEmailMessage(
    config,
    'Malamar Test Email',
    'This is a test email from Malamar. If you received this, your email notifications are configured correctly.'
  );

  const result = await sendEmail(config, message);

  if (!result.success) {
    throw new Error(result.error ?? 'Failed to send test email');
  }
}
