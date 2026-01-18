import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';

import { addConnection, getConnectionCount, type SseStreamController } from './registry.ts';

export const eventsRoutes = new Hono();

/**
 * GET /events - Server-Sent Events stream
 *
 * Establishes a persistent SSE connection for real-time event updates.
 * Events are broadcast to all connected clients without workspace scoping.
 *
 * Event format per SSE spec:
 *   event: {type}
 *   data: {json}
 *
 * On connect, sends:
 *   retry: 3000
 *   : ok
 *
 * Supported events:
 *   - task.status_changed
 *   - task.comment_added
 *   - task.error_occurred
 *   - agent.execution_started
 *   - agent.execution_finished
 *   - chat.message_added
 *   - chat.processing_started
 *   - chat.processing_finished
 */
eventsRoutes.get('/', async (c) => {
  return streamSSE(c, async (stream) => {
    // Create controller that adapts to Hono's streaming interface
    const controller: SseStreamController = {
      enqueue: (data: string) => {
        // writeSSE writes in SSE format, but we're already formatting
        // Use write directly to send pre-formatted SSE data
        stream.write(data);
      },
      close: () => {
        stream.close();
      },
    };

    // Add connection to registry and get cleanup function
    const cleanup = addConnection(controller);

    // Keep connection alive by waiting for abort
    // The abortSignal will be triggered when client disconnects
    try {
      await new Promise<void>((resolve) => {
        // Check if the stream has an abort signal
        if (stream.aborted) {
          resolve();
          return;
        }

        // Wait for disconnect
        stream.onAbort(() => {
          resolve();
        });
      });
    } finally {
      cleanup();
    }
  });
});

/**
 * GET /events/status - Get SSE connection status (for debugging)
 */
eventsRoutes.get('/status', (c) => {
  return c.json({
    data: {
      connectionCount: getConnectionCount(),
    },
  });
});
