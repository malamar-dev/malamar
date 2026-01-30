import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Subprocess } from "bun";

import type { Agent, CliType } from "../agent/types";
import { resolveBinaryPathForCli } from "../cli";
import { createTaskTemporaryDir, removeTemporaryPath } from "../core";
import { generateId } from "../shared";
import type { Workspace } from "../workspace/types";
import {
  taskCliJsonSchema,
  type TaskCliOutput,
  taskCliOutputSchema,
} from "./schemas";
import type { TaskComment, TaskLog } from "./types";

/**
 * Options for invoking the task CLI.
 */
export interface TaskCliOptions {
  taskId: string;
  taskSummary: string;
  taskDescription: string;
  workspace: Workspace;
  agent: Agent;
  otherAgentNames: string[];
  comments: TaskComment[];
  logs: TaskLog[];
  onProcess?: (proc: Subprocess) => void;
}

/**
 * Result from CLI invocation.
 */
export interface TaskCliResult {
  success: boolean;
  output?: TaskCliOutput;
  error?: string;
}

/**
 * Format a comment for JSONL output.
 */
function formatCommentForJsonl(
  comment: TaskComment,
  getAgentName: (agentId: string) => string | null,
): string {
  let author: string;
  if (comment.userId) {
    author = "User";
  } else if (comment.agentId) {
    author = getAgentName(comment.agentId) ?? "Agent";
  } else {
    author = "System";
  }

  const obj: Record<string, unknown> = {
    author,
    content: comment.content,
    created_at: comment.createdAt.toISOString(),
  };

  if (comment.userId) {
    obj.user_id = comment.userId;
  }
  if (comment.agentId) {
    obj.agent_id = comment.agentId;
  }

  return JSON.stringify(obj);
}

/**
 * Format a log entry for JSONL output.
 */
function formatLogForJsonl(log: TaskLog): string {
  const obj: Record<string, unknown> = {
    event_type: log.eventType,
    actor_type: log.actorType,
    created_at: log.createdAt.toISOString(),
  };

  if (log.actorId) {
    obj.actor_id = log.actorId;
  }
  if (log.metadata) {
    obj.metadata = log.metadata;
  }

  return JSON.stringify(obj);
}

/**
 * Generate the base context content (shared between all CLIs).
 */
function generateBaseContextContent(
  options: TaskCliOptions,
  getAgentName: (agentId: string) => string | null,
): string {
  const {
    workspace,
    agent,
    otherAgentNames,
    taskSummary,
    taskDescription,
    comments,
    logs,
  } = options;

  // Format workspace instruction section
  const workspaceInstruction = workspace.description
    ? `${workspace.description}`
    : "(No workspace-level instruction provided)";

  // Format other agents list
  const otherAgentsSection =
    otherAgentNames.length > 0
      ? otherAgentNames.map((name) => `- ${name}`).join("\n")
      : "(No other agents)";

  // Format comments as JSONL
  const commentsJsonl =
    comments.length > 0
      ? comments.map((c) => formatCommentForJsonl(c, getAgentName)).join("\n")
      : "(No comments yet)";

  // Format logs as JSONL
  const logsJsonl =
    logs.length > 0
      ? logs.map(formatLogForJsonl).join("\n")
      : "(No activity yet)";

  return `# Malamar Context

You are being orchestrated by Malamar, a multi-agent workflow system.

${workspaceInstruction}

# Your Role

${agent.instruction}

## Other Agents in This Workflow

${otherAgentsSection}

# Task

## Summary

${taskSummary}

## Description

${taskDescription || "(No description provided)"}

## Comments

\`\`\`json
${commentsJsonl}
\`\`\`

## Activity Log

\`\`\`json
${logsJsonl}
\`\`\``;
}

/**
 * Generate output instructions for Claude CLI (uses --json-schema).
 */
function generateClaudeOutputInstructions(): string {
  return `# Output Instruction

Your JSON response will be captured via --json-schema. Return an "actions" array with your decisions.

## Available Actions

### skip
Take no action and pass control to the next agent. Use this when you have nothing meaningful to add.
IMPORTANT: Never comment just to say you have nothing to do - use skip instead.

### comment
Add a markdown comment to the task. Use this to:
- Report findings or progress
- Ask questions (task will move to "In Review" if you also use change_status)
- Provide feedback or suggestions
- Document what you've done

### change_status
Move the task to "in_review" when:
- You believe human attention is needed
- Requirements are unclear and you have questions
- Work is complete and ready for human verification

Only "in_review" is allowed as the target status. Agents cannot move tasks to other statuses.`;
}

/**
 * Generate output instructions for non-Claude CLIs (schema embedded in prompt).
 */
function generateOtherCliOutputInstructions(outputPath: string): string {
  return `# Output Instruction

Write your response as JSON to: ${outputPath}

The JSON must follow this exact structure:
\`\`\`json
{
  "actions": [
    { "type": "skip" }
  ]
}
\`\`\`

## Available Actions

### skip
Take no action and pass control to the next agent. Use this when you have nothing meaningful to add.
IMPORTANT: Never comment just to say you have nothing to do - use skip instead.

Example:
\`\`\`json
{ "type": "skip" }
\`\`\`

### comment
Add a markdown comment to the task. Use this to:
- Report findings or progress
- Ask questions (task will move to "In Review" if you also use change_status)
- Provide feedback or suggestions
- Document what you've done

Example:
\`\`\`json
{ "type": "comment", "content": "Your markdown comment here" }
\`\`\`

### change_status
Move the task to "in_review" when:
- You believe human attention is needed
- Requirements are unclear and you have questions
- Work is complete and ready for human verification

Example:
\`\`\`json
{ "type": "change_status", "status": "in_review" }
\`\`\`

Only "in_review" is allowed as the target status. Agents cannot move tasks to other statuses.

## Complete Output Example

\`\`\`json
{
  "actions": [
    { "type": "comment", "content": "I analyzed the code and found the issue." },
    { "type": "change_status", "status": "in_review" }
  ]
}
\`\`\`

CRITICAL: Write ONLY valid JSON to the output file. No other text.`;
}

/**
 * Generate the input file content based on CLI type.
 */
function generateInputFileContent(
  options: TaskCliOptions,
  getAgentName: (agentId: string) => string | null,
  cliType: CliType,
  outputPath: string,
): string {
  const baseContent = generateBaseContextContent(options, getAgentName);
  const outputInstructions =
    cliType === "claude"
      ? generateClaudeOutputInstructions()
      : generateOtherCliOutputInstructions(outputPath);

  return `${baseContent}

${outputInstructions}
`;
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
 * Build CLI arguments based on CLI type.
 * Claude uses --json-schema, other CLIs use output file approach.
 */
function buildCliArgs(
  cliType: CliType,
  inputPath: string,
  outputPath: string,
): string[] {
  const prompt = `Read the file at ${inputPath} and follow the instruction autonomously.`;
  const promptWithOutput = `${prompt} Write your JSON response to ${outputPath}.`;

  switch (cliType) {
    case "claude":
      return [
        "--dangerously-skip-permissions",
        "--print",
        "--output-format",
        "json",
        "--json-schema",
        taskCliJsonSchema,
        prompt,
      ];
    case "gemini":
      // Gemini CLI uses positional prompt and --yolo for auto-approve
      return ["--yolo", promptWithOutput];
    case "codex":
      // Codex CLI uses --prompt flag (based on typical CLI patterns)
      return ["--prompt", promptWithOutput];
    case "opencode":
      // OpenCode uses --prompt flag
      return ["--prompt", promptWithOutput];
    default:
      return [];
  }
}

/**
 * Parse CLI output based on CLI type.
 * Claude outputs to stdout with --output-format json, other CLIs write to a file.
 */
async function parseCliOutput(
  cliType: CliType,
  proc: Subprocess,
  outputPath: string,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  if (cliType === "claude") {
    // Claude outputs to stdout with --output-format json
    const stdoutText = await new Response(proc.stdout).text();
    if (!stdoutText.trim()) {
      return {
        success: false,
        error: "CLI completed but no output was produced",
      };
    }

    try {
      const outputWrapper = JSON.parse(stdoutText);
      // When using --json-schema, the result is in structured_output
      const data = outputWrapper.structured_output ?? outputWrapper;
      return { success: true, data };
    } catch {
      return {
        success: false,
        error: `CLI output was not valid JSON: ${stdoutText.slice(0, 200)}`,
      };
    }
  } else {
    // Other CLIs write to output file
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

    try {
      const data = JSON.parse(outputText);
      return { success: true, data };
    } catch {
      return {
        success: false,
        error: `CLI output was not valid JSON: ${outputText.slice(0, 200)}`,
      };
    }
  }
}

/**
 * Invoke the CLI for task processing.
 * Supports multiple CLI types with different invocation patterns:
 * - Claude: Uses --json-schema flag for structured output validation
 * - Gemini/Codex/OpenCode: Schema embedded in prompt, output written to file
 */
export async function invokeTaskCli(
  options: TaskCliOptions,
  signal: AbortSignal,
  getAgentName: (agentId: string) => string | null,
): Promise<TaskCliResult> {
  const { taskId, workspace, agent } = options;
  const cliType = agent.cliType;

  // Resolve binary path for the agent's CLI type
  const binaryPath = resolveBinaryPathForCli(cliType);
  if (!binaryPath) {
    return {
      success: false,
      error: `${getCliDisplayName(cliType)} binary not found. Please install it or configure its path in Settings.`,
    };
  }

  // Determine working directory
  let cwd: string;
  if (workspace.workingDirectory) {
    cwd = workspace.workingDirectory;
    // Warn if static directory doesn't exist
    if (!existsSync(cwd)) {
      console.warn(`[TaskCLI] Static working directory does not exist: ${cwd}`);
    }
  } else {
    cwd = await createTaskTemporaryDir(taskId);
  }

  // Generate file paths - use unique IDs to avoid race conditions
  // when multiple agents process the same task sequentially
  const inputId = generateId();
  const inputPath = join(tmpdir(), `malamar_input_${inputId}.md`);
  const outputPath = join(tmpdir(), `malamar_output_${inputId}.json`);

  try {
    // Write input file based on CLI type
    const inputContent = generateInputFileContent(
      options,
      getAgentName,
      cliType,
      outputPath,
    );
    await Bun.write(inputPath, inputContent);

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

      // Parse output based on CLI type
      const parseResult = await parseCliOutput(cliType, proc, outputPath);
      if (!parseResult.success) {
        return { success: false, error: parseResult.error };
      }

      // Validate against schema (additional safety layer)
      const validated = taskCliOutputSchema.safeParse(parseResult.data);
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
    // Clean up temporary files
    removeTemporaryPath(inputPath);
    if (cliType !== "claude") {
      removeTemporaryPath(outputPath);
    }
    // Note: We don't clean up the task working directory as it may be reused
  }
}
