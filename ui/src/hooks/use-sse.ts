import { useCallback, useEffect, useRef, useState } from 'react';

export type SSEConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'error' | 'closed';

export type SSEEventHandler = (data: unknown) => void;

interface UseSSEOptions {
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useSSE(options: UseSSEOptions = {}) {
  const {
    url = '/api/events',
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
  } = options;

  const [connectionState, setConnectionState] = useState<SSEConnectionState>('closed');
  const eventSourceRef = useRef<EventSource | null>(null);
  const handlersRef = useRef<Map<string, Set<SSEEventHandler>>>(new Map());
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldConnectRef = useRef(true);

  const subscribe = useCallback((eventType: string, handler: SSEEventHandler) => {
    if (!handlersRef.current.has(eventType)) {
      handlersRef.current.set(eventType, new Set());

      // If already connected, add listener for this event type
      if (eventSourceRef.current) {
        eventSourceRef.current.addEventListener(eventType, (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            handlersRef.current.get(eventType)?.forEach((h) => h(data));
          } catch (e) {
            console.error('Failed to parse SSE event data:', e);
          }
        });
      }
    }
    handlersRef.current.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = handlersRef.current.get(eventType);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }, []);

  const disconnect = useCallback(() => {
    shouldConnectRef.current = false;
    if (reconnectTimeoutRef.current !== null) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setConnectionState('closed');
  }, []);

  useEffect(() => {
    shouldConnectRef.current = true;

    const connect = () => {
      if (!shouldConnectRef.current) return;

      // Clean up existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      setConnectionState('connecting');

      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setConnectionState('connected');
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onerror = () => {
        eventSource.close();
        eventSourceRef.current = null;

        if (shouldConnectRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
          setConnectionState('reconnecting');
          reconnectAttemptsRef.current++;

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (shouldConnectRef.current) {
          setConnectionState('error');
        }
      };

      // Re-register all event handlers
      handlersRef.current.forEach((handlers, eventType) => {
        eventSource.addEventListener(eventType, (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            handlers.forEach((handler) => handler(data));
          } catch (e) {
            console.error('Failed to parse SSE event data:', e);
          }
        });
      });
    };

    connect();

    return () => {
      disconnect();
    };
  }, [url, reconnectInterval, maxReconnectAttempts, disconnect]);

  return {
    connectionState,
    subscribe,
    disconnect,
  };
}
