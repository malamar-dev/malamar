import { Hono } from "hono";
import { streamSSE } from "hono/streaming";

import { sseEmitter } from "./emitter";
import type { SSEEventData, SSEEventType } from "./types";

export const eventsRouter = new Hono();

/**
 * SSE endpoint for real-time updates.
 *
 * GET /api/events
 *
 * Clients connect and receive server-sent events for:
 * - Task status changes
 * - Comment additions
 * - Agent execution start/finish
 * - Chat message additions
 * - Chat processing start/finish
 * - Error notifications
 */
eventsRouter.get("/", async (c) => {
  return streamSSE(c, async (stream) => {
    // Send initial connection acknowledgment with retry hint
    await stream.writeSSE({
      event: "connected",
      data: JSON.stringify({ message: "Connected to Malamar SSE" }),
      retry: 3000,
    });

    // Handler for SSE events
    const handler = async ({
      eventType,
      data,
    }: {
      eventType: SSEEventType;
      data: SSEEventData;
    }) => {
      try {
        // Convert camelCase to snake_case for JSON payload
        const snakeCaseData = Object.fromEntries(
          Object.entries(data).map(([key, value]) => [
            key.replace(/([A-Z])/g, "_$1").toLowerCase(),
            value,
          ]),
        );

        await stream.writeSSE({
          event: eventType,
          data: JSON.stringify(snakeCaseData),
        });
      } catch {
        // Connection closed, will be cleaned up by onAbort
      }
    };

    // Register event listener
    sseEmitter.on("sse", handler);

    // Keep connection alive with periodic heartbeats
    const heartbeatInterval = setInterval(async () => {
      try {
        await stream.writeSSE({
          event: "heartbeat",
          data: JSON.stringify({ timestamp: new Date().toISOString() }),
        });
      } catch {
        // Connection closed
        clearInterval(heartbeatInterval);
      }
    }, 30000); // Every 30 seconds

    // Clean up on disconnect
    stream.onAbort(() => {
      sseEmitter.off("sse", handler);
      clearInterval(heartbeatInterval);
    });

    // Keep the connection open
    // The stream will be closed when the client disconnects
    await new Promise(() => {
      // This promise never resolves - connection stays open until client disconnects
    });
  });
});
