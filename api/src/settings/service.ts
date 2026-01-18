import type { CliType } from '../core/types.ts';
import * as repository from './repository.ts';
import type { CliSettings, MailgunSettings, Settings } from './types.ts';

export function getSettings(): Settings {
  return repository.getAll();
}

export function updateSettings(updates: Partial<Settings>): Settings {
  repository.setMultiple(updates);
  return repository.getAll();
}

export function getMailgunSettings(): MailgunSettings | null {
  const settings = repository.getAll();
  return settings.mailgun ?? null;
}

export function getCliSettings(cliType: CliType): CliSettings | null {
  const settings = repository.getAll();
  return settings.cli?.[cliType] ?? null;
}

export function isNotifyOnErrorEnabled(): boolean {
  const settings = repository.getAll();
  return settings.notifyOnError;
}

export function isNotifyOnInReviewEnabled(): boolean {
  const settings = repository.getAll();
  return settings.notifyOnInReview;
}

export function isMailgunConfigured(): boolean {
  const mailgun = getMailgunSettings();
  if (!mailgun) return false;
  return !!(mailgun.apiKey && mailgun.domain && mailgun.fromEmail && mailgun.toEmail);
}
