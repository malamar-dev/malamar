import type { CliType } from '../core/types.ts';

/**
 * Mailgun settings for email notifications
 */
export interface MailgunSettings {
  apiKey: string;
  domain: string;
  fromEmail: string;
  toEmail: string;
}

/**
 * Per-CLI configuration settings
 */
export interface CliSettings {
  enabled: boolean;
  binaryPath?: string;
  envOverrides?: Record<string, string>;
}

/**
 * All application settings
 */
export interface Settings {
  // Notification settings
  notifyOnError: boolean;
  notifyOnInReview: boolean;

  // Mailgun settings (optional)
  mailgun?: MailgunSettings;

  // CLI settings (keyed by CLI type)
  cli?: Partial<Record<CliType, CliSettings>>;
}

/**
 * Database row for settings table
 */
export interface SettingRow {
  key: string;
  value: string;
}

/**
 * Default settings values
 */
export const DEFAULT_SETTINGS: Settings = {
  notifyOnError: true,
  notifyOnInReview: true,
};

/**
 * Setting keys used in the database
 */
export const SETTING_KEYS = {
  NOTIFY_ON_ERROR: 'notify_on_error',
  NOTIFY_ON_IN_REVIEW: 'notify_on_in_review',
  MAILGUN: 'mailgun',
  CLI: 'cli',
} as const;
