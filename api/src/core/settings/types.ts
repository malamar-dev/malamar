/**
 * Instance settings stored in settings.json
 */
export interface Settings {
  /** Schema version for future migrations */
  version: number;
  /** True after first-run setup completes */
  initialized: boolean;
  /** ISO timestamp of first initialization */
  initializedAt?: string;
}

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  initialized: false,
};

export const SETTINGS_FILENAME = "settings.json";
