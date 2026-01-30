import {
  SAMPLE_WORKSPACE,
  SAMPLE_WORKSPACE_TITLE,
} from "../../prompts/defaults";
import * as workspaceRepository from "../../workspace/repository";
import * as workspaceService from "../../workspace/service";
import { readSettings, settingsFileExists, writeSettings } from "../settings";

/**
 * Check if this is a new installation (settings.json doesn't exist).
 */
export async function isNewInstallation(): Promise<boolean> {
  return !(await settingsFileExists());
}

/**
 * Check if a workspace with the sample title already exists.
 */
function sampleWorkspaceExists(): boolean {
  const workspaces = workspaceRepository.findAll();
  return workspaces.some((w) => w.title === SAMPLE_WORKSPACE_TITLE);
}

/**
 * Run first-time initialization.
 * Creates settings.json and sample workspace if needed.
 * Should be called after database is initialized.
 */
export async function runInitialization(): Promise<void> {
  const isNew = await isNewInstallation();

  if (isNew) {
    console.log("[Initialization] New installation detected");

    // Create sample workspace if it doesn't exist
    if (!sampleWorkspaceExists()) {
      console.log(
        "[Initialization] Creating sample workspace with default agents",
      );
      const result = workspaceService.createWorkspace(SAMPLE_WORKSPACE);
      if (result.ok) {
        console.log(`[Initialization] Created workspace: ${result.data.id}`);
      } else {
        console.error(
          `[Initialization] Failed to create sample workspace: ${result.error.message}`,
        );
      }
    } else {
      console.log("[Initialization] Sample workspace already exists, skipping");
    }

    // Mark as initialized
    await writeSettings({
      version: 1,
      initialized: true,
      initializedAt: new Date().toISOString(),
    });

    console.log("[Initialization] First-run setup complete");
  } else {
    // Settings file exists, check if initialized
    const settings = await readSettings();
    if (!settings.initialized) {
      // Edge case: settings file exists but not initialized
      // This could happen if initialization was interrupted
      console.log(
        "[Initialization] Settings exist but not initialized, completing setup",
      );

      if (!sampleWorkspaceExists()) {
        const result = workspaceService.createWorkspace(SAMPLE_WORKSPACE);
        if (result.ok) {
          console.log(`[Initialization] Created workspace: ${result.data.id}`);
        }
      }

      await writeSettings({
        ...settings,
        initialized: true,
        initializedAt: new Date().toISOString(),
      });
    }
  }
}
