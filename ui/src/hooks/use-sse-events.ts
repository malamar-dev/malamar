import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { createSSEHandlers } from '@/lib/sse-handlers';

import { useSSE } from './use-sse';

export function useSSEEvents() {
  const queryClient = useQueryClient();
  const { subscribe, connectionState } = useSSE();

  useEffect(() => {
    const handlers = createSSEHandlers(queryClient);
    const unsubscribes: (() => void)[] = [];

    // Subscribe to all event types
    Object.entries(handlers).forEach(([eventType, handler]) => {
      const unsubscribe = subscribe(eventType, handler);
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [queryClient, subscribe]);

  return { connectionState };
}
