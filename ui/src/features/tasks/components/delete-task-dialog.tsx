import { LoaderIcon } from "lucide-react";

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
import { useMediaQuery } from "@/hooks/use-media-query";

import { useDeleteTask } from "../hooks/use-delete-task.ts";
import type { Task } from "../types/task.types.ts";

interface DeleteTaskDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  workspaceId: string;
  task: Task | null;
  onSuccess?: () => void;
}

export function DeleteTaskDialog({
  open,
  setOpen,
  workspaceId,
  task,
  onSuccess,
}: DeleteTaskDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const deleteTask = useDeleteTask(workspaceId);

  const handleDelete = async () => {
    if (!task) return;
    await deleteTask.mutateAsync(task.id);
    setOpen(false);
    onSuccess?.();
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium">{task?.summary}</span>? This action
              cannot be undone. All comments and activity logs will be
              permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteTask.isPending}
            >
              {deleteTask.isPending && <LoaderIcon className="animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Delete Task</DrawerTitle>
          <DrawerDescription>
            Are you sure you want to delete{" "}
            <span className="font-medium">{task?.summary}</span>? This action
            cannot be undone. All comments and activity logs will be permanently
            removed.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="pt-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteTask.isPending}
          >
            {deleteTask.isPending && <LoaderIcon className="animate-spin" />}
            Delete
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
