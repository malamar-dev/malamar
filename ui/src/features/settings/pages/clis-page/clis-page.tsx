import { AlertCircleIcon } from "lucide-react";
import { Fragment } from "react";

import { AppLayout } from "@/components/layout/app-layout/app-layout.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Dot } from "@/components/ui/dot.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

import { useHealth } from "../../hooks/use-health.ts";
import type { CliHealth } from "../../types/health.types.ts";

function CliCard({
  displayName,
  cli,
}: {
  displayName: string;
  cli?: CliHealth;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dot color={cli?.status === "healthy" ? "green" : "red"} pulse />
          {displayName}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="text-muted-foreground text-xs font-medium">
              Executable
            </div>

            <div>
              <Input value={cli?.binaryPath ?? "Unknown"} disabled />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-muted-foreground text-xs font-medium">
              Version
            </div>

            <div>
              <Input value={cli?.version ?? "Unknown"} disabled />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const ClisPage = () => {
  const { data, isLoading, isError, error } = useHealth();

  const claudeCli = data?.clis.find((cli) => cli.type === "claude");

  return (
    <AppLayout breadcrumbItems={[{ label: "Settings" }, { label: "CLIs" }]}>
      <div className="mx-auto w-full max-w-xl">
        {isLoading ? (
          <Skeleton className="h-32" />
        ) : isError ? (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>
              <p>{error?.message ?? "An unexpected error occurred"}</p>
            </AlertDescription>
          </Alert>
        ) : (
          <Fragment>
            <CliCard displayName="Claude Code" cli={claudeCli} />
          </Fragment>
        )}
      </div>
    </AppLayout>
  );
};
