import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import { ErrorMessage } from '@/components/ErrorMessage';
import { FormSkeleton } from '@/components/skeletons/FormSkeleton';
import { TypeToConfirmDialog } from '@/components/TypeToConfirmDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

import { useDeleteWorkspace, useUpdateWorkspace, useWorkspace } from '../hooks/use-workspaces';

const settingsSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(500).optional(),
  working_directory_mode: z.enum(['static', 'temp']),
  working_directory_path: z.string().optional(),
  auto_delete_done_tasks: z.boolean(),
  done_task_retention_days: z.coerce.number().min(1).max(365).optional(),
  notify_on_error: z.boolean(),
  notify_on_in_review: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export function WorkspaceSettings() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { data: workspace, isLoading, error } = useWorkspace(workspaceId!);
  const updateWorkspace = useUpdateWorkspace();
  const deleteWorkspace = useDeleteWorkspace();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    values: workspace
      ? {
          title: workspace.title,
          description: workspace.description ?? '',
          working_directory_mode: workspace.working_directory_mode,
          working_directory_path: workspace.working_directory_path ?? '',
          auto_delete_done_tasks: workspace.auto_delete_done_tasks,
          done_task_retention_days: workspace.done_task_retention_days ?? 30,
          notify_on_error: workspace.notify_on_error,
          notify_on_in_review: workspace.notify_on_in_review,
        }
      : undefined,
  });

  const workingDirectoryMode = form.watch('working_directory_mode');
  const autoDeleteDoneTasks = form.watch('auto_delete_done_tasks');

  const handleSubmit = async (values: SettingsFormValues) => {
    try {
      await updateWorkspace.mutateAsync({
        id: workspaceId!,
        data: {
          title: values.title,
          description: values.description || undefined,
          working_directory_mode: values.working_directory_mode,
          working_directory_path:
            values.working_directory_mode === 'static' ? values.working_directory_path : undefined,
          auto_delete_done_tasks: values.auto_delete_done_tasks,
          done_task_retention_days: values.auto_delete_done_tasks
            ? values.done_task_retention_days
            : undefined,
          notify_on_error: values.notify_on_error,
          notify_on_in_review: values.notify_on_in_review,
        },
      });
      toast.success('Settings saved successfully');
    } catch {
      toast.error('Failed to save settings');
    }
  };

  if (isLoading) {
    return (
      <div className="container px-4 py-6 max-w-2xl">
        <h2 className="text-xl font-semibold mb-6">Workspace Settings</h2>
        <FormSkeleton fields={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container px-4 py-6 max-w-2xl">
        <h2 className="text-xl font-semibold mb-6">Workspace Settings</h2>
        <ErrorMessage error={error} />
      </div>
    );
  }

  return (
    <div className="container px-4 py-6 max-w-2xl">
      <h2 className="text-xl font-semibold mb-6">Workspace Settings</h2>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
              <CardDescription>Basic workspace information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Working Directory */}
          <Card>
            <CardHeader>
              <CardTitle>Working Directory</CardTitle>
              <CardDescription>Where agents execute tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="working_directory_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="temp">Temporary (auto-created)</SelectItem>
                        <SelectItem value="static">Static (fixed path)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {field.value === 'temp'
                        ? 'A temporary directory will be created for each task.'
                        : 'Use a fixed directory path for all tasks.'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {workingDirectoryMode === 'static' && (
                <FormField
                  control={form.control}
                  name="working_directory_path"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Path</FormLabel>
                      <FormControl>
                        <Input placeholder="/path/to/project" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Cleanup Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Cleanup</CardTitle>
              <CardDescription>Automatic task cleanup settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="auto_delete_done_tasks"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Auto-delete done tasks</FormLabel>
                      <FormDescription>
                        Automatically delete completed tasks after a period of time.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {autoDeleteDoneTasks && (
                <FormField
                  control={form.control}
                  name="done_task_retention_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Retention period (days)</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={365} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Email notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="notify_on_error"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Notify on error</FormLabel>
                      <FormDescription>Send email when a task encounters an error.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notify_on_in_review"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Notify on in-review</FormLabel>
                      <FormDescription>
                        Send email when a task is ready for review.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={updateWorkspace.isPending}>
              {updateWorkspace.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </Form>

      {/* Danger Zone */}
      <Card className="mt-6 border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible and destructive actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete Workspace</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete this workspace and all its tasks, agents, and chats.
              </p>
            </div>
            <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
              Delete Workspace
            </Button>
          </div>
        </CardContent>
      </Card>

      <TypeToConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Workspace"
        description={`This will permanently delete "${workspace?.title}" and all its tasks, agents, and chats. This action cannot be undone.`}
        confirmText={workspace?.title || 'delete'}
        confirmLabel="Delete Workspace"
        onConfirm={async () => {
          try {
            await deleteWorkspace.mutateAsync(workspaceId!);
            toast.success('Workspace deleted successfully');
            navigate('/');
          } catch {
            toast.error('Failed to delete workspace');
          }
        }}
        isLoading={deleteWorkspace.isPending}
      />
    </div>
  );
}
