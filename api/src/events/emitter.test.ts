import { afterEach, describe, expect, test } from 'bun:test';

import { clearSubscribers, emit, getSubscriberCount, subscribe } from './emitter.ts';

describe('events emitter', () => {
  afterEach(() => {
    clearSubscribers();
  });

  describe('subscribe', () => {
    test('adds a subscriber', () => {
      const handler = () => {};
      subscribe(handler);
      expect(getSubscriberCount()).toBe(1);
    });

    test('allows multiple subscribers', () => {
      subscribe(() => {});
      subscribe(() => {});
      subscribe(() => {});
      expect(getSubscriberCount()).toBe(3);
    });

    test('returns unsubscribe function', () => {
      const handler = () => {};
      const unsubscribe = subscribe(handler);
      expect(getSubscriberCount()).toBe(1);

      unsubscribe();
      expect(getSubscriberCount()).toBe(0);
    });

    test('unsubscribe is idempotent', () => {
      const handler = () => {};
      const unsubscribe = subscribe(handler);

      unsubscribe();
      unsubscribe();
      expect(getSubscriberCount()).toBe(0);
    });
  });

  describe('emit', () => {
    test('calls all subscribers with event type and payload', () => {
      const received: Array<{ type: string; payload: unknown }> = [];

      subscribe((type, payload) => {
        received.push({ type, payload });
      });

      emit('task.status_changed', {
        workspaceId: 'ws1',
        taskId: 't1',
        taskSummary: 'Test task',
        oldStatus: 'todo',
        newStatus: 'in_progress',
      });

      expect(received).toHaveLength(1);
      expect(received[0]?.type).toBe('task.status_changed');
      expect(received[0]?.payload).toEqual({
        workspaceId: 'ws1',
        taskId: 't1',
        taskSummary: 'Test task',
        oldStatus: 'todo',
        newStatus: 'in_progress',
      });
    });

    test('calls multiple subscribers', () => {
      let callCount = 0;

      subscribe(() => {
        callCount++;
      });
      subscribe(() => {
        callCount++;
      });

      emit('task.comment_added', {
        workspaceId: 'ws1',
        taskId: 't1',
        taskSummary: 'Test task',
        authorName: 'Planner',
      });

      expect(callCount).toBe(2);
    });

    test('ignores errors from handlers', () => {
      let secondHandlerCalled = false;

      subscribe(() => {
        throw new Error('Handler error');
      });
      subscribe(() => {
        secondHandlerCalled = true;
      });

      // Should not throw
      emit('task.error_occurred', {
        workspaceId: 'ws1',
        taskId: 't1',
        taskSummary: 'Test task',
        errorMessage: 'Something went wrong',
      });

      expect(secondHandlerCalled).toBe(true);
    });

    test('works with no subscribers', () => {
      // Should not throw
      emit('agent.execution_started', {
        workspaceId: 'ws1',
        taskId: 't1',
        taskSummary: 'Test task',
        agentName: 'Planner',
      });
    });
  });

  describe('clearSubscribers', () => {
    test('removes all subscribers', () => {
      subscribe(() => {});
      subscribe(() => {});
      subscribe(() => {});
      expect(getSubscriberCount()).toBe(3);

      clearSubscribers();
      expect(getSubscriberCount()).toBe(0);
    });
  });

  describe('event types', () => {
    test('supports task.status_changed event', () => {
      const received: unknown[] = [];
      subscribe((_, payload) => received.push(payload));

      emit('task.status_changed', {
        workspaceId: 'ws1',
        taskId: 't1',
        taskSummary: 'Task summary',
        oldStatus: 'todo',
        newStatus: 'in_progress',
      });

      expect(received).toHaveLength(1);
    });

    test('supports task.comment_added event', () => {
      const received: unknown[] = [];
      subscribe((_, payload) => received.push(payload));

      emit('task.comment_added', {
        workspaceId: 'ws1',
        taskId: 't1',
        taskSummary: 'Task summary',
        authorName: 'Planner',
      });

      expect(received).toHaveLength(1);
    });

    test('supports task.error_occurred event', () => {
      const received: unknown[] = [];
      subscribe((_, payload) => received.push(payload));

      emit('task.error_occurred', {
        workspaceId: 'ws1',
        taskId: 't1',
        taskSummary: 'Task summary',
        errorMessage: 'CLI exited with code 1',
      });

      expect(received).toHaveLength(1);
    });

    test('supports agent.execution_started event', () => {
      const received: unknown[] = [];
      subscribe((_, payload) => received.push(payload));

      emit('agent.execution_started', {
        workspaceId: 'ws1',
        taskId: 't1',
        taskSummary: 'Task summary',
        agentName: 'Implementer',
      });

      expect(received).toHaveLength(1);
    });

    test('supports agent.execution_finished event', () => {
      const received: unknown[] = [];
      subscribe((_, payload) => received.push(payload));

      emit('agent.execution_finished', {
        workspaceId: 'ws1',
        taskId: 't1',
        taskSummary: 'Task summary',
        agentName: 'Implementer',
      });

      expect(received).toHaveLength(1);
    });

    test('supports chat.message_added event', () => {
      const received: unknown[] = [];
      subscribe((_, payload) => received.push(payload));

      emit('chat.message_added', {
        workspaceId: 'ws1',
        chatId: 'c1',
        chatTitle: 'Chat title',
        authorType: 'user',
      });

      expect(received).toHaveLength(1);
    });

    test('supports chat.processing_started event', () => {
      const received: unknown[] = [];
      subscribe((_, payload) => received.push(payload));

      emit('chat.processing_started', {
        workspaceId: 'ws1',
        chatId: 'c1',
        chatTitle: 'Chat title',
        agentName: 'Malamar',
      });

      expect(received).toHaveLength(1);
    });

    test('supports chat.processing_finished event', () => {
      const received: unknown[] = [];
      subscribe((_, payload) => received.push(payload));

      emit('chat.processing_finished', {
        workspaceId: 'ws1',
        chatId: 'c1',
        chatTitle: 'Chat title',
        agentName: 'Malamar',
      });

      expect(received).toHaveLength(1);
    });
  });
});
