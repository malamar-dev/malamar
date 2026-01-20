import { AlertCircleIcon, InboxIcon } from "lucide-react";
import { Link } from "react-router";

import { AppLayout } from "@/components/layout/app-layout/app-layout.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { formatRelativeTime } from "@/lib/date-utils.ts";

import { useWorkspaces } from "../../hooks/use-workspaces.ts";
import type { Workspace } from "../../types/workspace.types.ts";

function WorkspaceCard({ workspace }: { workspace: Workspace }) {
  return (
    <Link to={`/workspaces/${workspace.id}`}>
      <Card className="h-full w-full">
        <CardHeader>
          <CardTitle className="line-clamp-1">{workspace.title}</CardTitle>

          {workspace.description && (
            <CardDescription className="line-clamp-3 min-h-16">
              {workspace.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardFooter className="mt-auto flex-row justify-end">
          <p className="text-muted-foreground text-right text-xs">
            {formatRelativeTime(workspace.lastActivityAt)}
          </p>
        </CardFooter>
      </Card>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <InboxIcon className="text-muted-foreground mb-4 h-12 w-12" />
      <p className="text-muted-foreground text-lg">No workspace yet</p>
    </div>
  );
}

const WorkspacesPage = () => {
  const { data, isLoading, isError, error } = useWorkspaces();

  return (
    <AppLayout breadcrumbItems={[{ label: "Workspaces" }]}>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            <p>{error?.message ?? "An unexpected error occurred"}</p>
          </AlertDescription>
        </Alert>
      ) : data?.workspaces.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data?.workspaces.map((workspace) => (
            <WorkspaceCard key={workspace.id} workspace={workspace} />
          ))}
        </div>
      )}
    </AppLayout>
  );
};

export default WorkspacesPage;
