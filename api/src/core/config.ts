import type { Config } from "./types";

export function loadConfig(): Config {
  const host = process.env.MALAMAR_HOST ?? "127.0.0.1";
  const port = parseInt(process.env.MALAMAR_PORT ?? "3456", 10);
  const claudeCodePath = process.env.MALAMAR_CLAUDE_CODE_PATH;

  return { host, port, claudeCodePath };
}
