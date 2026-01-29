import { useState } from "react";

import { Badge } from "@/components/ui/badge.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";
import { useMediaQuery } from "@/hooks/use-media-query";

import type { Task, TaskStatus } from "../types/task.types.ts";
import { DeleteTaskDialog } from "./delete-task-dialog.tsx";
import { TaskActions } from "./task-actions.tsx";
import { TaskActivityTab } from "./task-activity-tab.tsx";
import { TaskCommentsTab } from "./task-comments-tab.tsx";
import { TaskDetailsTab } from "./task-details-tab.tsx";

interface TaskDetailDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  task: Task | null;
  workspaceId: string;
}

const statusLabels: Record<TaskStatus, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

const statusVariants: Record<
  TaskStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  todo: "secondary",
  in_progress: "default",
  in_review: "outline",
  done: "secondary",
};

function TaskDetailContent({
  task,
  workspaceId,
  onDeleteClick,
}: {
  task: Task;
  workspaceId: string;
  onDeleteClick: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Badge variant={statusVariants[task.status]}>
          {statusLabels[task.status]}
        </Badge>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="mt-4">
          <TaskDetailsTab task={task} workspaceId={workspaceId} />
        </TabsContent>
        <TabsContent value="comments" className="mt-4 min-h-[300px]">
          <TaskCommentsTab task={task} workspaceId={workspaceId} />
        </TabsContent>
        <TabsContent value="activity" className="mt-4 min-h-[300px]">
          <TaskActivityTab task={task} />
        </TabsContent>
      </Tabs>

      <Separator />

      <TaskActions
        task={task}
        workspaceId={workspaceId}
        onDeleteClick={onDeleteClick}
      />
    </div>
  );
}

export function TaskDetailDialog({
  open,
  setOpen,
  task,
  workspaceId,
}: TaskDetailDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (!task) {
    return null;
  }

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteSuccess = () => {
    setDeleteDialogOpen(false);
    setOpen(false);
  };

  if (isDesktop) {
    return (
      <>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="line-clamp-2 pr-8">
                {task.summary}
              </DialogTitle>
              <DialogDescription>
                View and manage task details, comments, and activity.
              </DialogDescription>
            </DialogHeader>
            <TaskDetailContent
              task={task}
              workspaceId={workspaceId}
              onDeleteClick={handleDeleteClick}
            />
          </DialogContent>
        </Dialog>

        <DeleteTaskDialog
          open={deleteDialogOpen}
          setOpen={setDeleteDialogOpen}
          workspaceId={workspaceId}
          task={task}
          onSuccess={handleDeleteSuccess}
        />
      </>
    );
  }

  return (
    <>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle className="line-clamp-2 pr-8">
              {task.summary}
            </DrawerTitle>
            <DrawerDescription>
              View and manage task details, comments, and activity.
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-4">
            <TaskDetailContent
              task={task}
              workspaceId={workspaceId}
              onDeleteClick={handleDeleteClick}
            />
          </div>
        </DrawerContent>
      </Drawer>

      <DeleteTaskDialog
        open={deleteDialogOpen}
        setOpen={setDeleteDialogOpen}
        workspaceId={workspaceId}
        task={task}
        onSuccess={handleDeleteSuccess}
      />
    </>
  );
}
