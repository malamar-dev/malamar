import { apiClient } from '@/lib/api-client';

import type { CliHealth, Settings, UpdateSettingsInput } from '../types/settings.types';

export const settingsApi = {
  get: () => apiClient.get<Settings>('/settings'),

  update: (data: UpdateSettingsInput) => apiClient.put<Settings>('/settings', data),

  testEmail: () => apiClient.post<{ success: boolean; message: string }>('/settings/test-email'),

  getCliHealth: () => apiClient.get<CliHealth[]>('/health/cli'),

  refreshCliHealth: () => apiClient.post<CliHealth[]>('/health/cli/refresh'),
};
