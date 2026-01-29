import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon } from "lucide-react";

import { cn } from "@/lib/utils.ts";

import { AgentItem, type AgentItemProps } from "./agent-item.tsx";

interface SortableAgentItemProps extends AgentItemProps {
  id: string;
}

export function SortableAgentItem({ id, ...props }: SortableAgentItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative flex items-center gap-2",
        isDragging && "z-50 opacity-50",
      )}
    >
      {/* Drag handle - only visible on desktop (md:+) */}
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground hidden cursor-grab touch-none active:cursor-grabbing md:flex"
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="h-5 w-5" />
        <span className="sr-only">Drag to reorder</span>
      </button>

      <div className="min-w-0 flex-1">
        <AgentItem {...props} />
      </div>
    </div>
  );
}
