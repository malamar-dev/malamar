import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderIcon } from "lucide-react";
import React, { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils.ts";

import { useCreateAgent } from "../hooks/use-create-agent.ts";
import { useUpdateAgent } from "../hooks/use-update-agent.ts";
import type { Agent, CliType } from "../types/agent.types.ts";

const CLI_TYPES: { value: CliType; label: string }[] = [
  { value: "claude", label: "Claude" },
  { value: "gemini", label: "Gemini" },
  { value: "codex", label: "Codex" },
  { value: "opencode", label: "OpenCode" },
];

const agentSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be at most 255 characters"),
  cliType: z.enum(["claude", "gemini", "codex", "opencode"], {
    required_error: "CLI type is required",
  }),
  instruction: z
    .string()
    .min(1, "Instruction is required")
    .max(65535, "Instruction must be at most 65535 characters"),
});

type AgentFormData = z.infer<typeof agentSchema>;

interface AgentDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  workspaceId: string;
  agent?: Agent | null;
}

export function AgentDialog({
  open,
  setOpen,
  workspaceId,
  agent,
}: AgentDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const isEditing = !!agent;

  const title = isEditing ? "Edit Agent" : "Create Agent";
  const description = isEditing
    ? "Update the agent's configuration."
    : "Create a new agent to help with your tasks.";

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <AgentForm
            workspaceId={workspaceId}
            agent={agent}
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
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>

        <AgentForm
          className="px-4"
          workspaceId={workspaceId}
          agent={agent}
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

function AgentForm({
  className,
  workspaceId,
  agent,
  onSuccess,
}: React.ComponentProps<"form"> & {
  workspaceId: string;
  agent?: Agent | null;
  onSuccess?: () => void;
}) {
  const isEditing = !!agent;
  const createAgent = useCreateAgent(workspaceId);
  const updateAgent = useUpdateAgent(workspaceId);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: agent?.name ?? "",
      cliType: agent?.cliType ?? "claude",
      instruction: agent?.instruction ?? "",
    },
  });

  useEffect(() => {
    if (agent) {
      reset({
        name: agent.name,
        cliType: agent.cliType,
        instruction: agent.instruction,
      });
    } else {
      reset({
        name: "",
        cliType: "claude",
        instruction: "",
      });
    }
  }, [agent, reset]);

  const isPending = createAgent.isPending || updateAgent.isPending;

  const onSubmit = async (data: AgentFormData) => {
    if (isEditing && agent) {
      await updateAgent.mutateAsync({
        agentId: agent.id,
        input: data,
      });
    } else {
      await createAgent.mutateAsync(data);
    }
    onSuccess?.();
  };

  return (
    <form
      className={cn("grid items-start gap-6", className)}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <Input
          id="name"
          placeholder="My Agent"
          aria-invalid={!!errors.name}
          {...register("name")}
        />
        <FieldError errors={[errors.name]} />
      </Field>

      <Field data-invalid={!!errors.cliType}>
        <FieldLabel htmlFor="cliType">CLI Type</FieldLabel>
        <Controller
          name="cliType"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full" aria-invalid={!!errors.cliType}>
                <SelectValue placeholder="Select a CLI type" />
              </SelectTrigger>
              <SelectContent>
                {CLI_TYPES.map((cliType) => (
                  <SelectItem key={cliType.value} value={cliType.value}>
                    {cliType.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={[errors.cliType]} />
      </Field>

      <Field data-invalid={!!errors.instruction}>
        <FieldLabel htmlFor="instruction">Instruction</FieldLabel>
        <Textarea
          id="instruction"
          placeholder="Describe what this agent should do..."
          rows={6}
          aria-invalid={!!errors.instruction}
          {...register("instruction")}
        />
        <FieldError errors={[errors.instruction]} />
      </Field>

      <Button type="submit" disabled={isPending}>
        {isPending && <LoaderIcon className="animate-spin" />}
        {isEditing ? "Update Agent" : "Create Agent"}
      </Button>
    </form>
  );
}
