import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { settingsApi } from '../api/settings.api';
import type { UpdateSettingsInput } from '../types/settings.types';

export const settingsKeys = {
  all: ['settings'] as const,
  settings: () => [...settingsKeys.all, 'data'] as const,
  cliHealth: () => [...settingsKeys.all, 'cli-health'] as const,
};

export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.settings(),
    queryFn: () => settingsApi.get(),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateSettingsInput) => settingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.settings() });
    },
  });
}

export function useTestEmail() {
  return useMutation({
    mutationFn: () => settingsApi.testEmail(),
  });
}

export function useCliHealth() {
  return useQuery({
    queryKey: settingsKeys.cliHealth(),
    queryFn: () => settingsApi.getCliHealth(),
  });
}

export function useRefreshCliHealth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => settingsApi.refreshCliHealth(),
    onSuccess: (data) => {
      queryClient.setQueryData(settingsKeys.cliHealth(), data);
    },
  });
}
