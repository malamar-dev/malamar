import { AlertCircleIcon, InboxIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";

import { AppLayout } from "@/components/layout/app-layout/app-layout.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { formatRelativeTime } from "@/lib/date-utils.ts";

import { CreateWorkspaceDialog } from "../../components/create-workspace-dialog.tsx";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";
  const [inputValue, setInputValue] = useState(searchQuery);
  const debouncedQuery = useDebounce(inputValue, 300);

  // Update URL when debounced query changes
  useState(() => {
    if (debouncedQuery) {
      setSearchParams({ q: debouncedQuery });
    } else {
      setSearchParams({});
    }
  });

  const { data, isLoading, isError, error } = useWorkspaces(
    debouncedQuery || undefined,
  );

  const [open, setOpen] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    if (value) {
      setSearchParams({ q: value });
    } else {
      setSearchParams({});
    }
  };

  return (
    <AppLayout breadcrumbItems={[{ label: "Workspaces" }]}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search workspaces..."
            value={inputValue}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setOpen(true)}>
          <PlusIcon /> Workspace
        </Button>
      </div>

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

      <CreateWorkspaceDialog open={open} setOpen={setOpen} />
    </AppLayout>
  );
};

export default WorkspacesPage;
