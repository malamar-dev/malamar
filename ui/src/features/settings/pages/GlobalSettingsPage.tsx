import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { ErrorMessage } from '@/components/ErrorMessage';
import { FormSkeleton } from '@/components/skeletons/FormSkeleton';
import { Button } from '@/components/ui/button';
import type { CliType } from '@/features/agent/types/agent.types';

import { CliSettingsSection } from '../components/CliSettingsSection';
import { NotificationSettingsSection } from '../components/NotificationSettingsSection';
import { useSettings, useUpdateSettings } from '../hooks/use-settings';
import type { CliSettings } from '../types/settings.types';

const cliSettingsSchema = z.object({
  binary_path: z.string().optional(),
  env_vars: z.record(z.string()),
});

const settingsSchema = z.object({
  cli_settings: z.record(cliSettingsSchema),
  mailgun: z.object({
    api_key: z.string().optional(),
    domain: z.string().optional(),
    from_email: z.string().email().optional().or(z.literal('')),
    to_email: z.string().email().optional().or(z.literal('')),
  }),
  default_notify_on_error: z.boolean(),
  default_notify_on_in_review: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const defaultCliSettings: CliSettings = {
  binary_path: undefined,
  env_vars: {},
};

export function GlobalSettingsPage() {
  const { data: settings, isLoading, error } = useSettings();
  const updateSettings = useUpdateSettings();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      cli_settings: {
        claude: defaultCliSettings,
        gemini: defaultCliSettings,
        codex: defaultCliSettings,
        opencode: defaultCliSettings,
      },
      mailgun: {},
      default_notify_on_error: false,
      default_notify_on_in_review: false,
    },
  });

  // Update form when settings are loaded
  useEffect(() => {
    if (settings) {
      form.reset({
        cli_settings: settings.cli_settings || {
          claude: defaultCliSettings,
          gemini: defaultCliSettings,
          codex: defaultCliSettings,
          opencode: defaultCliSettings,
        },
        mailgun: settings.mailgun || {},
        default_notify_on_error: settings.default_notify_on_error || false,
        default_notify_on_in_review: settings.default_notify_on_in_review || false,
      });
    }
  }, [settings, form]);

  const handleSubmit = async (values: SettingsFormValues) => {
    try {
      await updateSettings.mutateAsync({
        cli_settings: values.cli_settings as Record<CliType, CliSettings>,
        mailgun: {
          api_key: values.mailgun.api_key || undefined,
          domain: values.mailgun.domain || undefined,
          from_email: values.mailgun.from_email || undefined,
          to_email: values.mailgun.to_email || undefined,
        },
        default_notify_on_error: values.default_notify_on_error,
        default_notify_on_in_review: values.default_notify_on_in_review,
      });
      toast.success('Settings saved successfully');
    } catch {
      toast.error('Failed to save settings');
    }
  };

  if (isLoading) {
    return (
      <div className="container px-4 py-6 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        <FormSkeleton fields={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container px-4 py-6 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        <ErrorMessage error={error} />
      </div>
    );
  }

  return (
    <div className="container px-4 py-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <CliSettingsSection
            settings={form.watch('cli_settings') as Record<CliType, CliSettings>}
            onChange={(value) => form.setValue('cli_settings', value)}
          />

          <NotificationSettingsSection />

          <div className="flex justify-end">
            <Button type="submit" disabled={updateSettings.isPending}>
              {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
