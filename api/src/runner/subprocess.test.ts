import type { Subprocess } from 'bun';
import { afterEach, describe, expect, test } from 'bun:test';

import {
  clearAllTracking,
  getChatProcess,
  getChatProcessCount,
  getTaskProcess,
  getTaskProcessCount,
  getTotalProcessCount,
  hasChatProcess,
  hasTaskProcess,
  killAllProcesses,
  killChatProcess,
  killTaskProcess,
  killWorkspaceProcesses,
  trackChatProcess,
  trackTaskProcess,
  untrackChatProcess,
  untrackTaskProcess,
} from './subprocess.ts';

/**
 * Create a mock subprocess for testing
 */
function createMockSubprocess(options?: { killed?: boolean }): Subprocess {
  let isKilled = options?.killed ?? false;

  return {
    pid: Math.floor(Math.random() * 100000),
    kill: () => {
      if (isKilled) {
        throw new Error('Process already killed');
      }
      isKilled = true;
    },
    killed: isKilled,
    stdin: null,
    stdout: null,
    stderr: null,
    exitCode: null,
    signalCode: null,
    exited: Promise.resolve(0),
    resourceUsage: () => null,
    ref: () => {},
    unref: () => {},
  } as unknown as Subprocess;
}

describe('subprocess tracking', () => {
  afterEach(() => {
    clearAllTracking();
  });

  describe('trackTaskProcess', () => {
    test('tracks a task subprocess', () => {
      const proc = createMockSubprocess();
      trackTaskProcess('task-1', 'ws-1', proc);

      expect(hasTaskProcess('task-1')).toBe(true);
      expect(getTaskProcess('task-1')).toBe(proc);
      expect(getTaskProcessCount()).toBe(1);
    });

    test('replaces existing subprocess for same task', () => {
      const proc1 = createMockSubprocess();
      const proc2 = createMockSubprocess();

      trackTaskProcess('task-1', 'ws-1', proc1);
      trackTaskProcess('task-1', 'ws-1', proc2);

      expect(hasTaskProcess('task-1')).toBe(true);
      expect(getTaskProcess('task-1')).toBe(proc2);
      expect(getTaskProcessCount()).toBe(1);
    });

    test('tracks multiple task subprocesses', () => {
      const proc1 = createMockSubprocess();
      const proc2 = createMockSubprocess();

      trackTaskProcess('task-1', 'ws-1', proc1);
      trackTaskProcess('task-2', 'ws-1', proc2);

      expect(hasTaskProcess('task-1')).toBe(true);
      expect(hasTaskProcess('task-2')).toBe(true);
      expect(getTaskProcessCount()).toBe(2);
    });
  });

  describe('trackChatProcess', () => {
    test('tracks a chat subprocess', () => {
      const proc = createMockSubprocess();
      trackChatProcess('chat-1', 'ws-1', proc);

      expect(hasChatProcess('chat-1')).toBe(true);
      expect(getChatProcess('chat-1')).toBe(proc);
      expect(getChatProcessCount()).toBe(1);
    });

    test('replaces existing subprocess for same chat', () => {
      const proc1 = createMockSubprocess();
      const proc2 = createMockSubprocess();

      trackChatProcess('chat-1', 'ws-1', proc1);
      trackChatProcess('chat-1', 'ws-1', proc2);

      expect(hasChatProcess('chat-1')).toBe(true);
      expect(getChatProcess('chat-1')).toBe(proc2);
      expect(getChatProcessCount()).toBe(1);
    });

    test('tracks multiple chat subprocesses', () => {
      const proc1 = createMockSubprocess();
      const proc2 = createMockSubprocess();

      trackChatProcess('chat-1', 'ws-1', proc1);
      trackChatProcess('chat-2', 'ws-1', proc2);

      expect(hasChatProcess('chat-1')).toBe(true);
      expect(hasChatProcess('chat-2')).toBe(true);
      expect(getChatProcessCount()).toBe(2);
    });
  });

  describe('killTaskProcess', () => {
    test('kills and untracks a task subprocess', () => {
      const proc = createMockSubprocess();
      trackTaskProcess('task-1', 'ws-1', proc);

      const result = killTaskProcess('task-1');

      expect(result).toBe(true);
      expect(hasTaskProcess('task-1')).toBe(false);
      expect(getTaskProcessCount()).toBe(0);
    });

    test('returns false for non-existent task', () => {
      const result = killTaskProcess('task-nonexistent');
      expect(result).toBe(false);
    });

    test('handles already-killed process gracefully', () => {
      const proc = createMockSubprocess({ killed: true });
      trackTaskProcess('task-1', 'ws-1', proc);

      // Should not throw even if kill() throws
      const result = killTaskProcess('task-1');

      expect(result).toBe(true);
      expect(hasTaskProcess('task-1')).toBe(false);
    });
  });

  describe('killChatProcess', () => {
    test('kills and untracks a chat subprocess', () => {
      const proc = createMockSubprocess();
      trackChatProcess('chat-1', 'ws-1', proc);

      const result = killChatProcess('chat-1');

      expect(result).toBe(true);
      expect(hasChatProcess('chat-1')).toBe(false);
      expect(getChatProcessCount()).toBe(0);
    });

    test('returns false for non-existent chat', () => {
      const result = killChatProcess('chat-nonexistent');
      expect(result).toBe(false);
    });

    test('handles already-killed process gracefully', () => {
      const proc = createMockSubprocess({ killed: true });
      trackChatProcess('chat-1', 'ws-1', proc);

      const result = killChatProcess('chat-1');

      expect(result).toBe(true);
      expect(hasChatProcess('chat-1')).toBe(false);
    });
  });

  describe('killWorkspaceProcesses', () => {
    test('kills all processes for a workspace', () => {
      const proc1 = createMockSubprocess();
      const proc2 = createMockSubprocess();
      const proc3 = createMockSubprocess();

      trackTaskProcess('task-1', 'ws-1', proc1);
      trackTaskProcess('task-2', 'ws-1', proc2);
      trackChatProcess('chat-1', 'ws-1', proc3);

      const count = killWorkspaceProcesses('ws-1');

      expect(count).toBe(3);
      expect(hasTaskProcess('task-1')).toBe(false);
      expect(hasTaskProcess('task-2')).toBe(false);
      expect(hasChatProcess('chat-1')).toBe(false);
      expect(getTotalProcessCount()).toBe(0);
    });

    test('only kills processes for specified workspace', () => {
      const proc1 = createMockSubprocess();
      const proc2 = createMockSubprocess();
      const proc3 = createMockSubprocess();

      trackTaskProcess('task-1', 'ws-1', proc1);
      trackTaskProcess('task-2', 'ws-2', proc2);
      trackChatProcess('chat-1', 'ws-1', proc3);

      const count = killWorkspaceProcesses('ws-1');

      expect(count).toBe(2);
      expect(hasTaskProcess('task-1')).toBe(false);
      expect(hasTaskProcess('task-2')).toBe(true);
      expect(hasChatProcess('chat-1')).toBe(false);
      expect(getTotalProcessCount()).toBe(1);
    });

    test('returns 0 for workspace with no processes', () => {
      trackTaskProcess('task-1', 'ws-1', createMockSubprocess());

      const count = killWorkspaceProcesses('ws-nonexistent');

      expect(count).toBe(0);
      expect(getTotalProcessCount()).toBe(1);
    });
  });

  describe('killAllProcesses', () => {
    test('kills all tracked processes', () => {
      trackTaskProcess('task-1', 'ws-1', createMockSubprocess());
      trackTaskProcess('task-2', 'ws-2', createMockSubprocess());
      trackChatProcess('chat-1', 'ws-1', createMockSubprocess());
      trackChatProcess('chat-2', 'ws-3', createMockSubprocess());

      const count = killAllProcesses();

      expect(count).toBe(4);
      expect(getTotalProcessCount()).toBe(0);
    });

    test('returns 0 when no processes are tracked', () => {
      const count = killAllProcesses();
      expect(count).toBe(0);
    });
  });

  describe('untrackTaskProcess', () => {
    test('removes tracking without killing', () => {
      const proc = createMockSubprocess();
      trackTaskProcess('task-1', 'ws-1', proc);

      untrackTaskProcess('task-1');

      expect(hasTaskProcess('task-1')).toBe(false);
      expect(getTaskProcessCount()).toBe(0);
      // Process should still be accessible if we had a reference (not killed)
    });

    test('handles non-existent task gracefully', () => {
      // Should not throw
      untrackTaskProcess('task-nonexistent');
    });
  });

  describe('untrackChatProcess', () => {
    test('removes tracking without killing', () => {
      const proc = createMockSubprocess();
      trackChatProcess('chat-1', 'ws-1', proc);

      untrackChatProcess('chat-1');

      expect(hasChatProcess('chat-1')).toBe(false);
      expect(getChatProcessCount()).toBe(0);
    });

    test('handles non-existent chat gracefully', () => {
      // Should not throw
      untrackChatProcess('chat-nonexistent');
    });
  });

  describe('hasTaskProcess', () => {
    test('returns true for tracked task', () => {
      trackTaskProcess('task-1', 'ws-1', createMockSubprocess());
      expect(hasTaskProcess('task-1')).toBe(true);
    });

    test('returns false for untracked task', () => {
      expect(hasTaskProcess('task-nonexistent')).toBe(false);
    });
  });

  describe('hasChatProcess', () => {
    test('returns true for tracked chat', () => {
      trackChatProcess('chat-1', 'ws-1', createMockSubprocess());
      expect(hasChatProcess('chat-1')).toBe(true);
    });

    test('returns false for untracked chat', () => {
      expect(hasChatProcess('chat-nonexistent')).toBe(false);
    });
  });

  describe('getTaskProcess', () => {
    test('returns subprocess for tracked task', () => {
      const proc = createMockSubprocess();
      trackTaskProcess('task-1', 'ws-1', proc);
      expect(getTaskProcess('task-1')).toBe(proc);
    });

    test('returns undefined for untracked task', () => {
      expect(getTaskProcess('task-nonexistent')).toBeUndefined();
    });
  });

  describe('getChatProcess', () => {
    test('returns subprocess for tracked chat', () => {
      const proc = createMockSubprocess();
      trackChatProcess('chat-1', 'ws-1', proc);
      expect(getChatProcess('chat-1')).toBe(proc);
    });

    test('returns undefined for untracked chat', () => {
      expect(getChatProcess('chat-nonexistent')).toBeUndefined();
    });
  });

  describe('getTaskProcessCount', () => {
    test('returns 0 when no tasks are tracked', () => {
      expect(getTaskProcessCount()).toBe(0);
    });

    test('returns correct count', () => {
      trackTaskProcess('task-1', 'ws-1', createMockSubprocess());
      trackTaskProcess('task-2', 'ws-1', createMockSubprocess());
      expect(getTaskProcessCount()).toBe(2);
    });
  });

  describe('getChatProcessCount', () => {
    test('returns 0 when no chats are tracked', () => {
      expect(getChatProcessCount()).toBe(0);
    });

    test('returns correct count', () => {
      trackChatProcess('chat-1', 'ws-1', createMockSubprocess());
      trackChatProcess('chat-2', 'ws-1', createMockSubprocess());
      expect(getChatProcessCount()).toBe(2);
    });
  });

  describe('getTotalProcessCount', () => {
    test('returns 0 when nothing is tracked', () => {
      expect(getTotalProcessCount()).toBe(0);
    });

    test('returns combined count of tasks and chats', () => {
      trackTaskProcess('task-1', 'ws-1', createMockSubprocess());
      trackTaskProcess('task-2', 'ws-1', createMockSubprocess());
      trackChatProcess('chat-1', 'ws-1', createMockSubprocess());

      expect(getTotalProcessCount()).toBe(3);
    });
  });

  describe('clearAllTracking', () => {
    test('clears all tracking data', () => {
      trackTaskProcess('task-1', 'ws-1', createMockSubprocess());
      trackChatProcess('chat-1', 'ws-1', createMockSubprocess());

      clearAllTracking();

      expect(getTaskProcessCount()).toBe(0);
      expect(getChatProcessCount()).toBe(0);
      expect(getTotalProcessCount()).toBe(0);
    });
  });
});
