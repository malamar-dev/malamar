import type { SseEventPayloadMap, SseEventType } from './types.ts';

/**
 * Event handler callback type
 */
export type EventHandler<T extends SseEventType = SseEventType> = (
  eventType: T,
  payload: SseEventPayloadMap[T]
) => void;

/**
 * Unsubscribe function type
 */
export type Unsubscribe = () => void;

/**
 * Singleton event emitter for pub/sub event broadcasting
 *
 * Used to decouple event producers (services, runners) from event consumers (SSE connections).
 * All SSE events go through this emitter.
 */
class EventEmitter {
  private handlers: Set<EventHandler> = new Set();

  /**
   * Subscribe to all events
   *
   * @param handler - Callback function that receives event type and payload
   * @returns Unsubscribe function to remove the handler
   */
  subscribe(handler: EventHandler): Unsubscribe {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  /**
   * Emit an event to all subscribers
   *
   * @param eventType - The type of event being emitted
   * @param payload - The event payload data
   */
  emit<T extends SseEventType>(eventType: T, payload: SseEventPayloadMap[T]): void {
    for (const handler of this.handlers) {
      try {
        handler(eventType, payload);
      } catch {
        // Handlers should not throw, but if they do, we ignore it
        // to avoid breaking other handlers
      }
    }
  }

  /**
   * Get the number of active subscribers
   */
  get subscriberCount(): number {
    return this.handlers.size;
  }

  /**
   * Clear all subscribers (useful for testing)
   */
  clear(): void {
    this.handlers.clear();
  }
}

/**
 * Singleton instance of the event emitter
 */
const eventEmitter = new EventEmitter();

/**
 * Subscribe to SSE events
 *
 * @param handler - Callback function that receives event type and payload
 * @returns Unsubscribe function to remove the handler
 */
export function subscribe(handler: EventHandler): Unsubscribe {
  return eventEmitter.subscribe(handler);
}

/**
 * Emit an SSE event
 *
 * @param eventType - The type of event being emitted
 * @param payload - The event payload data
 */
export function emit<T extends SseEventType>(eventType: T, payload: SseEventPayloadMap[T]): void {
  eventEmitter.emit(eventType, payload);
}

/**
 * Get the number of active subscribers
 */
export function getSubscriberCount(): number {
  return eventEmitter.subscriberCount;
}

/**
 * Clear all subscribers (useful for testing)
 */
export function clearSubscribers(): void {
  eventEmitter.clear();
}
