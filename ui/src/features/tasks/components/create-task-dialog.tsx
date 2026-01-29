import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderIcon } from "lucide-react";
import { useForm } from "react-hook-form";
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils.ts";

import { useCreateTask } from "../hooks/use-create-task.ts";

const createTaskSchema = z.object({
  summary: z
    .string()
    .min(1, "Summary is required")
    .max(500, "Summary must be at most 500 characters"),
  description: z
    .string()
    .max(10000, "Description must be at most 10000 characters"),
});

type CreateTaskFormData = z.infer<typeof createTaskSchema>;

interface CreateTaskDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  workspaceId: string;
}

export function CreateTaskDialog({
  open,
  setOpen,
  workspaceId,
}: CreateTaskDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>
              Create a new task for agents to work on. Tasks go through the
              agent pipeline automatically.
            </DialogDescription>
          </DialogHeader>
          <CreateTaskForm
            workspaceId={workspaceId}
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Create Task</DrawerTitle>
          <DrawerDescription>
            Create a new task for agents to work on. Tasks go through the agent
            pipeline automatically.
          </DrawerDescription>
        </DrawerHeader>

        <CreateTaskForm
          className="px-4"
          workspaceId={workspaceId}
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
}

function CreateTaskForm({
  className,
  workspaceId,
  onSuccess,
}: {
  className?: string;
  workspaceId: string;
  onSuccess?: () => void;
}) {
  const createTask = useCreateTask(workspaceId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTaskFormData>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      summary: "",
      description: "",
    },
  });

  const onSubmit = async (data: CreateTaskFormData) => {
    await createTask.mutateAsync({
      summary: data.summary,
      description: data.description || undefined,
    });
    reset();
    onSuccess?.();
  };

  return (
    <form
      className={cn("grid items-start gap-6", className)}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Field data-invalid={!!errors.summary}>
        <FieldLabel htmlFor="summary">Summary</FieldLabel>
        <Input
          id="summary"
          placeholder="What needs to be done?"
          aria-invalid={!!errors.summary}
          {...register("summary")}
        />
        <FieldError errors={[errors.summary]} />
      </Field>

      <Field data-invalid={!!errors.description}>
        <FieldLabel htmlFor="description">Description (optional)</FieldLabel>
        <Textarea
          id="description"
          placeholder="Provide details, context, or instructions for the agents..."
          rows={6}
          aria-invalid={!!errors.description}
          {...register("description")}
        />
        <FieldError errors={[errors.description]} />
      </Field>

      <Button type="submit" disabled={createTask.isPending}>
        {createTask.isPending && <LoaderIcon className="animate-spin" />}
        Create Task
      </Button>
    </form>
  );
}
