import { z } from 'zod';

/**
 * Mailgun settings schema
 */
export const mailgunSettingsSchema = z.object({
  apiKey: z.string(),
  domain: z.string(),
  fromEmail: z.string().email(),
  toEmail: z.string().email(),
});

/**
 * CLI settings schema
 */
export const cliSettingsSchema = z.object({
  enabled: z.boolean(),
  binaryPath: z.string().optional(),
  envOverrides: z.record(z.string()).optional(),
});

/**
 * CLI type enum
 */
export const cliTypeSchema = z.enum(['claude', 'gemini', 'codex', 'opencode']);

/**
 * Schema for updating settings
 */
export const updateSettingsSchema = z.object({
  notifyOnError: z.boolean().optional(),
  notifyOnInReview: z.boolean().optional(),
  mailgun: mailgunSettingsSchema.nullable().optional(),
  cli: z.record(cliTypeSchema, cliSettingsSchema).optional(),
});

/**
 * Schema for settings response
 */
export const settingsResponseSchema = z.object({
  notifyOnError: z.boolean(),
  notifyOnInReview: z.boolean(),
  mailgun: mailgunSettingsSchema.optional(),
  cli: z.record(cliTypeSchema, cliSettingsSchema).optional(),
});

/**
 * Schema for test email request
 */
export const testEmailSchema = z.object({
  toEmail: z.string().email().optional(),
});
