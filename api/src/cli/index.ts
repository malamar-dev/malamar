export {
  claudeAdapter,
  resolveBinaryPath as resolveClaudeBinaryPath,
} from "./adapters/claude";
export {
  codexAdapter,
  resolveBinaryPath as resolveCodexBinaryPath,
} from "./adapters/codex";
export {
  geminiAdapter,
  resolveBinaryPath as resolveGeminiBinaryPath,
} from "./adapters/gemini";
export {
  opencodeAdapter,
  resolveBinaryPath as resolveOpencodeBinaryPath,
} from "./adapters/opencode";
export { getAllCliHealth, getCliHealth, setCliHealth } from "./health";
export type {
  CliAdapter,
  CliHealthResult,
  CliHealthStatus,
  CliType,
} from "./types";

import { resolveBinaryPath as resolveClaudePath } from "./adapters/claude";
import { resolveBinaryPath as resolveCodexPath } from "./adapters/codex";
import { resolveBinaryPath as resolveGeminiPath } from "./adapters/gemini";
import { resolveBinaryPath as resolveOpencodePath } from "./adapters/opencode";
import type { CliType } from "./types";

/**
 * Resolve the binary path for any CLI type.
 */
export function resolveBinaryPathForCli(cliType: CliType): string | null {
  switch (cliType) {
    case "claude":
      return resolveClaudePath();
    case "gemini":
      return resolveGeminiPath();
    case "codex":
      return resolveCodexPath();
    case "opencode":
      return resolveOpencodePath();
    default:
      return null;
  }
}
