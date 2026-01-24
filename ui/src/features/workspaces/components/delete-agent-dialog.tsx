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

import { useDeleteAgent } from "../hooks/use-delete-agent.ts";
import type { Agent } from "../types/agent.types.ts";

interface DeleteAgentDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  workspaceId: string;
  agent: Agent | null;
}

export function DeleteAgentDialog({
  open,
  setOpen,
  workspaceId,
  agent,
}: DeleteAgentDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const deleteAgent = useDeleteAgent(workspaceId);

  const handleDelete = async () => {
    if (!agent) return;
    await deleteAgent.mutateAsync(agent.id);
    setOpen(false);
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Agent</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium">{agent?.name}</span>? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>

            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteAgent.isPending}
            >
              {deleteAgent.isPending && <LoaderIcon className="animate-spin" />}
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
          <DrawerTitle>Delete Agent</DrawerTitle>
          <DrawerDescription>
            Are you sure you want to delete{" "}
            <span className="font-medium">{agent?.name}</span>? This action
            cannot be undone.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="pt-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteAgent.isPending}
          >
            {deleteAgent.isPending && <LoaderIcon className="animate-spin" />}
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
