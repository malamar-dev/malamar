import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { clearSubscribers, emit } from './emitter.ts';
import {
  addConnection,
  clearConnections,
  formatSseMessage,
  getConnectionCount,
  initSseRegistry,
  shutdownSseRegistry,
  type SseStreamController,
} from './registry.ts';

describe('events registry', () => {
  beforeEach(() => {
    clearSubscribers();
    clearConnections();
    initSseRegistry();
  });

  afterEach(() => {
    shutdownSseRegistry();
    clearSubscribers();
    clearConnections();
  });

  describe('formatSseMessage', () => {
    test('formats event with type and data', () => {
      const message = formatSseMessage('task.status_changed', {
        workspaceId: 'ws1',
        taskId: 't1',
        taskSummary: 'Test task',
        oldStatus: 'todo',
        newStatus: 'in_progress',
      });

      expect(message).toBe(
        'event: task.status_changed\n' +
          'data: {"workspaceId":"ws1","taskId":"t1","taskSummary":"Test task","oldStatus":"todo","newStatus":"in_progress"}\n\n'
      );
    });

    test('handles special characters in payload', () => {
      const message = formatSseMessage('task.comment_added', {
        workspaceId: 'ws1',
        taskId: 't1',
        taskSummary: 'Task with "quotes" and\nnewlines',
        authorName: 'Planner',
      });

      expect(message).toContain('event: task.comment_added\n');
      expect(message).toContain('"taskSummary":"Task with \\"quotes\\" and\\nnewlines"');
    });
  });

  describe('addConnection', () => {
    test('adds a connection and returns cleanup function', () => {
      const messages: string[] = [];
      const controller: SseStreamController = {
        enqueue: (data) => messages.push(data),
        close: () => {},
      };

      const cleanup = addConnection(controller);
      expect(getConnectionCount()).toBe(1);

      cleanup();
      expect(getConnectionCount()).toBe(0);
    });

    test('sends retry hint on connect', () => {
      const messages: string[] = [];
      const controller: SseStreamController = {
        enqueue: (data) => messages.push(data),
        close: () => {},
      };

      addConnection(controller);

      expect(messages[0]).toBe('retry: 3000\n');
    });

    test('sends ok comment on connect', () => {
      const messages: string[] = [];
      const controller: SseStreamController = {
        enqueue: (data) => messages.push(data),
        close: () => {},
      };

      addConnection(controller);

      expect(messages[1]).toBe(': ok\n\n');
    });

    test('handles multiple connections', () => {
      const controller1: SseStreamController = {
        enqueue: () => {},
        close: () => {},
      };
      const controller2: SseStreamController = {
        enqueue: () => {},
        close: () => {},
      };
      const controller3: SseStreamController = {
        enqueue: () => {},
        close: () => {},
      };

      addConnection(controller1);
      addConnection(controller2);
      addConnection(controller3);

      expect(getConnectionCount()).toBe(3);
    });

    test('handles enqueue error on connect gracefully', () => {
      const controller: SseStreamController = {
        enqueue: () => {
          throw new Error('Connection closed');
        },
        close: () => {},
      };

      // Should not throw
      addConnection(controller);

      // Connection should be removed since it failed
      expect(getConnectionCount()).toBe(0);
    });
  });

  describe('broadcast via emit', () => {
    test('broadcasts events to all connections', () => {
      const messages1: string[] = [];
      const messages2: string[] = [];

      addConnection({
        enqueue: (data) => messages1.push(data),
        close: () => {},
      });
      addConnection({
        enqueue: (data) => messages2.push(data),
        close: () => {},
      });

      emit('task.status_changed', {
        workspaceId: 'ws1',
        taskId: 't1',
        taskSummary: 'Test task',
        oldStatus: 'todo',
        newStatus: 'in_progress',
      });

      // Both connections should have received: retry, ok comment, and the event
      expect(messages1).toHaveLength(3);
      expect(messages2).toHaveLength(3);

      expect(messages1[2]).toContain('event: task.status_changed');
      expect(messages2[2]).toContain('event: task.status_changed');
    });

    test('removes dead connections on broadcast', () => {
      let shouldFail = false;

      addConnection({
        enqueue: () => {
          if (shouldFail) {
            throw new Error('Connection closed');
          }
        },
        close: () => {},
      });
      addConnection({
        enqueue: () => {},
        close: () => {},
      });

      expect(getConnectionCount()).toBe(2);

      // Make first connection fail
      shouldFail = true;

      emit('task.comment_added', {
        workspaceId: 'ws1',
        taskId: 't1',
        taskSummary: 'Test task',
        authorName: 'Planner',
      });

      // Dead connection should be removed
      expect(getConnectionCount()).toBe(1);
    });

    test('broadcasts with no connections', () => {
      // Should not throw
      emit('task.error_occurred', {
        workspaceId: 'ws1',
        taskId: 't1',
        taskSummary: 'Test task',
        errorMessage: 'Something went wrong',
      });
    });
  });

  describe('shutdown', () => {
    test('closes all connections on shutdown', () => {
      let closed1 = false;
      let closed2 = false;

      addConnection({
        enqueue: () => {},
        close: () => {
          closed1 = true;
        },
      });
      addConnection({
        enqueue: () => {},
        close: () => {
          closed2 = true;
        },
      });

      expect(getConnectionCount()).toBe(2);

      shutdownSseRegistry();

      expect(closed1).toBe(true);
      expect(closed2).toBe(true);
      expect(getConnectionCount()).toBe(0);
    });

    test('handles close errors gracefully', () => {
      addConnection({
        enqueue: () => {},
        close: () => {
          throw new Error('Close error');
        },
      });

      // Should not throw
      shutdownSseRegistry();
      expect(getConnectionCount()).toBe(0);
    });
  });

  describe('init', () => {
    test('init is idempotent', () => {
      // Already initialized in beforeEach
      initSseRegistry();
      initSseRegistry();

      // Should still work normally
      const messages: string[] = [];
      addConnection({
        enqueue: (data) => messages.push(data),
        close: () => {},
      });

      emit('agent.execution_started', {
        workspaceId: 'ws1',
        taskId: 't1',
        taskSummary: 'Test task',
        agentName: 'Planner',
      });

      // Should only receive one event, not duplicated
      expect(messages.filter((m) => m.includes('agent.execution_started'))).toHaveLength(1);
    });
  });

  describe('event types', () => {
    test('broadcasts task.status_changed events', () => {
      const messages: string[] = [];
      addConnection({
        enqueue: (data) => messages.push(data),
        close: () => {},
      });

      emit('task.status_changed', {
        workspaceId: 'ws1',
        taskId: 't1',
        taskSummary: 'Task summary',
        oldStatus: 'in_progress',
        newStatus: 'in_review',
      });

      expect(messages[2]).toContain('event: task.status_changed');
    });

    test('broadcasts chat.message_added events', () => {
      const messages: string[] = [];
      addConnection({
        enqueue: (data) => messages.push(data),
        close: () => {},
      });

      emit('chat.message_added', {
        workspaceId: 'ws1',
        chatId: 'c1',
        chatTitle: 'Chat title',
        authorType: 'agent',
      });

      expect(messages[2]).toContain('event: chat.message_added');
    });

    test('broadcasts chat.processing_started events', () => {
      const messages: string[] = [];
      addConnection({
        enqueue: (data) => messages.push(data),
        close: () => {},
      });

      emit('chat.processing_started', {
        workspaceId: 'ws1',
        chatId: 'c1',
        chatTitle: 'Chat title',
        agentName: 'Malamar',
      });

      expect(messages[2]).toContain('event: chat.processing_started');
    });

    test('broadcasts chat.processing_finished events', () => {
      const messages: string[] = [];
      addConnection({
        enqueue: (data) => messages.push(data),
        close: () => {},
      });

      emit('chat.processing_finished', {
        workspaceId: 'ws1',
        chatId: 'c1',
        chatTitle: 'Chat title',
        agentName: 'Malamar',
      });

      expect(messages[2]).toContain('event: chat.processing_finished');
    });
  });
});
