import { subscribe } from './emitter.ts';
import type { SseEventPayloadMap, SseEventType } from './types.ts';
import { DEFAULT_SSE_CONFIG } from './types.ts';

/**
 * SSE stream controller for managing individual connections
 */
export interface SseStreamController {
  enqueue: (data: string) => void;
  close: () => void;
}

/**
 * Active SSE connection with its stream controller
 */
interface SseConnection {
  controller: SseStreamController;
  createdAt: number;
}

/**
 * SSE connection registry for managing active connections
 *
 * Maintains a Set of active SSE connections and broadcasts events to all of them.
 * Events are broadcast to all clients without workspace scoping.
 */
class SseRegistry {
  private connections: Set<SseConnection> = new Set();
  private unsubscribe: (() => void) | null = null;

  /**
   * Initialize the registry by subscribing to the event emitter
   */
  init(): void {
    if (this.unsubscribe) {
      return; // Already initialized
    }

    this.unsubscribe = subscribe((eventType, payload) => {
      this.broadcast(eventType, payload);
    });
  }

  /**
   * Shutdown the registry by unsubscribing from events
   */
  shutdown(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    // Close all connections
    for (const connection of this.connections) {
      try {
        connection.controller.close();
      } catch {
        // Ignore errors when closing
      }
    }
    this.connections.clear();
  }

  /**
   * Add a new SSE connection
   *
   * @param controller - The stream controller for sending data
   * @returns A cleanup function to call when the connection closes
   */
  addConnection(controller: SseStreamController): () => void {
    const connection: SseConnection = {
      controller,
      createdAt: Date.now(),
    };

    this.connections.add(connection);

    // Send initial retry hint and ok comment
    try {
      controller.enqueue(`retry: ${DEFAULT_SSE_CONFIG.retryMs}\n`);
      controller.enqueue(`: ok\n\n`);
    } catch {
      // Connection might already be closed
      this.connections.delete(connection);
    }

    // Return cleanup function
    return () => {
      this.connections.delete(connection);
    };
  }

  /**
   * Broadcast an event to all connected clients
   *
   * @param eventType - The type of event
   * @param payload - The event payload
   */
  broadcast<T extends SseEventType>(eventType: T, payload: SseEventPayloadMap[T]): void {
    const message = formatSseMessage(eventType, payload);
    const deadConnections: SseConnection[] = [];

    for (const connection of this.connections) {
      try {
        connection.controller.enqueue(message);
      } catch {
        // Connection is dead, mark for removal
        deadConnections.push(connection);
      }
    }

    // Clean up dead connections
    for (const connection of deadConnections) {
      this.connections.delete(connection);
    }
  }

  /**
   * Get the number of active connections
   */
  get connectionCount(): number {
    return this.connections.size;
  }

  /**
   * Clear all connections (useful for testing)
   */
  clear(): void {
    this.connections.clear();
  }
}

/**
 * Format an event as SSE message
 *
 * @param eventType - The type of event
 * @param payload - The event payload
 * @returns The formatted SSE message string
 */
export function formatSseMessage<T extends SseEventType>(
  eventType: T,
  payload: SseEventPayloadMap[T]
): string {
  const data = JSON.stringify(payload);
  return `event: ${eventType}\ndata: ${data}\n\n`;
}

/**
 * Singleton instance of the SSE registry
 */
const sseRegistry = new SseRegistry();

/**
 * Initialize the SSE registry
 */
export function initSseRegistry(): void {
  sseRegistry.init();
}

/**
 * Shutdown the SSE registry
 */
export function shutdownSseRegistry(): void {
  sseRegistry.shutdown();
}

/**
 * Add a new SSE connection
 *
 * @param controller - The stream controller for sending data
 * @returns A cleanup function to call when the connection closes
 */
export function addConnection(controller: SseStreamController): () => void {
  return sseRegistry.addConnection(controller);
}

/**
 * Get the number of active SSE connections
 */
export function getConnectionCount(): number {
  return sseRegistry.connectionCount;
}

/**
 * Clear all SSE connections (useful for testing)
 */
export function clearConnections(): void {
  sseRegistry.clear();
}
