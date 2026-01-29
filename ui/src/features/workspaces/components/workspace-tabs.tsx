import {
  BotIcon,
  CogIcon,
  ListTodoIcon,
  MessageSquareIcon,
} from "lucide-react";
import { Link } from "react-router";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";

export const WorkspaceTabs = ({
  workspaceId,
  currentPage,
}: {
  workspaceId: string;
  currentPage: "agents" | "tasks" | "chats" | "settings";
}) => {
  return (
    <Tabs defaultValue={currentPage}>
      <TabsList>
        <Link to={`/workspaces/${workspaceId}/tasks`}>
          <TabsTrigger value="tasks">
            <span className="flex size-5 items-center justify-center md:hidden">
              <ListTodoIcon />
            </span>

            <span className="hidden md:block">Tasks</span>
          </TabsTrigger>
        </Link>

        <Link to={`/workspaces/${workspaceId}/chats`}>
          <TabsTrigger value="chats">
            <span className="flex size-5 items-center justify-center md:hidden">
              <MessageSquareIcon />
            </span>

            <span className="hidden md:block">Chats</span>
          </TabsTrigger>
        </Link>

        <Link to={`/workspaces/${workspaceId}/agents`}>
          <TabsTrigger value="agents">
            <span className="flex size-5 items-center justify-center md:hidden">
              <BotIcon />
            </span>

            <span className="hidden md:block">Agents</span>
          </TabsTrigger>
        </Link>

        <Link to={`/workspaces/${workspaceId}/settings`}>
          <TabsTrigger value="settings">
            <span className="flex size-5 items-center justify-center md:hidden">
              <CogIcon />
            </span>

            <span className="hidden md:block">Settings</span>
          </TabsTrigger>
        </Link>
      </TabsList>
    </Tabs>
  );
};
