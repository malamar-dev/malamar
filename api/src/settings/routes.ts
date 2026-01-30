import { Hono } from "hono";
import { z } from "zod";

import type { CliType } from "../cli/types";
import { createErrorResponse } from "../shared";
import * as repository from "./repository";
import type {
  AllCliSettings,
  CliSettings,
  NotificationSettings,
} from "./types";

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

/**
 * Schema for notification settings input.
 */
const notificationSettingsSchema = z.object({
  mailgunApiKey: z.string().optional(),
  mailgunDomain: z.string().optional(),
  mailgunFromEmail: z.string().email().optional().or(z.literal("")),
  mailgunToEmail: z.string().email().optional().or(z.literal("")),
  notifyOnError: z.boolean().optional(),
  notifyOnInReview: z.boolean().optional(),
});

/**
 * GET /api/settings/notifications
 * Get notification settings.
 */
settingsRouter.get("/notifications", (c) => {
  const settings = repository.getNotificationSettings();
  // Mask the API key for security
  return c.json({
    settings: {
      ...settings,
      mailgunApiKey: settings.mailgunApiKey ? "••••••••" : undefined,
    },
  });
});

/**
 * PUT /api/settings/notifications
 * Update notification settings.
 */
settingsRouter.put("/notifications", async (c) => {
  const body = await c.req.json();
  const parsed = notificationSettingsSchema.safeParse(body);

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
  const existing = repository.getNotificationSettings();
  const updated: NotificationSettings = { ...existing };

  // Only update fields that are explicitly provided
  if (parsed.data.mailgunApiKey !== undefined) {
    // Don't update if it's the masked value
    if (parsed.data.mailgunApiKey !== "••••••••") {
      updated.mailgunApiKey = parsed.data.mailgunApiKey || undefined;
    }
  }
  if (parsed.data.mailgunDomain !== undefined) {
    updated.mailgunDomain = parsed.data.mailgunDomain || undefined;
  }
  if (parsed.data.mailgunFromEmail !== undefined) {
    updated.mailgunFromEmail = parsed.data.mailgunFromEmail || undefined;
  }
  if (parsed.data.mailgunToEmail !== undefined) {
    updated.mailgunToEmail = parsed.data.mailgunToEmail || undefined;
  }
  if (parsed.data.notifyOnError !== undefined) {
    updated.notifyOnError = parsed.data.notifyOnError;
  }
  if (parsed.data.notifyOnInReview !== undefined) {
    updated.notifyOnInReview = parsed.data.notifyOnInReview;
  }

  repository.setNotificationSettings(updated);

  // Return with masked API key
  return c.json({
    settings: {
      ...updated,
      mailgunApiKey: updated.mailgunApiKey ? "••••••••" : undefined,
    },
  });
});

/**
 * POST /api/settings/test-email
 * Send a test email to verify Mailgun configuration.
 */
settingsRouter.post("/test-email", async (c) => {
  const settings = repository.getNotificationSettings();

  // Validate required settings
  if (
    !settings.mailgunApiKey ||
    !settings.mailgunDomain ||
    !settings.mailgunFromEmail ||
    !settings.mailgunToEmail
  ) {
    return c.json(
      createErrorResponse(
        "MISSING_CONFIG",
        "Mailgun configuration is incomplete. Please provide API key, domain, from email, and to email.",
      ),
      400,
    );
  }

  try {
    // Send test email via Mailgun API
    const response = await fetch(
      `https://api.mailgun.net/v3/${settings.mailgunDomain}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`api:${settings.mailgunApiKey}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          from: settings.mailgunFromEmail,
          to: settings.mailgunToEmail,
          subject: "Malamar Test Email",
          text: "This is a test email from Malamar. If you received this, your email notifications are configured correctly.",
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      return c.json(
        createErrorResponse("EMAIL_FAILED", `Mailgun error: ${errorText}`),
        400,
      );
    }

    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json(
      createErrorResponse("EMAIL_FAILED", `Failed to send email: ${message}`),
      400,
    );
  }
});
