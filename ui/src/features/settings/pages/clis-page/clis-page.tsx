import { AlertCircleIcon, RefreshCwIcon, SaveIcon } from "lucide-react";
import { useState } from "react";

import { AppLayout } from "@/components/layout/app-layout/app-layout.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Dot } from "@/components/ui/dot.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

import { useCliSettings } from "../../hooks/use-cli-settings.ts";
import { useHealth } from "../../hooks/use-health.ts";
import { useRefreshHealth } from "../../hooks/use-refresh-health.ts";
import { useUpdateCliSettings } from "../../hooks/use-update-cli-settings.ts";
import type { CliType } from "../../types/cli.types.ts";
import type { CliHealth } from "../../types/health.types.ts";

function CliCardInner({
  displayName,
  cli,
  initialBinaryPath,
  onSave,
  isSaving,
}: {
  displayName: string;
  cli?: CliHealth;
  initialBinaryPath: string;
  onSave: (binaryPath: string) => void;
  isSaving: boolean;
}) {
  const [binaryPath, setBinaryPath] = useState(initialBinaryPath);
  const [hasChanges, setHasChanges] = useState(false);

  const handleBinaryPathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setBinaryPath(newValue);
    setHasChanges(newValue !== initialBinaryPath);
  };

  const handleSave = () => {
    onSave(binaryPath);
    setHasChanges(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dot color={cli?.status === "healthy" ? "green" : "red"} pulse />
          {displayName}
        </CardTitle>
        {cli?.error && (
          <CardDescription className="text-destructive">
            {cli.error}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="text-muted-foreground text-xs font-medium">
              Custom Binary Path
            </div>
            <div className="text-muted-foreground text-xs">
              Leave empty to auto-detect from PATH
            </div>

            <div className="flex gap-2">
              <Input
                value={binaryPath}
                onChange={handleBinaryPathChange}
                placeholder="/usr/local/bin/claude"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                title="Save custom path"
              >
                <SaveIcon className={isSaving ? "animate-pulse" : ""} />
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-muted-foreground text-xs font-medium">
              Detected Executable
            </div>

            <div>
              <Input value={cli?.binaryPath ?? "Not detected"} readOnly />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-muted-foreground text-xs font-medium">
              Version
            </div>

            <div>
              <Input value={cli?.version ?? "Unknown"} readOnly />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Wrapper component that uses key to reset internal state when customBinaryPath changes.
 */
function CliCard({
  displayName,
  cli,
  customBinaryPath,
  onSave,
  isSaving,
}: {
  displayName: string;
  cli?: CliHealth;
  customBinaryPath?: string;
  onSave: (binaryPath: string) => void;
  isSaving: boolean;
}) {
  // Use key to force re-mount when customBinaryPath changes from API
  return (
    <CliCardInner
      key={customBinaryPath ?? ""}
      displayName={displayName}
      cli={cli}
      initialBinaryPath={customBinaryPath ?? ""}
      onSave={onSave}
      isSaving={isSaving}
    />
  );
}

/**
 * CLI configuration with display names and types.
 */
const CLI_CONFIGS: Array<{ type: CliType; displayName: string }> = [
  { type: "claude", displayName: "Claude Code" },
  { type: "gemini", displayName: "Gemini CLI" },
  { type: "codex", displayName: "Codex CLI" },
  { type: "opencode", displayName: "OpenCode" },
];

export const ClisPage = () => {
  const { data, isLoading, isError, error } = useHealth();
  const { data: settingsData, isLoading: isLoadingSettings } = useCliSettings();
  const refreshHealth = useRefreshHealth();
  const updateCliSettings = useUpdateCliSettings();

  const handleRefresh = () => {
    refreshHealth.mutate();
  };

  const handleSaveCliSettings = (type: CliType, binaryPath: string) => {
    updateCliSettings.mutate(
      {
        type,
        data: { binaryPath: binaryPath || undefined },
      },
      {
        onSuccess: () => {
          // Refresh health status after saving to pick up the new binary path
          refreshHealth.mutate();
        },
      },
    );
  };

  const isLoadingAll = isLoading || isLoadingSettings;

  return (
    <AppLayout
      breadcrumbItems={[{ label: "Settings" }, { label: "CLIs" }]}
      variant="xs"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshHealth.isPending}
        >
          <RefreshCwIcon
            className={refreshHealth.isPending ? "animate-spin" : ""}
          />
          Refresh CLI Status
        </Button>
      }
    >
      {isLoadingAll ? (
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
        <div className="flex flex-col gap-4">
          {CLI_CONFIGS.map(({ type, displayName }) => (
            <CliCard
              key={type}
              displayName={displayName}
              cli={data?.clis.find((cli) => cli.type === type)}
              customBinaryPath={settingsData?.settings[type]?.binaryPath}
              onSave={(binaryPath) => handleSaveCliSettings(type, binaryPath)}
              isSaving={updateCliSettings.isPending}
            />
          ))}
        </div>
      )}
    </AppLayout>
  );
};
