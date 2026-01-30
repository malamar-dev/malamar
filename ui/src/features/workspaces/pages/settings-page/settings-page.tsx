import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  BellIcon,
  CheckIcon,
  LoaderIcon,
  Trash2Icon,
} from "lucide-react";
import { Fragment, useState } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router";
import { z } from "zod";

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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { WorkspaceTabs } from "@/features/workspaces/components/workspace-tabs.tsx";

import { DeleteWorkspaceDialog } from "../../components/delete-workspace-dialog.tsx";
import { useUpdateWorkspace } from "../../hooks/use-update-workspace.ts";
import { useValidatePath } from "../../hooks/use-validate-path.ts";
import { useWorkspace } from "../../hooks/use-workspace.ts";
import type { Workspace } from "../../types/workspace.types.ts";

const workspaceSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title must be at most 255 characters"),
  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters"),
  workingDirectory: z
    .string()
    .max(4096, "Working directory must be at most 4096 characters"),
});

type WorkspaceFormData = z.infer<typeof workspaceSchema>;

interface SettingsFormProps {
  workspace: Workspace;
}

function SettingsForm({ workspace }: SettingsFormProps) {
  const updateWorkspace = useUpdateWorkspace(workspace.id);
  const validatePath = useValidatePath();
  const [showSuccess, setShowSuccess] = useState(false);
  const [pathWarning, setPathWarning] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Notification toggle states - initialized from workspace
  const [notifyOnError, setNotifyOnError] = useState(workspace.notifyOnError);
  const [notifyOnInReview, setNotifyOnInReview] = useState(
    workspace.notifyOnInReview,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WorkspaceFormData>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      title: workspace.title,
      description: workspace.description,
      workingDirectory: workspace.workingDirectory ?? "",
    },
  });

  const onSubmit = async (data: WorkspaceFormData) => {
    setShowSuccess(false);
    setPathWarning(null);
    updateWorkspace.reset();

    // Validate path and set warning if it doesn't exist (but still allow saving)
    if (data.workingDirectory) {
      try {
        const result = await validatePath.mutateAsync(data.workingDirectory);
        if (!result.valid) {
          setPathWarning(
            "The specified path does not exist or is not a valid directory. You can still save, but the path should exist before running tasks.",
          );
        }
      } catch {
        // Ignore validation errors - proceed with save
      }
    }

    try {
      await updateWorkspace.mutateAsync({
        ...data,
        workingDirectory: data.workingDirectory || null,
        notifyOnError,
        notifyOnInReview,
      });
      setShowSuccess(true);
    } catch {
      // Error is handled by the mutation's isError state
    }
  };

  return (
    <AppLayout
      breadcrumbItems={[
        { label: "Workspaces", href: "/workspaces" },
        { label: workspace.title },
      ]}
      variant="sm"
    >
      <div className="mb-4 flex items-center justify-start">
        <div>
          <WorkspaceTabs workspaceId={workspace.id} currentPage="settings" />
        </div>
      </div>

      <Fragment>
        {updateWorkspace.isError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircleIcon />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>
              <p>
                {updateWorkspace.error?.message ?? "Failed to save settings"}
              </p>
            </AlertDescription>
          </Alert>
        )}

        {showSuccess && pathWarning && (
          <Alert variant="warning" className="mb-4">
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertTitle>Saved with warning</AlertTitle>
            <AlertDescription>{pathWarning}</AlertDescription>
          </Alert>
        )}

        {showSuccess && !pathWarning && (
          <Alert className="mb-4">
            <CheckIcon className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
              Workspace settings have been saved.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>

          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              <Field data-invalid={!!errors.title}>
                <FieldLabel htmlFor="title">Title</FieldLabel>
                <Input
                  id="title"
                  placeholder="My Workspace"
                  aria-invalid={!!errors.title}
                  {...register("title")}
                />
                <FieldError errors={[errors.title]} />
              </Field>

              <Field data-invalid={!!errors.description}>
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <Textarea
                  id="description"
                  placeholder="Describe your workspace..."
                  rows={4}
                  aria-invalid={!!errors.description}
                  {...register("description")}
                />
                <FieldError errors={[errors.description]} />
              </Field>

              <Field data-invalid={!!errors.workingDirectory}>
                <FieldLabel htmlFor="workingDirectory">
                  Working Directory
                </FieldLabel>
                <Input
                  id="workingDirectory"
                  placeholder="e.g., /Users/you/projects/my-project"
                  aria-invalid={!!errors.workingDirectory}
                  {...register("workingDirectory")}
                />
                <FieldDescription>
                  Leave blank to create a temporary folder for each task, or
                  specify a path to use a static directory.
                </FieldDescription>
                <FieldError errors={[errors.workingDirectory]} />
              </Field>

              <div className="flex justify-end">
                <Button type="submit" disabled={updateWorkspace.isPending}>
                  {updateWorkspace.isPending && (
                    <LoaderIcon className="animate-spin" />
                  )}
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellIcon className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure which events trigger email notifications for this
              workspace.
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
                onCheckedChange={setNotifyOnError}
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
                onCheckedChange={setNotifyOnInReview}
              />
            </div>

            <div className="text-muted-foreground mt-2 text-sm">
              Note: Email delivery requires Mailgun configuration in{" "}
              <a href="/settings/notifications" className="underline">
                global settings
              </a>
              .
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive mt-6">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete this workspace</p>
                <p className="text-muted-foreground text-sm">
                  Permanently delete this workspace and all of its data.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2Icon />
                Delete Workspace
              </Button>
            </div>
          </CardContent>
        </Card>

        <DeleteWorkspaceDialog
          open={deleteDialogOpen}
          setOpen={setDeleteDialogOpen}
          workspaceId={workspace.id}
          workspaceName={workspace.title}
        />
      </Fragment>
    </AppLayout>
  );
}

const SettingsPage = () => {
  const { id: workspaceId } = useParams<{ id: string }>();
  const {
    data: workspace,
    isLoading,
    isError,
    error,
  } = useWorkspace(workspaceId ?? "");

  if (isLoading) {
    return (
      <AppLayout
        breadcrumbItems={[
          { label: "Workspaces", href: "/workspaces" },
          { label: <Skeleton className="h-4 w-24" /> },
        ]}
        variant="sm"
      >
        <div className="mb-4 flex items-center justify-start">
          <div>
            <Skeleton className="h-10 w-64" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout
        breadcrumbItems={[
          { label: "Workspaces", href: "/workspaces" },
          { label: "Error" },
        ]}
        variant="sm"
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

  // Use key to remount the form when workspace changes from API
  const workspaceKey = JSON.stringify({
    id: workspace?.id,
    notifyOnError: workspace?.notifyOnError,
    notifyOnInReview: workspace?.notifyOnInReview,
  });

  return workspace ? (
    <SettingsForm key={workspaceKey} workspace={workspace} />
  ) : null;
};

export default SettingsPage;
