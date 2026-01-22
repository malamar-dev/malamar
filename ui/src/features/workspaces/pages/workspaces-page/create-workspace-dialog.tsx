import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderIcon } from "lucide-react";
import React from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { z } from "zod";

import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer.tsx";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils.ts";

import { useCreateWorkspace } from "../../hooks/use-create-workspace.ts";

const createWorkspaceSchema = z.object({
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

type CreateWorkspaceFormData = z.infer<typeof createWorkspaceSchema>;

export const CreateWorkspaceDialog = ({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (_: boolean) => void;
}) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Workspace</DialogTitle>
            <DialogDescription>
              A workspace contains agents, tasks, and chats. Create one to get
              started.
            </DialogDescription>
          </DialogHeader>
          <CreateWorkspaceForm onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Create Workspace</DrawerTitle>
          <DrawerDescription>
            A workspace contains agents, tasks, and chats. Create one to get
            started.
          </DrawerDescription>
        </DrawerHeader>

        <CreateWorkspaceForm
          className="px-4"
          onSuccess={() => setOpen(false)}
        />

        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

const CreateWorkspaceForm = ({
  className,
  onSuccess,
}: React.ComponentProps<"form"> & {
  onSuccess?: () => void;
}) => {
  const navigate = useNavigate();
  const createWorkspace = useCreateWorkspace();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateWorkspaceFormData>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: {
      title: "",
      description: "",
      workingDirectory: "",
    },
  });

  const onSubmit = async (data: CreateWorkspaceFormData) => {
    const workspace = await createWorkspace.mutateAsync({
      ...data,
      workingDirectory: data.workingDirectory || null,
    });
    onSuccess?.();
    navigate(`/workspaces/${workspace.id}`);
  };

  return (
    <form
      className={cn("grid items-start gap-6", className)}
      onSubmit={handleSubmit(onSubmit)}
    >
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
        <FieldLabel htmlFor="description">Description (optional)</FieldLabel>
        <Textarea
          id="description"
          placeholder="Describe what this workspace is for..."
          rows={3}
          aria-invalid={!!errors.description}
          {...register("description")}
        />
        <FieldError errors={[errors.description]} />
      </Field>

      <Field data-invalid={!!errors.workingDirectory}>
        <FieldLabel htmlFor="workingDirectory">
          Working Directory (optional)
        </FieldLabel>
        <Input
          id="workingDirectory"
          placeholder="e.g., /Users/you/projects/my-project"
          aria-invalid={!!errors.workingDirectory}
          {...register("workingDirectory")}
        />
        <FieldDescription>
          Leave blank to create a temporary folder for each task, or specify a
          path to use a static directory.
        </FieldDescription>
        <FieldError errors={[errors.workingDirectory]} />
      </Field>

      <Button type="submit" disabled={createWorkspace.isPending}>
        {createWorkspace.isPending && <LoaderIcon className="animate-spin" />}
        Create Workspace
      </Button>
    </form>
  );
};
