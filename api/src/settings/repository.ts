import type { Database } from 'bun:sqlite';

import { getDb } from '../core/database.ts';
import type { SettingRow, Settings } from './types.ts';
import { DEFAULT_SETTINGS, SETTING_KEYS } from './types.ts';

export function get(key: string, db: Database = getDb()): unknown | null {
  const row = db.query<SettingRow, [string]>('SELECT * FROM settings WHERE key = ?').get(key);
  if (!row) {
    return null;
  }
  try {
    return JSON.parse(row.value);
  } catch {
    return row.value;
  }
}

export function set(key: string, value: unknown, db: Database = getDb()): void {
  const jsonValue = JSON.stringify(value);
  db.query(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, jsonValue);
}

export function remove(key: string, db: Database = getDb()): boolean {
  const result = db.query('DELETE FROM settings WHERE key = ?').run(key);
  return result.changes > 0;
}

export function getAll(db: Database = getDb()): Settings {
  const rows = db.query<SettingRow, []>('SELECT * FROM settings').all();

  const settings: Settings = { ...DEFAULT_SETTINGS };

  for (const row of rows) {
    let value: unknown;
    try {
      value = JSON.parse(row.value);
    } catch {
      value = row.value;
    }

    switch (row.key) {
      case SETTING_KEYS.NOTIFY_ON_ERROR:
        settings.notifyOnError = value as boolean;
        break;
      case SETTING_KEYS.NOTIFY_ON_IN_REVIEW:
        settings.notifyOnInReview = value as boolean;
        break;
      case SETTING_KEYS.MAILGUN:
        settings.mailgun = value as Settings['mailgun'];
        break;
      case SETTING_KEYS.CLI:
        settings.cli = value as Settings['cli'];
        break;
    }
  }

  return settings;
}

export function setMultiple(updates: Partial<Settings>, db: Database = getDb()): void {
  if (updates.notifyOnError !== undefined) {
    set(SETTING_KEYS.NOTIFY_ON_ERROR, updates.notifyOnError, db);
  }
  if (updates.notifyOnInReview !== undefined) {
    set(SETTING_KEYS.NOTIFY_ON_IN_REVIEW, updates.notifyOnInReview, db);
  }
  if (updates.mailgun !== undefined) {
    if (updates.mailgun === null) {
      remove(SETTING_KEYS.MAILGUN, db);
    } else {
      set(SETTING_KEYS.MAILGUN, updates.mailgun, db);
    }
  }
  if (updates.cli !== undefined) {
    if (updates.cli === null) {
      remove(SETTING_KEYS.CLI, db);
    } else {
      set(SETTING_KEYS.CLI, updates.cli, db);
    }
  }
}
