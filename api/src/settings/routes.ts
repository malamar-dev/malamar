import { Hono } from "hono";
import { z } from "zod";

import type { CliType } from "../cli/types";
import { createErrorResponse } from "../shared";
import * as repository from "./repository";
import type { AllCliSettings, CliSettings } from "./types";

export const settingsRouter = new Hono();

/**
 * Schema for CLI settings input.
 */
const cliSettingsSchema = z.object({
  binaryPath: z.string().optional(),
  envVars: z.record(z.string()).optional(),
});

const updateCliSettingsSchema = z.object({
  claude: cliSettingsSchema.optional(),
  gemini: cliSettingsSchema.optional(),
  codex: cliSettingsSchema.optional(),
  opencode: cliSettingsSchema.optional(),
});

/**
 * GET /api/settings/cli
 * Get CLI settings for all CLIs.
 */
settingsRouter.get("/cli", (c) => {
  const settings = repository.getCliSettings();
  return c.json({ settings });
});

/**
 * GET /api/settings/cli/:type
 * Get CLI settings for a specific CLI type.
 */
settingsRouter.get("/cli/:type", (c) => {
  const cliType = c.req.param("type") as CliType;
  const allSettings = repository.getCliSettings();
  const settings = allSettings[cliType] ?? {};
  return c.json({ settings });
});

/**
 * PUT /api/settings/cli
 * Update CLI settings for all CLIs.
 */
settingsRouter.put("/cli", async (c) => {
  const body = await c.req.json();
  const parsed = updateCliSettingsSchema.safeParse(body);

  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return c.json(
      createErrorResponse(
        "VALIDATION_ERROR",
        firstError?.message ?? "Invalid input",
      ),
      400,
    );
  }

  // Merge with existing settings
  const existing = repository.getCliSettings();
  const updated: AllCliSettings = { ...existing };

  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      const cliType = key as CliType;
      updated[cliType] = {
        ...updated[cliType],
        ...value,
      };
    }
  }

  repository.setCliSettings(updated);
  return c.json({ settings: updated });
});

/**
 * PUT /api/settings/cli/:type
 * Update CLI settings for a specific CLI type.
 */
settingsRouter.put("/cli/:type", async (c) => {
  const cliType = c.req.param("type") as CliType;
  const body = await c.req.json();
  const parsed = cliSettingsSchema.safeParse(body);

  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return c.json(
      createErrorResponse(
        "VALIDATION_ERROR",
        firstError?.message ?? "Invalid input",
      ),
      400,
    );
  }

  const existing = repository.getCliSettings();
  const updated: AllCliSettings = {
    ...existing,
    [cliType]: {
      ...existing[cliType],
      ...parsed.data,
    } as CliSettings,
  };

  repository.setCliSettings(updated);
  return c.json({ settings: updated[cliType] });
});
