import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Subprocess } from "bun";

import type { Agent } from "../agent/types";
import {
  createChatTemporaryDir,
  loadConfig,
  removeTemporaryPath,
} from "../core";
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
 * Resolve the Claude CLI binary path.
 */
function resolveBinaryPath(): string | null {
  const config = loadConfig();

  if (config.claudeCodePath) {
    return config.claudeCodePath;
  }

  return Bun.which("claude");
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
 * Invoke the Claude CLI for chat processing.
 */
export async function invokeChatCli(
  options: ChatCliOptions,
  signal: AbortSignal,
): Promise<ChatCliResult> {
  const { chatId, workspace } = options;

  // Resolve binary path
  const binaryPath = resolveBinaryPath();
  if (!binaryPath) {
    return {
      success: false,
      error:
        "Claude CLI binary not found. Please install Claude Code or set MALAMAR_CLAUDE_CODE_PATH.",
    };
  }

  // Determine working directory
  let cwd: string;
  let createdTempDir = false;
  if (workspace.workingDirectory) {
    cwd = workspace.workingDirectory;
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

    // Spawn CLI process
    const proc = Bun.spawn(
      [
        binaryPath,
        "--dangerously-skip-permissions",
        "--print",
        `Read the file at ${inputPath} and follow the instruction autonomously. Write your JSON response to ${outputPath}.`,
      ],
      {
        cwd,
        stdout: "pipe",
        stderr: "pipe",
      },
    );

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
