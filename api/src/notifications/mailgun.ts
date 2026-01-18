import { logger } from '../core/logger.ts';
import type { EmailMessage, EmailResult, MailgunConfig } from './types.ts';

/**
 * Mailgun API base URL template
 */
const MAILGUN_API_URL = 'https://api.mailgun.net/v3';

/**
 * Send an email via Mailgun API
 *
 * @param config - Mailgun configuration (API key, domain, etc.)
 * @param message - Email message to send
 * @returns Result indicating success or failure
 */
export async function sendEmail(config: MailgunConfig, message: EmailMessage): Promise<EmailResult> {
  const url = `${MAILGUN_API_URL}/${config.domain}/messages`;

  // Mailgun uses HTTP Basic Auth with api:key
  const credentials = btoa(`api:${config.apiKey}`);

  const formData = new FormData();
  formData.append('from', message.from);
  formData.append('to', message.to);
  formData.append('subject', message.subject);
  formData.append('text', message.text);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Mailgun API error', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return {
        success: false,
        error: `Mailgun error: ${response.status} ${response.statusText} - ${errorText}`,
      };
    }

    logger.info('Email sent successfully', {
      to: message.to,
      subject: message.subject,
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to send email via Mailgun', { error: errorMessage });
    return {
      success: false,
      error: `Mailgun error: ${errorMessage}`,
    };
  }
}

/**
 * Check if Mailgun is configured
 *
 * @param config - Partial Mailgun configuration
 * @returns True if all required fields are present
 */
export function isMailgunConfigured(config: Partial<MailgunConfig> | null | undefined): boolean {
  if (!config) {
    return false;
  }
  return Boolean(config.apiKey && config.domain && config.fromEmail && config.toEmail);
}

/**
 * Build email message from Mailgun config
 *
 * @param config - Mailgun configuration
 * @param subject - Email subject
 * @param text - Email body text
 * @returns EmailMessage ready to send
 */
export function buildEmailMessage(config: MailgunConfig, subject: string, text: string): EmailMessage {
  return {
    from: config.fromEmail,
    to: config.toEmail,
    subject,
    text,
  };
}
