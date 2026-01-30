import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircleIcon, CheckIcon, LoaderIcon } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router";
import { z } from "zod";

import { AppLayout } from "@/components/layout/app-layout/app-layout.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
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
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useDocumentTitle } from "@/hooks/use-document-title.ts";
import { WorkspaceTabs } from "@/features/workspaces/components/workspace-tabs.tsx";

import { useUpdateWorkspace } from "../../hooks/use-update-workspace.ts";
import { useWorkspace } from "../../hooks/use-workspace.ts";

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

const SettingsPage = () => {
  const { id: workspaceId } = useParams<{ id: string }>();
  const {
    data: workspace,
    isLoading,
    isError,
    error,
  } = useWorkspace(workspaceId ?? "");
  const updateWorkspace = useUpdateWorkspace(workspaceId ?? "");
  const [showSuccess, setShowSuccess] = useState(false);

  useDocumentTitle(workspace?.title ? `Settings - ${workspace.title}` : "Settings");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WorkspaceFormData>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      title: "",
      description: "",
      workingDirectory: "",
    },
  });

  useEffect(() => {
    if (workspace) {
      reset({
        title: workspace.title,
        description: workspace.description,
        workingDirectory: workspace.workingDirectory ?? "",
      });
    }
  }, [workspace, reset]);

  const onSubmit = async (data: WorkspaceFormData) => {
    setShowSuccess(false);
    updateWorkspace.reset();
    try {
      await updateWorkspace.mutateAsync({
        ...data,
        workingDirectory: data.workingDirectory || null,
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
        {
          label: isLoading ? (
            <Skeleton className="h-4 w-24" />
          ) : (
            (workspace?.title ?? "")
          ),
        },
      ]}
      variant="sm"
    >
      <div className="mb-4 flex items-center justify-start">
        <div>
          <WorkspaceTabs
            workspaceId={workspace?.id ?? ""}
            currentPage="settings"
          />
        </div>
      </div>

      {isLoading ? (
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
      ) : isError ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            <p>{error?.message ?? "An unexpected error occurred"}</p>
          </AlertDescription>
        </Alert>
      ) : (
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

          {showSuccess && (
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
        </Fragment>
      )}
    </AppLayout>
  );
};

export default SettingsPage;
