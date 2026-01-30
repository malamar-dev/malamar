import type { Config } from "./types";

export function loadConfig(): Config {
  const host = process.env.MALAMAR_HOST ?? "127.0.0.1";
  const port = parseInt(process.env.MALAMAR_PORT ?? "3456", 10);
  const claudeCodePath = process.env.MALAMAR_CLAUDE_CODE_PATH;
  const geminiCliPath = process.env.MALAMAR_GEMINI_CLI_PATH;
  const codexCliPath = process.env.MALAMAR_CODEX_CLI_PATH;
  const opencodePath = process.env.MALAMAR_OPENCODE_PATH;

  return {
    host,
    port,
    claudeCodePath,
    geminiCliPath,
    codexCliPath,
    opencodePath,
  };
}
