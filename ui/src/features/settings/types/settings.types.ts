import type { CliType } from '@/features/agent/types/agent.types';

export interface CliHealth {
  cli_type: CliType;
  is_healthy: boolean;
  error?: string;
  binary_path?: string;
}

export interface CliSettings {
  binary_path?: string;
  env_vars: Record<string, string>;
}

export interface MailgunSettings {
  api_key?: string;
  domain?: string;
  from_email?: string;
  to_email?: string;
}

export interface Settings {
  cli_settings: Record<CliType, CliSettings>;
  mailgun: MailgunSettings;
  default_notify_on_error: boolean;
  default_notify_on_in_review: boolean;
}

export interface UpdateSettingsInput {
  cli_settings?: Record<CliType, Partial<CliSettings>>;
  mailgun?: Partial<MailgunSettings>;
  default_notify_on_error?: boolean;
  default_notify_on_in_review?: boolean;
}
