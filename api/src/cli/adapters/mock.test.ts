import { beforeEach, describe, expect, test } from 'bun:test';

import {
  createFailingAdapter,
  createMockAdapter,
  createNotFoundAdapter,
  createSuccessfulChatAdapter,
  createSuccessfulTaskAdapter,
  MockCliAdapter,
} from './mock.ts';

describe('MockCliAdapter', () => {
  let adapter: MockCliAdapter;

  beforeEach(() => {
    adapter = new MockCliAdapter();
  });

  describe('constructor', () => {
    test('creates adapter with default cli type claude', () => {
      expect(adapter.cliType).toBe('claude');
    });

    test('creates adapter with specified cli type', () => {
      const geminiAdapter = new MockCliAdapter('gemini');
      expect(geminiAdapter.cliType).toBe('gemini');
    });
  });

  describe('invoke', () => {
    test('returns successful result by default', async () => {
      const result = await adapter.invoke({
        inputPath: '/tmp/input.md',
        outputPath: '/tmp/output.json',
        cwd: '/tmp',
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.durationMs).toBeDefined();
    });

    test('records invocation in history', async () => {
      const options = {
        inputPath: '/tmp/input.md',
        outputPath: '/tmp/output.json',
        cwd: '/tmp',
      };

      await adapter.invoke(options);

      const history = adapter.getInvocationHistory();
      expect(history.length).toBe(1);
      expect(history[0]!.options).toEqual(options);
      expect(history[0]!.timestamp).toBeInstanceOf(Date);
    });

    test('getLastInvocation returns most recent invocation', async () => {
      await adapter.invoke({
        inputPath: '/tmp/first.md',
        outputPath: '/tmp/out1.json',
        cwd: '/tmp',
      });

      await adapter.invoke({
        inputPath: '/tmp/second.md',
        outputPath: '/tmp/out2.json',
        cwd: '/tmp',
      });

      const last = adapter.getLastInvocation();
      expect(last?.options.inputPath).toBe('/tmp/second.md');
    });

    test('returns configured error result', async () => {
      adapter.setInvocationConfig({
        success: false,
        exitCode: 1,
        error: 'Test error',
        stderr: 'Error output',
      });

      const result = await adapter.invoke({
        inputPath: '/tmp/input.md',
        outputPath: '/tmp/output.json',
        cwd: '/tmp',
      });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.error).toBe('Test error');
      expect(result.stderr).toBe('Error output');
    });

    test('respects configured delay', async () => {
      adapter.setInvocationConfig({
        success: true,
        delay: 50,
      });

      const start = Date.now();
      await adapter.invoke({
        inputPath: '/tmp/input.md',
        outputPath: '/tmp/output.json',
        cwd: '/tmp',
      });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(45); // Allow some margin
    });

    test('returns configured stdout', async () => {
      adapter.setInvocationConfig({
        success: true,
        stdout: 'Test output',
      });

      const result = await adapter.invoke({
        inputPath: '/tmp/input.md',
        outputPath: '/tmp/output.json',
        cwd: '/tmp',
      });

      expect(result.stdout).toBe('Test output');
    });
  });

  describe('healthCheck', () => {
    test('returns healthy status by default', async () => {
      const result = await adapter.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.binaryPath).toBeDefined();
      expect(result.version).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    test('records health check in history', async () => {
      await adapter.healthCheck('/custom/path');

      const history = adapter.getHealthCheckHistory();
      expect(history.length).toBe(1);
      expect(history[0]!.binaryPath).toBe('/custom/path');
      expect(history[0]!.timestamp).toBeInstanceOf(Date);
    });

    test('returns configured unhealthy status', async () => {
      adapter.setHealthConfig({
        status: 'unhealthy',
        error: 'CLI is broken',
      });

      const result = await adapter.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('CLI is broken');
      expect(result.binaryPath).toBeUndefined();
    });

    test('returns configured not_found status', async () => {
      adapter.setHealthConfig({
        status: 'not_found',
        error: 'Binary not found',
      });

      const result = await adapter.healthCheck();

      expect(result.status).toBe('not_found');
      expect(result.error).toBe('Binary not found');
    });
  });

  describe('reset', () => {
    test('clears invocation history', async () => {
      await adapter.invoke({
        inputPath: '/tmp/input.md',
        outputPath: '/tmp/output.json',
        cwd: '/tmp',
      });

      expect(adapter.getInvocationHistory().length).toBe(1);

      adapter.reset();

      expect(adapter.getInvocationHistory().length).toBe(0);
    });

    test('clears health check history', async () => {
      await adapter.healthCheck();

      expect(adapter.getHealthCheckHistory().length).toBe(1);

      adapter.reset();

      expect(adapter.getHealthCheckHistory().length).toBe(0);
    });

    test('resets invocation config to defaults', async () => {
      adapter.setInvocationConfig({
        success: false,
        error: 'Custom error',
      });

      adapter.reset();

      const result = await adapter.invoke({
        inputPath: '/tmp/input.md',
        outputPath: '/tmp/output.json',
        cwd: '/tmp',
      });

      expect(result.success).toBe(true);
    });

    test('resets health config to defaults', async () => {
      adapter.setHealthConfig({
        status: 'unhealthy',
        error: 'Custom error',
      });

      adapter.reset();

      const result = await adapter.healthCheck();

      expect(result.status).toBe('healthy');
    });
  });
});

describe('createMockAdapter', () => {
  test('creates adapter with default claude type', () => {
    const adapter = createMockAdapter();
    expect(adapter.cliType).toBe('claude');
  });

  test('creates adapter with specified type', () => {
    const adapter = createMockAdapter('codex');
    expect(adapter.cliType).toBe('codex');
  });
});

describe('createSuccessfulTaskAdapter', () => {
  test('creates adapter configured for successful task with skip action', async () => {
    const adapter = createSuccessfulTaskAdapter();

    const result = await adapter.invoke({
      inputPath: '/tmp/input.md',
      outputPath: '/tmp/output.json',
      cwd: '/tmp',
    });

    expect(result.success).toBe(true);
  });

  test('creates adapter with custom actions', async () => {
    const adapter = createSuccessfulTaskAdapter([
      { type: 'comment', content: 'Test comment' },
      { type: 'change_status', status: 'in_review' },
    ]);

    const result = await adapter.invoke({
      inputPath: '/tmp/input.md',
      outputPath: '/tmp/output.json',
      cwd: '/tmp',
    });

    expect(result.success).toBe(true);
  });
});

describe('createSuccessfulChatAdapter', () => {
  test('creates adapter configured for successful chat', async () => {
    const adapter = createSuccessfulChatAdapter('Hello!');

    const result = await adapter.invoke({
      inputPath: '/tmp/input.md',
      outputPath: '/tmp/output.json',
      cwd: '/tmp',
      type: 'chat',
    });

    expect(result.success).toBe(true);
  });

  test('creates adapter with custom message and actions', async () => {
    const adapter = createSuccessfulChatAdapter('Custom message', [
      { type: 'rename_chat', title: 'New Title' },
    ]);

    const result = await adapter.invoke({
      inputPath: '/tmp/input.md',
      outputPath: '/tmp/output.json',
      cwd: '/tmp',
      type: 'chat',
    });

    expect(result.success).toBe(true);
  });
});

describe('createFailingAdapter', () => {
  test('creates adapter that fails invocations', async () => {
    const adapter = createFailingAdapter('Custom error');

    const result = await adapter.invoke({
      inputPath: '/tmp/input.md',
      outputPath: '/tmp/output.json',
      cwd: '/tmp',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Custom error');
  });

  test('creates adapter with unhealthy status', async () => {
    const adapter = createFailingAdapter();

    const health = await adapter.healthCheck();

    expect(health.status).toBe('unhealthy');
  });
});

describe('createNotFoundAdapter', () => {
  test('creates adapter with not_found health status', async () => {
    const adapter = createNotFoundAdapter();

    const health = await adapter.healthCheck();

    expect(health.status).toBe('not_found');
    expect(health.error).toContain('not found');
  });
});
