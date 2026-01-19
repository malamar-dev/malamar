import { logger } from '../../core/logger.ts';
import type { CliType } from '../../core/types.ts';
import { checkCliHealth, findBinaryInPath } from '../health.ts';
import type {
  CliAdapter,
  CliHealthResult,
  CliInvocationOptions,
  CliInvocationResult,
} from '../types.ts';

/**
 * Default timeout for CLI invocations in milliseconds (10 minutes)
 */
const DEFAULT_INVOCATION_TIMEOUT = 600000;

/**
 * JSON schema for task output format
 *
 * This schema is used with Claude Code's --json-schema flag to enforce
 * the expected response format for task processing.
 */
export const TASK_OUTPUT_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    actions: {
      type: 'array',
      items: {
        type: 'object',
        oneOf: [
          {
            type: 'object',
            properties: {
              type: { const: 'skip' },
            },
            required: ['type'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              type: { const: 'comment' },
              content: { type: 'string' },
            },
            required: ['type', 'content'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              type: { const: 'change_status' },
              status: { enum: ['todo', 'in_progress', 'in_review', 'done'] },
            },
            required: ['type', 'status'],
            additionalProperties: false,
          },
        ],
      },
    },
  },
  required: ['actions'],
  additionalProperties: false,
};

/**
 * JSON schema for chat output format
 *
 * This schema is used with Claude Code's --json-schema flag to enforce
 * the expected response format for chat processing.
 */
export const CHAT_OUTPUT_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    message: { type: 'string' },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        oneOf: [
          {
            type: 'object',
            properties: {
              type: { const: 'create_agent' },
              name: { type: 'string' },
              instruction: { type: 'string' },
              cli_type: { enum: ['claude', 'gemini', 'codex', 'opencode'] },
              order: { type: 'number' },
            },
            required: ['type', 'name', 'instruction', 'cli_type'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              type: { const: 'update_agent' },
              agent_id: { type: 'string' },
              name: { type: 'string' },
              instruction: { type: 'string' },
              cli_type: { enum: ['claude', 'gemini', 'codex', 'opencode'] },
            },
            required: ['type', 'agent_id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              type: { const: 'delete_agent' },
              agent_id: { type: 'string' },
            },
            required: ['type', 'agent_id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              type: { const: 'reorder_agents' },
              agent_ids: { type: 'array', items: { type: 'string' } },
            },
            required: ['type', 'agent_ids'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              type: { const: 'update_workspace' },
              title: { type: 'string' },
              description: { type: 'string' },
              working_directory_mode: { enum: ['static', 'temp'] },
              working_directory_path: { type: 'string' },
              auto_delete_done_tasks: { type: 'boolean' },
              retention_days: { type: 'number' },
              notify_on_error: { type: 'boolean' },
              notify_on_in_review: { type: 'boolean' },
            },
            required: ['type'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              type: { const: 'rename_chat' },
              title: { type: 'string' },
            },
            required: ['type', 'title'],
            additionalProperties: false,
          },
        ],
      },
    },
  },
  additionalProperties: false,
};

/**
 * Claude Code CLI adapter
 *
 * Implements the CliAdapter interface for invoking Claude Code CLI
 * for task and chat processing.
 */
export class ClaudeAdapter implements CliAdapter {
  readonly cliType: CliType = 'claude';

  private customBinaryPath?: string;

  constructor(options?: { binaryPath?: string }) {
    this.customBinaryPath = options?.binaryPath;
  }

  /**
   * Invoke Claude Code CLI with the given options
   */
  async invoke(options: CliInvocationOptions): Promise<CliInvocationResult> {
    const startTime = Date.now();
    const timeout = options.timeout ?? DEFAULT_INVOCATION_TIMEOUT;

    try {
      // Find the binary path
      const binaryPath =
        options.binaryPath ?? this.customBinaryPath ?? (await findBinaryInPath('claude'));

      if (!binaryPath) {
        return {
          success: false,
          exitCode: -1,
          error: "Claude Code CLI binary not found. Please install it with 'npm install -g @anthropic/claude-code'",
          durationMs: Date.now() - startTime,
        };
      }

      // Build the command arguments
      const args = this.buildCommandArgs(binaryPath, options);

      // Build environment variables
      const env = this.buildEnvironment(options.env);

      logger.debug('Invoking Claude CLI', {
        binaryPath,
        cwd: options.cwd,
        inputPath: options.inputPath,
        outputPath: options.outputPath,
      });

      // Spawn the process
      const proc = Bun.spawn(args, {
        cwd: options.cwd,
        env,
        stdout: 'pipe',
        stderr: 'pipe',
      });

      // Wait for completion with timeout
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<'timeout'>((resolve) => {
        timeoutId = setTimeout(() => resolve('timeout'), timeout);
      });

      const exitedPromise = proc.exited;
      const result = await Promise.race([exitedPromise, timeoutPromise]);

      // Clear the timeout to prevent memory leak
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (result === 'timeout') {
        proc.kill();
        // Wait for the process to actually terminate to avoid zombie processes
        await proc.exited.catch(() => {});
        return {
          success: false,
          exitCode: -1,
          error: `Claude CLI invocation timed out after ${timeout / 1000} seconds`,
          durationMs: Date.now() - startTime,
        };
      }

      const exitCode = result;
      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();

      const success = exitCode === 0;

      if (!success) {
        logger.warn('Claude CLI exited with error', {
          exitCode,
          stderr: stderr.substring(0, 500),
        });
      }

      return {
        success,
        exitCode,
        stdout: stdout || undefined,
        stderr: stderr || undefined,
        error: success ? undefined : `CLI exited with code ${exitCode}`,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      logger.error('Claude CLI invocation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        exitCode: -1,
        error: error instanceof Error ? error.message : 'Unknown error during CLI invocation',
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Check if Claude Code CLI is healthy and available
   */
  async healthCheck(binaryPath?: string): Promise<CliHealthResult> {
    return checkCliHealth('claude', binaryPath ?? this.customBinaryPath);
  }

  /**
   * Build command arguments for Claude CLI invocation
   *
   * Note: Claude CLI uses positional argument for prompt, not --prompt flag.
   * The format is: claude --print [options] "prompt"
   */
  private buildCommandArgs(binaryPath: string, options: CliInvocationOptions): string[] {
    const prompt = `Read the file at ${options.inputPath} and follow the instruction autonomously. Write your response as JSON to: ${options.outputPath}`;

    // Select schema based on invocation type
    const schema = options.type === 'chat' ? CHAT_OUTPUT_SCHEMA : TASK_OUTPUT_SCHEMA;

    return [
      binaryPath,
      '--print',
      '--dangerously-skip-permissions',
      '--output-format',
      'json',
      '--json-schema',
      JSON.stringify(schema),
      prompt, // Prompt is a positional argument, not a flag
    ];
  }

  /**
   * Build environment variables for CLI invocation
   *
   * Inherits system environment and merges user-configured overrides.
   */
  private buildEnvironment(customEnv?: Record<string, string>): Record<string, string> {
    // Start with system environment
    const env: Record<string, string> = {};

    // Copy system env (excluding undefined values)
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        env[key] = value;
      }
    }

    // Merge user-configured environment variables
    if (customEnv) {
      for (const [key, value] of Object.entries(customEnv)) {
        env[key] = value;
      }
    }

    return env;
  }
}

/**
 * Create a new Claude Code CLI adapter instance
 */
export function createClaudeAdapter(options?: { binaryPath?: string }): ClaudeAdapter {
  return new ClaudeAdapter(options);
}
