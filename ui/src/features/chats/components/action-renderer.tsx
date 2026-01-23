import { CheckIcon, PencilIcon } from "lucide-react";

import { cn } from "@/lib/utils.ts";

import type { ChatAction } from "../types/chat.types.ts";

interface ActionRendererProps {
  actions: ChatAction[];
  className?: string;
}

/**
 * Renders chat actions as tool invocation indicators.
 * Following AI SDK patterns for tool visualization.
 */
export const ActionRenderer = ({ actions, className }: ActionRendererProps) => {
  if (!actions || actions.length === 0) return null;

  return (
    <div className={cn("mt-2 space-y-1", className)}>
      {actions.map((action, index) => (
        <ActionItem key={index} action={action} />
      ))}
    </div>
  );
};

interface ActionItemProps {
  action: ChatAction;
}

const ActionItem = ({ action }: ActionItemProps) => {
  switch (action.type) {
    case "rename_chat":
      return <RenameChatAction title={action.title as string} />;
    default:
      return <UnknownAction type={action.type} />;
  }
};

interface RenameChatActionProps {
  title: string;
}

const RenameChatAction = ({ title }: RenameChatActionProps) => {
  return (
    <div className="bg-muted/50 flex items-center gap-2 rounded-md px-3 py-1.5 text-xs">
      <div className="bg-primary/10 text-primary flex h-5 w-5 items-center justify-center rounded-full">
        <PencilIcon className="h-3 w-3" />
      </div>
      <span className="text-muted-foreground">Chat renamed to</span>
      <span className="text-foreground font-medium">{title}</span>
      <CheckIcon className="text-primary ml-auto h-3 w-3" />
    </div>
  );
};

interface UnknownActionProps {
  type: string;
}

const UnknownAction = ({ type }: UnknownActionProps) => {
  return (
    <div className="bg-muted/50 flex items-center gap-2 rounded-md px-3 py-1.5 text-xs">
      <span className="text-muted-foreground">Action:</span>
      <span className="text-foreground font-mono">{type}</span>
    </div>
  );
};
