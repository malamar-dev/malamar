import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { z } from "zod";

import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils.ts";

import { useDeleteWorkspace } from "../hooks/use-delete-workspace.ts";

interface DeleteWorkspaceDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  workspaceId: string;
  workspaceName: string;
}

export function DeleteWorkspaceDialog({
  open,
  setOpen,
  workspaceId,
  workspaceName,
}: DeleteWorkspaceDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Workspace</DialogTitle>
            <DialogDescription>
              This will permanently delete the workspace and all of its agents,
              tasks, chats, and associated data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DeleteWorkspaceForm
            workspaceId={workspaceId}
            workspaceName={workspaceName}
            onSuccess={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Delete Workspace</DrawerTitle>
          <DrawerDescription>
            This will permanently delete the workspace and all of its agents,
            tasks, chats, and associated data. This action cannot be undone.
          </DrawerDescription>
        </DrawerHeader>

        <DeleteWorkspaceForm
          className="px-4"
          workspaceId={workspaceId}
          workspaceName={workspaceName}
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

function DeleteWorkspaceForm({
  className,
  workspaceId,
  workspaceName,
  onSuccess,
  onCancel,
}: {
  className?: string;
  workspaceId: string;
  workspaceName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const navigate = useNavigate();
  const deleteWorkspace = useDeleteWorkspace();

  const confirmSchema = z.object({
    confirmation: z.literal(workspaceName, {
      message: `Please type "${workspaceName}" to confirm`,
    }),
  });

  type ConfirmFormData = z.infer<typeof confirmSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ConfirmFormData>({
    resolver: zodResolver(confirmSchema),
    defaultValues: { confirmation: "" },
  });

  const onSubmit = async () => {
    await deleteWorkspace.mutateAsync(workspaceId);
    onSuccess?.();
    navigate("/workspaces");
  };

  return (
    <form
      className={cn("grid items-start gap-4", className)}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Field data-invalid={!!errors.confirmation}>
        <FieldLabel htmlFor="confirmation">
          Type <span className="font-semibold">{workspaceName}</span> to confirm
        </FieldLabel>
        <Input
          id="confirmation"
          placeholder={workspaceName}
          autoComplete="off"
          aria-invalid={!!errors.confirmation}
          {...register("confirmation")}
        />
        <FieldError errors={[errors.confirmation]} />
      </Field>

      <DialogFooter className="sm:justify-between">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="destructive"
          disabled={deleteWorkspace.isPending}
        >
          {deleteWorkspace.isPending && <LoaderIcon className="animate-spin" />}
          Delete Workspace
        </Button>
      </DialogFooter>
    </form>
  );
}
