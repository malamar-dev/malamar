import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Subprocess } from "bun";

import type { Agent, CliType } from "../agent/types";
import { getAllCliHealth, resolveBinaryPathForCli } from "../cli";
import { createChatTemporaryDir, removeTemporaryPath } from "../core";
import { MALAMAR_AGENT_INSTRUCTION } from "../prompts";
import { generateId } from "../shared";
import type { Workspace } from "../workspace/types";
import { cliOutputSchema } from "./schemas";
import type { ChatMessage, CliChatOutput } from "./types";

/**
 * Options for invoking the chat CLI.
 */
export interface ChatCliOptions {
  chatId: string;
  workspace: Workspace;
  agent: Agent | null;
  cliTypeOverride: CliType | null;
  messages: ChatMessage[];
  onProcess?: (proc: Subprocess) => void;
}

/**
 * Result from CLI invocation.
 */
export interface ChatCliResult {
  success: boolean;
  output?: CliChatOutput;
  error?: string;
}

/**
 * Determine the CLI type to use for chat invocation.
 * Priority: 1. Chat-level override, 2. Agent's cliType, 3. First healthy CLI
 */
function determineCliType(
  cliTypeOverride: CliType | null,
  agent: Agent | null,
): CliType {
  // 1. Chat-level override takes priority
  if (cliTypeOverride) {
    return cliTypeOverride;
  }

  // 2. Agent's cliType
  if (agent?.cliType) {
    return agent.cliType;
  }

  // 3. First healthy CLI (priority: claude > codex > gemini > opencode)
  const healthyCliOrder: CliType[] = ["claude", "codex", "gemini", "opencode"];
  const cliHealth = getAllCliHealth();

  for (const cli of healthyCliOrder) {
    const health = cliHealth.find((h) => h.type === cli);
    if (health?.status === "healthy") {
      return cli;
    }
  }

  // Fallback to Claude if no healthy CLI found
  return "claude";
}

/**
 * Get CLI display name for error messages.
 */
function getCliDisplayName(cliType: CliType): string {
  switch (cliType) {
    case "claude":
      return "Claude Code";
    case "gemini":
      return "Gemini CLI";
    case "codex":
      return "Codex CLI";
    case "opencode":
      return "OpenCode";
    default:
      return cliType;
  }
}

/**
 * Generate the input file content for the CLI.
 * Contains the agent instruction and conversation history.
 */
function generateInputFileContent(
  options: ChatCliOptions,
  outputPath: string,
  contextPath: string,
): string {
  const { chatId, workspace, agent, messages } = options;
  const agentName = agent?.name ?? "Malamar";
  const instruction = agent?.instruction ?? MALAMAR_AGENT_INSTRUCTION;

  // Format conversation history as JSONL
  const historyLines = messages.map((msg) => {
    return JSON.stringify({
      role: msg.role,
      content: msg.message,
      created_at: msg.createdAt.toISOString(),
    });
  });

  return `# Malamar Chat Context

You are being invoked by Malamar's chat feature.

${instruction}

## Chat Metadata

- Chat ID: ${chatId}
- Workspace: ${workspace.title}
- Agent: ${agentName}

## Conversation History

\`\`\`json
${historyLines.join("\n")}
\`\`\`

## Additional Context

For workspace state and settings, read: ${contextPath}

# Output Instruction

Write your response as JSON to: ${outputPath}

The JSON must have this structure:
\`\`\`json
{
  "message": "Your conversational response (optional)",
  "actions": [
    { "type": "rename_chat", "title": "New Title" }
  ]
}
\`\`\`

Both "message" and "actions" are optional. Include "message" to respond to the user.

## Available Actions

### rename_chat (First Response Only)
On your FIRST response in a conversation, include the rename_chat action to give the chat a descriptive title based on the user's request.

Guidelines:
- Keep titles concise (under 50 characters)
- Use sentence case
- Describe the main topic or task
- Examples: "Setting up authentication", "Debug API timeout issue", "Refactor payment module"

CRITICAL: Write ONLY valid JSON to the output file. No other text.
`;
}

/**
 * Generate the context file content for the CLI.
 * Contains workspace state and available actions.
 */
function generateContextFileContent(options: ChatCliOptions): string {
  const { workspace, agent } = options;
  const agentName = agent?.name ?? "Malamar";
  const workingDir =
    workspace.workingDirectory ?? "Temporary directory (created per chat)";

  return `# Context

## Workspace

- Title: ${workspace.title}
- Description: ${workspace.description || "(No description)"}
- Working Directory: ${workingDir}

## Current Agent

- Name: ${agentName}
${agent ? `- CLI Type: ${agent.cliType}` : "- Type: Built-in Malamar agent"}

## Available Actions

### rename_chat
Rename the current chat to reflect its topic. Only works on your first response in a conversation.

\`\`\`json
{ "type": "rename_chat", "title": "Descriptive Chat Title" }
\`\`\`

Guidelines for renaming:
- Choose titles that clearly describe the conversation topic
- Keep titles concise (under 50 characters)
- Use sentence case (capitalize first letter only)
- Examples: "Setting up code review workflow", "Debug authentication issue"
`;
}

/**
 * Build CLI arguments based on CLI type.
 * All chat CLIs use the output file approach (no --json-schema for chat).
 */
function buildCliArgs(
  cliType: CliType,
  inputPath: string,
  outputPath: string,
): string[] {
  const prompt = `Read the file at ${inputPath} and follow the instruction autonomously. Write your JSON response to ${outputPath}.`;

  switch (cliType) {
    case "claude":
      return ["--dangerously-skip-permissions", "--print", prompt];
    case "gemini":
      // Gemini CLI uses positional prompt and --yolo for auto-approve
      return ["--yolo", prompt];
    case "codex":
      // Codex CLI uses --prompt flag
      return ["--prompt", prompt];
    case "opencode":
      // OpenCode uses --prompt flag
      return ["--prompt", prompt];
    default:
      return [];
  }
}

/**
 * Invoke the CLI for chat processing.
 * Supports multiple CLI types with automatic fallback.
 */
export async function invokeChatCli(
  options: ChatCliOptions,
  signal: AbortSignal,
): Promise<ChatCliResult> {
  const { chatId, workspace, agent, cliTypeOverride } = options;

  // Determine which CLI to use
  const cliType = determineCliType(cliTypeOverride, agent);

  // Resolve binary path for the determined CLI type
  const binaryPath = resolveBinaryPathForCli(cliType);
  if (!binaryPath) {
    return {
      success: false,
      error: `${getCliDisplayName(cliType)} binary not found. Please install it or configure its path in Settings.`,
    };
  }

  // Determine working directory
  let cwd: string;
  let createdTempDir = false;
  if (workspace.workingDirectory) {
    cwd = workspace.workingDirectory;
    // Warn if static directory doesn't exist
    if (!existsSync(cwd)) {
      console.warn(`[ChatCLI] Static working directory does not exist: ${cwd}`);
    }
  } else {
    cwd = await createChatTemporaryDir(chatId);
    createdTempDir = true;
  }

  // Generate file paths - use unique IDs to avoid race conditions
  // when processing multiple messages for the same chat
  const invocationId = generateId();
  const inputPath = join(tmpdir(), `malamar_chat_input_${invocationId}.md`);
  const contextPath = join(tmpdir(), `malamar_chat_context_${invocationId}.md`);
  const outputPath = join(tmpdir(), `malamar_chat_output_${invocationId}.json`);

  try {
    // Write input files
    const inputContent = generateInputFileContent(
      options,
      outputPath,
      contextPath,
    );
    const contextContent = generateContextFileContent(options);

    await Bun.write(inputPath, inputContent);
    await Bun.write(contextPath, contextContent);

    // Check if aborted before starting
    if (signal.aborted) {
      return { success: false, error: "Processing was cancelled" };
    }

    // Build CLI arguments based on CLI type
    const args = buildCliArgs(cliType, inputPath, outputPath);

    // Spawn CLI process
    const proc = Bun.spawn([binaryPath, ...args], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    });

    // Track subprocess via callback
    options.onProcess?.(proc);

    // Set up abort handler
    const abortHandler = () => {
      proc.kill();
    };
    signal.addEventListener("abort", abortHandler, { once: true });

    try {
      // Wait for process to complete
      const exitCode = await proc.exited;

      // Clean up abort listener
      signal.removeEventListener("abort", abortHandler);

      // Check if aborted during execution
      if (signal.aborted) {
        return { success: false, error: "Processing was cancelled" };
      }

      // Check exit code
      if (exitCode !== 0) {
        const stderr = await new Response(proc.stderr).text();
        const errorDetail = stderr.trim() || `CLI exited with code ${exitCode}`;
        return { success: false, error: errorDetail };
      }

      // Read and parse output file
      const outputFile = Bun.file(outputPath);
      const exists = await outputFile.exists();
      if (!exists) {
        return {
          success: false,
          error: "CLI completed but output file was not created",
        };
      }

      const outputText = await outputFile.text();
      if (!outputText.trim()) {
        return {
          success: false,
          error: "CLI completed but output file was empty",
        };
      }

      // Parse JSON
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(outputText);
      } catch {
        return {
          success: false,
          error: `CLI output was not valid JSON: ${outputText.slice(0, 200)}`,
        };
      }

      // Validate against schema
      const validated = cliOutputSchema.safeParse(parsedJson);
      if (!validated.success) {
        return {
          success: false,
          error: `CLI output structure was invalid: ${validated.error.errors[0]?.message}`,
        };
      }

      return {
        success: true,
        output: validated.data,
      };
    } finally {
      // Ensure abort handler is removed even if there's an exception
      signal.removeEventListener("abort", abortHandler);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  } finally {
    // Clean up temporary files (but not the working directory if it was user-specified)
    removeTemporaryPath(inputPath);
    removeTemporaryPath(contextPath);
    removeTemporaryPath(outputPath);

    // Only clean up working directory if we created it
    if (createdTempDir) {
      // Don't clean up chat temp dir - it may be reused for subsequent messages
      // The OS will clean it up eventually
    }
  }
}
