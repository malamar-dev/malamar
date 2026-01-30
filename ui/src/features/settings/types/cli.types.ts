export type CliType = "claude" | "codex" | "gemini" | "opencode";

/**
 * CLI-specific settings for custom binary path and environment variables.
 */
export interface CliSettings {
  binaryPath?: string;
  envVars?: Record<string, string>;
}

/**
 * All CLI settings keyed by CLI type.
 */
export type AllCliSettings = Partial<Record<CliType, CliSettings>>;

/**
 * Response from GET /api/settings/cli
 */
export interface CliSettingsResponse {
  settings: AllCliSettings;
}

/**
 * Request body for PUT /api/settings/cli/:type
 */
export interface UpdateCliSettingsRequest {
  binaryPath?: string;
  envVars?: Record<string, string>;
}
