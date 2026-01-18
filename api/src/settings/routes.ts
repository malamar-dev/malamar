import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { updateSettingsSchema } from './schemas.ts';
import * as service from './service.ts';

export const settingsRoutes = new Hono();

// GET /settings - Get all settings
settingsRoutes.get('/', (c) => {
  const settings = service.getSettings();
  return c.json({ data: settings });
});

// PUT /settings - Update settings
settingsRoutes.put('/', zValidator('json', updateSettingsSchema), (c) => {
  const updates = c.req.valid('json');
  const settings = service.updateSettings(updates);
  return c.json({ data: settings });
});

// POST /settings/test-email - Send test email
settingsRoutes.post('/test-email', async (c) => {
  const isConfigured = service.isMailgunConfigured();

  if (!isConfigured) {
    return c.json(
      {
        success: false,
        error: 'Mailgun is not configured. Please configure Mailgun settings first.',
      },
      400
    );
  }

  // TODO: Implement actual email sending using notifications module
  // For now, return a placeholder response
  return c.json({
    success: true,
    message:
      'Test email functionality will be available after notifications module is implemented.',
  });
});
