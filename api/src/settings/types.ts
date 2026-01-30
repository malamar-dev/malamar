import type { CliType } from "../cli/types";

/**
 * Database row for settings table.
 */
export interface SettingRow {
  key: string;
  value: string;
  updated_at: string;
}

/**
 * CLI-specific settings for custom binary path and environment variables.
 */
export interface CliSettings {
  binaryPath?: string;
  envVars?: Record<string, string>;
}

/**
 * Complete CLI settings object stored in database as JSON.
 * Key is CLI type, value is CLI-specific settings.
 */
export type AllCliSettings = Partial<Record<CliType, CliSettings>>;

/**
 * Settings keys used in the database.
 */
export const SETTINGS_KEYS = {
  CLI_SETTINGS: "cli_settings",
} as const;
