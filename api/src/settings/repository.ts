import { getDatabase } from "../core";
import type { AllCliSettings, NotificationSettings, SettingRow } from "./types";
import { SETTINGS_KEYS } from "./types";

/**
 * Get a setting value by key.
 * Returns null if not found.
 */
export function get(key: string): string | null {
  const db = getDatabase();
  const row = db
    .query<SettingRow, [string]>(`SELECT * FROM settings WHERE key = ?`)
    .get(key);
  return row?.value ?? null;
}

/**
 * Set a setting value by key.
 * Creates or updates the setting.
 */
export function set(key: string, value: string): void {
  const db = getDatabase();
  db.prepare(
    `
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `,
  ).run(key, value);
}

/**
 * Delete a setting by key.
 * Returns true if deleted, false if not found.
 */
export function remove(key: string): boolean {
  const db = getDatabase();
  const result = db.prepare(`DELETE FROM settings WHERE key = ?`).run(key);
  return result.changes > 0;
}

/**
 * Get CLI settings from the database.
 * Returns empty object if not set.
 */
export function getCliSettings(): AllCliSettings {
  const value = get(SETTINGS_KEYS.CLI_SETTINGS);
  if (!value) {
    return {};
  }
  try {
    return JSON.parse(value) as AllCliSettings;
  } catch {
    return {};
  }
}

/**
 * Save CLI settings to the database.
 */
export function setCliSettings(settings: AllCliSettings): void {
  set(SETTINGS_KEYS.CLI_SETTINGS, JSON.stringify(settings));
}

/**
 * Get notification settings from the database.
 * Returns default settings if not set.
 */
export function getNotificationSettings(): NotificationSettings {
  const value = get(SETTINGS_KEYS.NOTIFICATION_SETTINGS);
  if (!value) {
    return {
      notifyOnError: true,
      notifyOnInReview: true,
    };
  }
  try {
    return JSON.parse(value) as NotificationSettings;
  } catch {
    return {
      notifyOnError: true,
      notifyOnInReview: true,
    };
  }
}

/**
 * Save notification settings to the database.
 */
export function setNotificationSettings(settings: NotificationSettings): void {
  set(SETTINGS_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(settings));
}
