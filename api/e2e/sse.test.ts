import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { getBaseUrl, startServer, stopServer } from './helpers/index.ts';

interface StatusResponse {
  data: {
    connectionCount: number;
  };
}

describe('SSE E2E Tests', () => {
  beforeAll(async () => {
    await startServer();
  });

  afterAll(async () => {
    await stopServer();
  });

  describe('GET /api/events', () => {
    test('should establish SSE connection and receive initial ok comment', async () => {
      // Create AbortController to be able to close the connection
      const controller = new AbortController();

      const response = await fetch(`${getBaseUrl()}/api/events`, {
        signal: controller.signal,
        headers: {
          Accept: 'text/event-stream',
        },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/event-stream');

      // Read the initial data
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      // Read the initial messages (retry and ok comment)
      const { value } = await reader.read();
      const initialData = decoder.decode(value);

      // Verify retry hint is sent
      expect(initialData).toContain('retry: 3000');

      // Verify ok comment is sent (: ok is a comment in SSE format)
      expect(initialData).toContain(': ok');

      // Close the connection
      controller.abort();
      reader.cancel();
    });

    test('should return correct content-type header', async () => {
      const controller = new AbortController();

      const response = await fetch(`${getBaseUrl()}/api/events`, {
        signal: controller.signal,
        headers: {
          Accept: 'text/event-stream',
        },
      });

      expect(response.status).toBe(200);

      // Content-Type should be text/event-stream
      const contentType = response.headers.get('content-type');
      expect(contentType).toBeDefined();
      expect(contentType).toContain('text/event-stream');

      // Clean up
      controller.abort();
    });

    test('should send retry directive with correct value', async () => {
      const controller = new AbortController();

      const response = await fetch(`${getBaseUrl()}/api/events`, {
        signal: controller.signal,
        headers: {
          Accept: 'text/event-stream',
        },
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      const { value } = await reader.read();
      const data = decoder.decode(value);

      // Verify retry value is 3000ms as per the spec
      expect(data).toContain('retry: 3000');

      controller.abort();
      reader.cancel();
    });

    test('should increment connection count when connected', async () => {
      // Get initial connection count
      const beforeResponse = await fetch(`${getBaseUrl()}/api/events/status`);
      const beforeData = (await beforeResponse.json()) as StatusResponse;
      const beforeCount = beforeData.data.connectionCount;

      // Create SSE connection
      const controller = new AbortController();
      const response = await fetch(`${getBaseUrl()}/api/events`, {
        signal: controller.signal,
        headers: {
          Accept: 'text/event-stream',
        },
      });

      expect(response.status).toBe(200);

      // Read initial data to ensure connection is established
      const reader = response.body!.getReader();
      await reader.read();

      // Give server time to register connection
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check connection count increased
      const duringResponse = await fetch(`${getBaseUrl()}/api/events/status`);
      const duringData = (await duringResponse.json()) as StatusResponse;
      expect(duringData.data.connectionCount).toBe(beforeCount + 1);

      // Close the connection
      controller.abort();
      reader.cancel();

      // Give server time to clean up
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check connection count decreased
      const afterResponse = await fetch(`${getBaseUrl()}/api/events/status`);
      const afterData = (await afterResponse.json()) as StatusResponse;
      expect(afterData.data.connectionCount).toBe(beforeCount);
    });
  });

  describe('GET /api/events/status', () => {
    test('should return connection count', async () => {
      const response = await fetch(`${getBaseUrl()}/api/events/status`);

      expect(response.status).toBe(200);

      const data = (await response.json()) as StatusResponse;
      expect(typeof data.data.connectionCount).toBe('number');
      expect(data.data.connectionCount).toBeGreaterThanOrEqual(0);
    });

    test('should return JSON response', async () => {
      const response = await fetch(`${getBaseUrl()}/api/events/status`);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });

  describe('Disconnect handling', () => {
    test('should handle client disconnect gracefully', async () => {
      // Get initial count
      const beforeResponse = await fetch(`${getBaseUrl()}/api/events/status`);
      const beforeData = (await beforeResponse.json()) as StatusResponse;
      const beforeCount = beforeData.data.connectionCount;

      // Create connection
      const controller = new AbortController();
      const response = await fetch(`${getBaseUrl()}/api/events`, {
        signal: controller.signal,
        headers: {
          Accept: 'text/event-stream',
        },
      });

      expect(response.status).toBe(200);

      const reader = response.body!.getReader();
      await reader.read();

      // Wait for connection to be registered
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify connection is registered
      const duringResponse = await fetch(`${getBaseUrl()}/api/events/status`);
      const duringData = (await duringResponse.json()) as StatusResponse;
      expect(duringData.data.connectionCount).toBeGreaterThan(beforeCount);

      // Abort the connection (simulate client disconnect)
      controller.abort();

      // Wait for cleanup
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify connection was cleaned up
      const afterResponse = await fetch(`${getBaseUrl()}/api/events/status`);
      const afterData = (await afterResponse.json()) as StatusResponse;
      expect(afterData.data.connectionCount).toBeLessThanOrEqual(
        duringData.data.connectionCount - 1
      );
    });

    test('should handle multiple simultaneous connections', async () => {
      const beforeResponse = await fetch(`${getBaseUrl()}/api/events/status`);
      const beforeData = (await beforeResponse.json()) as StatusResponse;
      const beforeCount = beforeData.data.connectionCount;

      // Create multiple connections
      const connections: { controller: AbortController; reader: ReadableStreamDefaultReader }[] =
        [];

      for (let i = 0; i < 3; i++) {
        const controller = new AbortController();
        const response = await fetch(`${getBaseUrl()}/api/events`, {
          signal: controller.signal,
          headers: {
            Accept: 'text/event-stream',
          },
        });
        const reader = response.body!.getReader();
        await reader.read(); // Read initial data
        connections.push({ controller, reader });
      }

      // Wait for all connections to be registered
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify all connections are registered
      const duringResponse = await fetch(`${getBaseUrl()}/api/events/status`);
      const duringData = (await duringResponse.json()) as StatusResponse;
      expect(duringData.data.connectionCount).toBe(beforeCount + 3);

      // Close all connections
      for (const { controller, reader } of connections) {
        controller.abort();
        reader.cancel();
      }

      // Wait for cleanup
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify all connections were cleaned up
      const afterResponse = await fetch(`${getBaseUrl()}/api/events/status`);
      const afterData = (await afterResponse.json()) as StatusResponse;
      expect(afterData.data.connectionCount).toBe(beforeCount);
    });

    test('should clean up connection on abort signal', async () => {
      const controller = new AbortController();

      const response = await fetch(`${getBaseUrl()}/api/events`, {
        signal: controller.signal,
        headers: {
          Accept: 'text/event-stream',
        },
      });

      expect(response.status).toBe(200);

      const reader = response.body!.getReader();
      await reader.read();

      // Wait for connection to be registered
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Get count during connection
      const duringResponse = await fetch(`${getBaseUrl()}/api/events/status`);
      const duringData = (await duringResponse.json()) as StatusResponse;
      const countDuring = duringData.data.connectionCount;

      // Abort should trigger cleanup
      controller.abort();

      // Wait for cleanup
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Count should have decreased
      const afterResponse = await fetch(`${getBaseUrl()}/api/events/status`);
      const afterData = (await afterResponse.json()) as StatusResponse;
      expect(afterData.data.connectionCount).toBe(countDuring - 1);
    });
  });
});
