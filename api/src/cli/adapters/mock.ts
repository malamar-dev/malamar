import type { CliType } from '../../core/types.ts';
import type {
  CliAdapter,
  CliHealthResult,
  CliInvocationOptions,
  CliInvocationResult,
} from '../types.ts';

/**
 * Mock response configuration for task invocations
 */
export interface MockTaskResponse {
  type: 'task';
  actions: Array<
    | { type: 'skip' }
    | { type: 'comment'; content: string }
    | { type: 'change_status'; status: 'todo' | 'in_progress' | 'in_review' | 'done' }
  >;
}

/**
 * Mock response configuration for chat invocations
 */
export interface MockChatResponse {
  type: 'chat';
  message?: string;
  actions?: Array<
    | { type: 'create_agent'; name: string; instruction: string; cli_type: CliType; order?: number }
    | { type: 'update_agent'; agent_id: string; name?: string; instruction?: string; cli_type?: CliType }
    | { type: 'delete_agent'; agent_id: string }
    | { type: 'reorder_agents'; agent_ids: string[] }
    | {
        type: 'update_workspace';
        title?: string;
        description?: string;
        working_directory_mode?: 'static' | 'temp';
        working_directory_path?: string;
        auto_delete_done_tasks?: boolean;
        retention_days?: number;
        notify_on_error?: boolean;
        notify_on_in_review?: boolean;
      }
    | { type: 'rename_chat'; title: string }
  >;
}

/**
 * Mock response type - either task or chat
 */
export type MockResponse = MockTaskResponse | MockChatResponse;

/**
 * Configuration for mock invocation behavior
 */
export interface MockInvocationConfig {
  /** Whether the invocation should succeed */
  success: boolean;
  /** Exit code to return (default: 0 for success, 1 for failure) */
  exitCode?: number;
  /** Error message if not successful */
  error?: string;
  /** Stdout to return */
  stdout?: string;
  /** Stderr to return */
  stderr?: string;
  /** Simulated duration in ms (default: 10) */
  durationMs?: number;
  /** Response to write to output file */
  response?: MockResponse;
  /** Delay before responding (for testing async behavior) */
  delay?: number;
}

/**
 * Configuration for mock health check behavior
 */
export interface MockHealthConfig {
  /** Health status to return */
  status: 'healthy' | 'unhealthy' | 'not_found';
  /** Binary path to report (if healthy) */
  binaryPath?: string;
  /** Version to report (if healthy) */
  version?: string;
  /** Error message (if not healthy) */
  error?: string;
  /** Simulated duration in ms (default: 5) */
  durationMs?: number;
}

/**
 * Default mock invocation config - successful with skip action
 */
const DEFAULT_INVOCATION_CONFIG: MockInvocationConfig = {
  success: true,
  exitCode: 0,
  durationMs: 10,
  response: {
    type: 'task',
    actions: [{ type: 'skip' }],
  },
};

/**
 * Default mock health config - healthy
 */
const DEFAULT_HEALTH_CONFIG: MockHealthConfig = {
  status: 'healthy',
  binaryPath: '/usr/local/bin/mock-cli',
  version: '1.0.0-mock',
  durationMs: 5,
};

/**
 * Mock CLI adapter for testing
 *
 * This adapter simulates CLI behavior without spawning real processes.
 * It can be configured to return specific responses, simulate errors,
 * and write output files just like the real adapter.
 *
 * Usage:
 * ```typescript
 * const adapter = new MockCliAdapter();
 * adapter.setInvocationConfig({
 *   success: true,
 *   response: { type: 'task', actions: [{ type: 'skip' }] }
 * });
 * const result = await adapter.invoke(options);
 * ```
 */
export class MockCliAdapter implements CliAdapter {
  readonly cliType: CliType;

  private invocationConfig: MockInvocationConfig;
  private healthConfig: MockHealthConfig;
  private invocationHistory: Array<{ options: CliInvocationOptions; timestamp: Date }> = [];
  private healthCheckHistory: Array<{ binaryPath?: string; timestamp: Date }> = [];

  constructor(cliType: CliType = 'claude') {
    this.cliType = cliType;
    this.invocationConfig = { ...DEFAULT_INVOCATION_CONFIG };
    this.healthConfig = { ...DEFAULT_HEALTH_CONFIG };
  }

  /**
   * Set the invocation configuration for subsequent invoke() calls
   */
  setInvocationConfig(config: Partial<MockInvocationConfig>): void {
    this.invocationConfig = { ...DEFAULT_INVOCATION_CONFIG, ...config };
  }

  /**
   * Set the health check configuration for subsequent healthCheck() calls
   */
  setHealthConfig(config: Partial<MockHealthConfig>): void {
    this.healthConfig = { ...DEFAULT_HEALTH_CONFIG, ...config };
  }

  /**
   * Reset configurations to defaults
   */
  reset(): void {
    this.invocationConfig = { ...DEFAULT_INVOCATION_CONFIG };
    this.healthConfig = { ...DEFAULT_HEALTH_CONFIG };
    this.invocationHistory = [];
    this.healthCheckHistory = [];
  }

  /**
   * Get the history of invoke() calls
   */
  getInvocationHistory(): Array<{ options: CliInvocationOptions; timestamp: Date }> {
    return [...this.invocationHistory];
  }

  /**
   * Get the history of healthCheck() calls
   */
  getHealthCheckHistory(): Array<{ binaryPath?: string; timestamp: Date }> {
    return [...this.healthCheckHistory];
  }

  /**
   * Get the last invocation options (convenience method for assertions)
   */
  getLastInvocation(): { options: CliInvocationOptions; timestamp: Date } | undefined {
    return this.invocationHistory[this.invocationHistory.length - 1];
  }

  /**
   * Invoke the mock CLI
   *
   * This simulates CLI behavior by:
   * 1. Recording the invocation in history
   * 2. Optionally waiting for configured delay
   * 3. Writing response to outputPath if configured
   * 4. Returning configured result
   */
  async invoke(options: CliInvocationOptions): Promise<CliInvocationResult> {
    // Record invocation
    this.invocationHistory.push({ options, timestamp: new Date() });

    const config = this.invocationConfig;
    const startTime = Date.now();

    // Simulate delay if configured
    if (config.delay && config.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, config.delay));
    }

    // Determine response based on invocation type
    let response = config.response;
    if (response && options.type === 'chat' && response.type === 'task') {
      // If chat invocation but task response configured, use default chat response
      response = { type: 'chat', message: 'Mock response', actions: [] };
    } else if (response && options.type !== 'chat' && response.type === 'chat') {
      // If task invocation but chat response configured, use default task response
      response = { type: 'task', actions: [{ type: 'skip' }] };
    }

    // Write response to output file if successful and response configured
    if (config.success && response) {
      try {
        await Bun.write(options.outputPath, JSON.stringify(response));
      } catch {
        // Ignore write errors in mock - the test setup may not have valid paths
      }
    }

    return {
      success: config.success,
      exitCode: config.exitCode ?? (config.success ? 0 : 1),
      stdout: config.stdout,
      stderr: config.stderr,
      error: config.error,
      durationMs: config.durationMs ?? Date.now() - startTime,
    };
  }

  /**
   * Perform mock health check
   *
   * This returns the configured health status without any actual checks.
   */
  async healthCheck(binaryPath?: string): Promise<CliHealthResult> {
    // Record health check
    this.healthCheckHistory.push({ binaryPath, timestamp: new Date() });

    const config = this.healthConfig;

    // Small delay to simulate I/O
    await new Promise((resolve) => setTimeout(resolve, 1));

    return {
      status: config.status,
      binaryPath: config.status === 'healthy' ? config.binaryPath : undefined,
      version: config.status === 'healthy' ? config.version : undefined,
      error: config.status !== 'healthy' ? config.error : undefined,
      durationMs: config.durationMs ?? 5,
    };
  }
}

/**
 * Create a new mock CLI adapter with default configuration
 */
export function createMockAdapter(cliType: CliType = 'claude'): MockCliAdapter {
  return new MockCliAdapter(cliType);
}

/**
 * Create a mock adapter configured for successful task processing
 */
export function createSuccessfulTaskAdapter(
  actions: MockTaskResponse['actions'] = [{ type: 'skip' }]
): MockCliAdapter {
  const adapter = new MockCliAdapter();
  adapter.setInvocationConfig({
    success: true,
    response: { type: 'task', actions },
  });
  return adapter;
}

/**
 * Create a mock adapter configured for successful chat processing
 */
export function createSuccessfulChatAdapter(
  message: string = 'Mock response',
  actions: MockChatResponse['actions'] = []
): MockCliAdapter {
  const adapter = new MockCliAdapter();
  adapter.setInvocationConfig({
    success: true,
    response: { type: 'chat', message, actions },
  });
  return adapter;
}

/**
 * Create a mock adapter configured to simulate failure
 */
export function createFailingAdapter(error: string = 'Mock CLI error'): MockCliAdapter {
  const adapter = new MockCliAdapter();
  adapter.setInvocationConfig({
    success: false,
    exitCode: 1,
    error,
  });
  adapter.setHealthConfig({
    status: 'unhealthy',
    error,
  });
  return adapter;
}

/**
 * Create a mock adapter configured to simulate CLI not found
 */
export function createNotFoundAdapter(): MockCliAdapter {
  const adapter = new MockCliAdapter();
  adapter.setHealthConfig({
    status: 'not_found',
    error: 'CLI binary not found in PATH',
  });
  return adapter;
}
