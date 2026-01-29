import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderIcon, SaveIcon } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button.tsx";
import { Field, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";

import { useUpdateTask } from "../hooks/use-update-task.ts";
import type { Task } from "../types/task.types.ts";

const taskSchema = z.object({
  summary: z
    .string()
    .min(1, "Summary is required")
    .max(500, "Summary must be at most 500 characters"),
  description: z
    .string()
    .max(10000, "Description must be at most 10000 characters"),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskDetailsTabProps {
  task: Task;
  workspaceId: string;
}

export function TaskDetailsTab({ task, workspaceId }: TaskDetailsTabProps) {
  const updateTask = useUpdateTask(workspaceId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      summary: task.summary,
      description: task.description,
    },
  });

  // Reset form when task changes
  useEffect(() => {
    reset({
      summary: task.summary,
      description: task.description,
    });
  }, [task.id, task.summary, task.description, reset]);

  const onSubmit = async (data: TaskFormData) => {
    await updateTask.mutateAsync({
      taskId: task.id,
      input: data,
    });
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <Field data-invalid={!!errors.summary}>
        <FieldLabel htmlFor="summary">Summary</FieldLabel>
        <Input
          id="summary"
          placeholder="Task summary"
          aria-invalid={!!errors.summary}
          {...register("summary")}
        />
        <FieldError errors={[errors.summary]} />
      </Field>

      <Field data-invalid={!!errors.description}>
        <FieldLabel htmlFor="description">Description</FieldLabel>
        <Textarea
          id="description"
          placeholder="Detailed description of the task..."
          rows={8}
          aria-invalid={!!errors.description}
          {...register("description")}
        />
        <FieldError errors={[errors.description]} />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" disabled={updateTask.isPending || !isDirty}>
          {updateTask.isPending ? (
            <LoaderIcon className="animate-spin" />
          ) : (
            <SaveIcon />
          )}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
