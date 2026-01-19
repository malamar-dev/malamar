import { useFormContext } from 'react-hook-form';
import { toast } from 'sonner';

import { PasswordInput } from '@/components/PasswordInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

import { useTestEmail } from '../hooks/use-settings';

export function NotificationSettingsSection() {
  const form = useFormContext();
  const testEmail = useTestEmail();

  const handleTestEmail = async () => {
    try {
      const result = await testEmail.mutateAsync();
      if (result.success) {
        toast.success('Test email sent successfully');
      } else {
        toast.error(result.message || 'Failed to send test email');
      }
    } catch {
      toast.error('Failed to send test email');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Notifications</CardTitle>
        <CardDescription>Configure Mailgun for email notifications</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mailgun settings */}
        <div className="grid gap-4">
          <FormField
            control={form.control}
            name="mailgun.api_key"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mailgun API Key</FormLabel>
                <FormControl>
                  <PasswordInput placeholder="key-..." {...field} value={field.value || ''} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mailgun.domain"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mailgun Domain</FormLabel>
                <FormControl>
                  <Input placeholder="mg.example.com" {...field} value={field.value || ''} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mailgun.from_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>From Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="notifications@example.com"
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mailgun.to_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>To Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <Button
            type="button"
            variant="outline"
            onClick={handleTestEmail}
            disabled={testEmail.isPending}
          >
            {testEmail.isPending ? 'Sending...' : 'Send Test Email'}
          </Button>
        </div>

        {/* Default notification settings */}
        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium">Default Notification Settings</h4>

          <FormField
            control={form.control}
            name="default_notify_on_error"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Notify on error</FormLabel>
                  <FormDescription>
                    Default setting for new workspaces
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="default_notify_on_in_review"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Notify on in-review</FormLabel>
                  <FormDescription>
                    Default setting for new workspaces
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
