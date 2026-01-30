import { join } from "node:path";

import { getDataDir } from "../helpers/data-dir";
import { DEFAULT_SETTINGS, type Settings, SETTINGS_FILENAME } from "./types";

/**
 * Get the path to the settings.json file.
 */
export function getSettingsPath(): string {
  return join(getDataDir(), SETTINGS_FILENAME);
}

/**
 * Check if settings.json exists.
 */
export async function settingsFileExists(): Promise<boolean> {
  const file = Bun.file(getSettingsPath());
  return file.exists();
}

/**
 * Read settings from settings.json.
 * Returns DEFAULT_SETTINGS if file doesn't exist or is invalid.
 */
export async function readSettings(): Promise<Settings> {
  const file = Bun.file(getSettingsPath());

  if (!(await file.exists())) {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const content = await file.text();
    const parsed = JSON.parse(content) as Settings;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch {
    // Invalid JSON or read error - return defaults
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Write settings to settings.json.
 */
export async function writeSettings(settings: Settings): Promise<void> {
  const path = getSettingsPath();
  await Bun.write(path, JSON.stringify(settings, null, 2));
}

/**
 * Update settings by merging partial updates.
 */
export async function updateSettings(
  partial: Partial<Settings>,
): Promise<Settings> {
  const current = await readSettings();
  const updated = { ...current, ...partial };
  await writeSettings(updated);
  return updated;
}
