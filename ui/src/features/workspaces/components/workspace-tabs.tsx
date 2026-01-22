import { BotIcon, CogIcon } from "lucide-react";
import { Link } from "react-router";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";

export const WorkspaceTabs = ({
  workspaceId,
  currentPage,
}: {
  workspaceId: string;
  currentPage: "agents" | "settings";
}) => {
  return (
    <Tabs defaultValue={currentPage}>
      <TabsList>
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
