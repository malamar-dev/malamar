// Routes
export { settingsRoutes } from './routes.ts';

// Service
export {
  getCliSettings,
  getMailgunSettings,
  getSettings,
  isMailgunConfigured,
  isNotifyOnErrorEnabled,
  isNotifyOnInReviewEnabled,
  updateSettings,
} from './service.ts';

// Types
export type { CliSettings, MailgunSettings, Settings } from './types.ts';
