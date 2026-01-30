import {
  CheckIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SettingsIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react";

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
    case "create_agent":
      return <CreateAgentAction name={action.name as string} />;
    case "update_agent":
      return <UpdateAgentAction />;
    case "delete_agent":
      return <DeleteAgentAction />;
    case "reorder_agents":
      return <ReorderAgentsAction />;
    case "update_workspace":
      return <UpdateWorkspaceAction />;
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

interface CreateAgentActionProps {
  name: string;
}

const CreateAgentAction = ({ name }: CreateAgentActionProps) => {
  return (
    <div className="bg-muted/50 flex items-center gap-2 rounded-md px-3 py-1.5 text-xs">
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/10 text-green-600">
        <PlusIcon className="h-3 w-3" />
      </div>
      <span className="text-muted-foreground">Created agent</span>
      <span className="text-foreground font-medium">{name}</span>
      <CheckIcon className="ml-auto h-3 w-3 text-green-600" />
    </div>
  );
};

const UpdateAgentAction = () => {
  return (
    <div className="bg-muted/50 flex items-center gap-2 rounded-md px-3 py-1.5 text-xs">
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
        <UserIcon className="h-3 w-3" />
      </div>
      <span className="text-muted-foreground">Updated agent</span>
      <CheckIcon className="ml-auto h-3 w-3 text-blue-600" />
    </div>
  );
};

const DeleteAgentAction = () => {
  return (
    <div className="bg-muted/50 flex items-center gap-2 rounded-md px-3 py-1.5 text-xs">
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/10 text-red-600">
        <Trash2Icon className="h-3 w-3" />
      </div>
      <span className="text-muted-foreground">Deleted agent</span>
      <CheckIcon className="ml-auto h-3 w-3 text-red-600" />
    </div>
  );
};

const ReorderAgentsAction = () => {
  return (
    <div className="bg-muted/50 flex items-center gap-2 rounded-md px-3 py-1.5 text-xs">
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/10 text-purple-600">
        <RefreshCwIcon className="h-3 w-3" />
      </div>
      <span className="text-muted-foreground">Reordered agents</span>
      <CheckIcon className="ml-auto h-3 w-3 text-purple-600" />
    </div>
  );
};

const UpdateWorkspaceAction = () => {
  return (
    <div className="bg-muted/50 flex items-center gap-2 rounded-md px-3 py-1.5 text-xs">
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
        <SettingsIcon className="h-3 w-3" />
      </div>
      <span className="text-muted-foreground">Updated workspace settings</span>
      <CheckIcon className="ml-auto h-3 w-3 text-amber-600" />
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
