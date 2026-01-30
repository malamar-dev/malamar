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

import { useDeleteChat } from "../hooks/use-delete-chat.ts";
import type { Chat } from "../types/chat.types.ts";

interface DeleteChatDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  workspaceId: string;
  chat: Chat | null;
  onSuccess?: () => void;
}

export function DeleteChatDialog({
  open,
  setOpen,
  workspaceId,
  chat,
  onSuccess,
}: DeleteChatDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const deleteChat = useDeleteChat(workspaceId);

  const handleDelete = async () => {
    if (!chat) return;
    await deleteChat.mutateAsync(chat.id);
    setOpen(false);
    onSuccess?.();
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Chat</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium">{chat?.title}</span>? This action
              cannot be undone. All messages will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteChat.isPending}
            >
              {deleteChat.isPending && <LoaderIcon className="animate-spin" />}
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
          <DrawerTitle>Delete Chat</DrawerTitle>
          <DrawerDescription>
            Are you sure you want to delete{" "}
            <span className="font-medium">{chat?.title}</span>? This action
            cannot be undone. All messages will be permanently removed.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="pt-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteChat.isPending}
          >
            {deleteChat.isPending && <LoaderIcon className="animate-spin" />}
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
