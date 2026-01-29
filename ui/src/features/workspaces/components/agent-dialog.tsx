import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircleIcon, LoaderIcon } from "lucide-react";
import React, { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
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
import { useHealth } from "@/features/settings/hooks/use-health.ts";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ApiError } from "@/lib/api-client.ts";
import { cn } from "@/lib/utils.ts";

import { useCreateAgent } from "../hooks/use-create-agent.ts";
import { useUpdateAgent } from "../hooks/use-update-agent.ts";
import type { Agent, CliType } from "../types/agent.types.ts";

// Priority order: Claude > Codex > Gemini > OpenCode
const CLI_TYPES: { value: CliType; label: string; priority: number }[] = [
  { value: "claude", label: "Claude", priority: 1 },
  { value: "codex", label: "Codex", priority: 2 },
  { value: "gemini", label: "Gemini", priority: 3 },
  { value: "opencode", label: "OpenCode", priority: 4 },
];

const agentSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be at most 255 characters"),
  cliType: z.enum(["claude", "gemini", "codex", "opencode"], {
    message: "CLI type is required",
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
  const { data: healthData } = useHealth();

  // Get health status for each CLI
  const cliHealthMap = useMemo(() => {
    const map = new Map<CliType, boolean>();
    if (healthData?.clis) {
      for (const cli of healthData.clis) {
        map.set(cli.type, cli.status === "healthy");
      }
    }
    return map;
  }, [healthData]);

  // Get default CLI (first healthy one by priority, or "claude" as fallback)
  const defaultCliType = useMemo((): CliType => {
    const sortedClis = [...CLI_TYPES].sort((a, b) => a.priority - b.priority);
    for (const cli of sortedClis) {
      if (cliHealthMap.get(cli.value)) {
        return cli.value;
      }
    }
    return "claude"; // Fallback if none are healthy
  }, [cliHealthMap]);

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
      cliType: agent?.cliType ?? defaultCliType,
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
        cliType: defaultCliType,
        instruction: "",
      });
    }
  }, [agent, reset, defaultCliType]);

  const isPending = createAgent.isPending || updateAgent.isPending;

  // Get API error message
  const apiError = createAgent.error || updateAgent.error;
  const errorMessage =
    apiError instanceof ApiError ? apiError.message : apiError?.message;

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
      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
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
                {CLI_TYPES.map((cliType) => {
                  const isHealthy = cliHealthMap.get(cliType.value);
                  return (
                    <SelectItem key={cliType.value} value={cliType.value}>
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            isHealthy === true
                              ? "bg-green-500"
                              : isHealthy === false
                                ? "bg-red-500"
                                : "bg-gray-400",
                          )}
                          title={
                            isHealthy === true
                              ? "Healthy"
                              : isHealthy === false
                                ? "Unhealthy"
                                : "Unknown"
                          }
                        />
                        {cliType.label}
                      </span>
                    </SelectItem>
                  );
                })}
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
