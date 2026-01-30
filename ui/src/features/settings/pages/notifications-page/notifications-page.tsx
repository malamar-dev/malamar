import { AlertCircleIcon, MailIcon, SaveIcon, SendIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppLayout } from "@/components/layout/app-layout/app-layout.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Switch } from "@/components/ui/switch.tsx";

import { useNotificationSettings } from "../../hooks/use-notification-settings.ts";
import { useTestEmail } from "../../hooks/use-test-email.ts";
import { useUpdateNotificationSettings } from "../../hooks/use-update-notification-settings.ts";
import type { NotificationSettings } from "../../types/notification.types.ts";

interface NotificationsFormProps {
  initialSettings: NotificationSettings;
}

function NotificationsForm({ initialSettings }: NotificationsFormProps) {
  const updateSettings = useUpdateNotificationSettings();
  const testEmail = useTestEmail();

  const [apiKey, setApiKey] = useState(initialSettings.mailgunApiKey ?? "");
  const [domain, setDomain] = useState(initialSettings.mailgunDomain ?? "");
  const [fromEmail, setFromEmail] = useState(
    initialSettings.mailgunFromEmail ?? "",
  );
  const [toEmail, setToEmail] = useState(initialSettings.mailgunToEmail ?? "");
  const [notifyOnError, setNotifyOnError] = useState(
    initialSettings.notifyOnError ?? true,
  );
  const [notifyOnInReview, setNotifyOnInReview] = useState(
    initialSettings.notifyOnInReview ?? true,
  );
  const [hasChanges, setHasChanges] = useState(false);

  const handleSave = () => {
    updateSettings.mutate(
      {
        mailgunApiKey: apiKey,
        mailgunDomain: domain,
        mailgunFromEmail: fromEmail,
        mailgunToEmail: toEmail,
        notifyOnError,
        notifyOnInReview,
      },
      {
        onSuccess: () => {
          setHasChanges(false);
          toast.success("Settings saved");
        },
        onError: (err) => {
          toast.error(err.message || "Failed to save settings");
        },
      },
    );
  };

  const handleTestEmail = () => {
    testEmail.mutate(undefined, {
      onSuccess: () => {
        toast.success("Test email sent successfully");
      },
      onError: (err) => {
        toast.error(err.message || "Failed to send test email");
      },
    });
  };

  const markChanged = () => setHasChanges(true);

  const isConfigured = apiKey && domain && fromEmail && toEmail;

  return (
    <AppLayout
      breadcrumbItems={[{ label: "Settings" }, { label: "Notifications" }]}
      variant="xs"
      actions={
        <Button
          variant="default"
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges || updateSettings.isPending}
        >
          <SaveIcon
            className={updateSettings.isPending ? "animate-pulse" : ""}
          />
          Save Changes
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MailIcon className="h-5 w-5" />
              Mailgun Configuration
            </CardTitle>
            <CardDescription>
              Configure Mailgun to receive email notifications when tasks need
              attention.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  markChanged();
                }}
                placeholder="key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                value={domain}
                onChange={(e) => {
                  setDomain(e.target.value);
                  markChanged();
                }}
                placeholder="mg.example.com"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="fromEmail">From Email</Label>
              <Input
                id="fromEmail"
                type="email"
                value={fromEmail}
                onChange={(e) => {
                  setFromEmail(e.target.value);
                  markChanged();
                }}
                placeholder="malamar@mg.example.com"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="toEmail">To Email</Label>
              <Input
                id="toEmail"
                type="email"
                value={toEmail}
                onChange={(e) => {
                  setToEmail(e.target.value);
                  markChanged();
                }}
                placeholder="you@example.com"
              />
            </div>

            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestEmail}
                disabled={!isConfigured || testEmail.isPending || hasChanges}
              >
                <SendIcon
                  className={testEmail.isPending ? "animate-pulse" : ""}
                />
                {hasChanges
                  ? "Save changes first"
                  : testEmail.isPending
                    ? "Sending..."
                    : "Send Test Email"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notification Events</CardTitle>
            <CardDescription>
              Choose which events trigger email notifications.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <Label htmlFor="notifyOnError">On Error</Label>
                <p className="text-muted-foreground text-sm">
                  Send email when a CLI error occurs during task processing
                </p>
              </div>
              <Switch
                id="notifyOnError"
                checked={notifyOnError}
                onCheckedChange={(checked) => {
                  setNotifyOnError(checked);
                  markChanged();
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <Label htmlFor="notifyOnInReview">On In Review</Label>
                <p className="text-muted-foreground text-sm">
                  Send email when a task moves to In Review status
                </p>
              </div>
              <Switch
                id="notifyOnInReview"
                checked={notifyOnInReview}
                onCheckedChange={(checked) => {
                  setNotifyOnInReview(checked);
                  markChanged();
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

export const NotificationsPage = () => {
  const { data, isLoading, isError, error } = useNotificationSettings();

  if (isLoading) {
    return (
      <AppLayout
        breadcrumbItems={[{ label: "Settings" }, { label: "Notifications" }]}
        variant="xs"
      >
        <Skeleton className="h-96" />
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout
        breadcrumbItems={[{ label: "Settings" }, { label: "Notifications" }]}
        variant="xs"
      >
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            <p>{error?.message ?? "An unexpected error occurred"}</p>
          </AlertDescription>
        </Alert>
      </AppLayout>
    );
  }

  // Use key to remount the form when settings change from API
  const settingsKey = JSON.stringify(data?.settings ?? {});

  return (
    <NotificationsForm
      key={settingsKey}
      initialSettings={data?.settings ?? {}}
    />
  );
};
