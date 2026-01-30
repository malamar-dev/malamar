import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Subprocess } from "bun";

import type { Agent } from "../agent/types";
import {
  createTaskTemporaryDir,
  loadConfig,
  removeTemporaryPath,
} from "../core";
import { generateId } from "../shared";
import type { Workspace } from "../workspace/types";
import { type TaskCliOutput, taskCliOutputSchema } from "./schemas";
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
 * Resolve the Claude CLI binary path.
 * Currently only supports Claude Code; other CLIs can be added later.
 */
function resolveBinaryPath(): string | null {
  const config = loadConfig();

  if (config.claudeCodePath) {
    return config.claudeCodePath;
  }

  return Bun.which("claude");
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
 * Generate the input file content for the CLI.
 * Contains the workspace instruction, agent instruction, task details,
 * comments (as JSONL), and activity logs (as JSONL).
 */
function generateInputFileContent(
  options: TaskCliOptions,
  outputPath: string,
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
\`\`\`

# Output Instruction

Write your response as JSON to: ${outputPath}

The JSON must have this structure:
\`\`\`json
{
  "actions": [
    { "type": "skip" },
    { "type": "comment", "content": "Your markdown content here" },
    { "type": "change_status", "status": "in_review" }
  ]
}
\`\`\`

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

Only "in_review" is allowed as the target status. Agents cannot move tasks to other statuses.
`;
}

/**
 * Invoke the CLI for task processing.
 */
export async function invokeTaskCli(
  options: TaskCliOptions,
  signal: AbortSignal,
  getAgentName: (agentId: string) => string | null,
): Promise<TaskCliResult> {
  const { taskId, workspace } = options;

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
  const outputId = generateId();
  const outputPath = join(tmpdir(), `malamar_output_${outputId}.json`);

  try {
    // Write input file
    const inputContent = generateInputFileContent(
      options,
      outputPath,
      getAgentName,
    );
    await Bun.write(inputPath, inputContent);

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
          error: `CLI completed but output file was not created at ${outputPath}`,
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
      const validated = taskCliOutputSchema.safeParse(parsedJson);
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
    removeTemporaryPath(outputPath);
    // Note: We don't clean up the task working directory as it may be reused
  }
}
