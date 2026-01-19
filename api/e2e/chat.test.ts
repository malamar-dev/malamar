import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import type { Agent } from '../src/agent/types.ts';
import type { Chat, ChatMessage } from '../src/chat/types.ts';
import type { Workspace } from '../src/workspace/types.ts';
import {
  del,
  get,
  getDb,
  post,
  put,
  resetDbConnection,
  startServer,
  stopServer,
} from './helpers/index.ts';

interface ChatResponse {
  data: Chat;
}

interface ChatWithMessagesResponse {
  data: Chat & { messages: ChatMessage[] };
}

interface ChatListResponse {
  data: Chat[];
}

interface ChatMessageResponse {
  data: ChatMessage;
}

interface WorkspaceResponse {
  data: Workspace;
}

interface AgentResponse {
  data: Agent;
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

interface SuccessResponse {
  success: boolean;
}

describe('Chat E2E Tests', () => {
  let testWorkspaceId: string;
  let testAgentId: string;

  beforeAll(async () => {
    await startServer();

    // Create a workspace for chat tests
    const { data: wsData } = await post<WorkspaceResponse>('/api/workspaces', {
      title: 'Chat Test Workspace',
    });
    testWorkspaceId = wsData.data.id;

    // Create an agent for chat tests
    const { data: agentData } = await post<AgentResponse>(
      `/api/workspaces/${testWorkspaceId}/agents`,
      {
        name: 'Test Agent',
        instruction: 'Test instruction',
        cliType: 'claude',
      }
    );
    testAgentId = agentData.data.id;
  });

  afterAll(async () => {
    await stopServer();
  });

  describe('POST /api/workspaces/:id/chats', () => {
    test('should create a chat with default title', async () => {
      const { status, data } = await post<ChatResponse>(
        `/api/workspaces/${testWorkspaceId}/chats`,
        {}
      );

      expect(status).toBe(201);
      expect(data.data.id).toBeDefined();
      expect(data.data.workspaceId).toBe(testWorkspaceId);
      expect(data.data.title).toBe('New Chat');
      expect(data.data.agentId).toBeNull();
      expect(data.data.cliType).toBeNull();
    });

    test('should create a chat with custom title', async () => {
      const { status, data } = await post<ChatResponse>(
        `/api/workspaces/${testWorkspaceId}/chats`,
        {
          title: 'Custom Chat Title',
        }
      );

      expect(status).toBe(201);
      expect(data.data.title).toBe('Custom Chat Title');
    });

    test('should create a chat with agent', async () => {
      const { status, data } = await post<ChatResponse>(
        `/api/workspaces/${testWorkspaceId}/chats`,
        {
          agentId: testAgentId,
        }
      );

      expect(status).toBe(201);
      expect(data.data.agentId).toBe(testAgentId);
    });

    test('should create a chat with CLI type', async () => {
      const { status, data } = await post<ChatResponse>(
        `/api/workspaces/${testWorkspaceId}/chats`,
        {
          cliType: 'claude',
        }
      );

      expect(status).toBe(201);
      expect(data.data.cliType).toBe('claude');
    });

    test('should create a chat with all options', async () => {
      const { status, data } = await post<ChatResponse>(
        `/api/workspaces/${testWorkspaceId}/chats`,
        {
          title: 'Full Options Chat',
          agentId: testAgentId,
          cliType: 'claude',
        }
      );

      expect(status).toBe(201);
      expect(data.data.title).toBe('Full Options Chat');
      expect(data.data.agentId).toBe(testAgentId);
      expect(data.data.cliType).toBe('claude');
    });

    test('should fail with invalid CLI type', async () => {
      const { status } = await post<unknown>(`/api/workspaces/${testWorkspaceId}/chats`, {
        cliType: 'invalid_cli',
      });

      expect(status).toBe(400);
    });

    test('should verify chat exists in database', async () => {
      const { data: createData } = await post<ChatResponse>(
        `/api/workspaces/${testWorkspaceId}/chats`,
        {
          title: 'DB Verify Chat',
        }
      );

      resetDbConnection();
      const db = getDb();
      const row = db
        .query<{ id: string; title: string; workspace_id: string }, [string]>(
          'SELECT id, title, workspace_id FROM chats WHERE id = ?'
        )
        .get(createData.data.id);

      expect(row).not.toBeNull();
      expect(row?.title).toBe('DB Verify Chat');
      expect(row?.workspace_id).toBe(testWorkspaceId);
    });
  });

  describe('GET /api/workspaces/:id/chats', () => {
    test('should list chats in workspace', async () => {
      // Create a fresh workspace with known chats
      const { data: wsData } = await post<WorkspaceResponse>('/api/workspaces', {
        title: 'List Chats Workspace',
      });
      const workspaceId = wsData.data.id;

      // Create chats
      await post<ChatResponse>(`/api/workspaces/${workspaceId}/chats`, {
        title: 'List Chat 1',
      });
      await post<ChatResponse>(`/api/workspaces/${workspaceId}/chats`, {
        title: 'List Chat 2',
      });

      const { status, data } = await get<ChatListResponse>(`/api/workspaces/${workspaceId}/chats`);

      expect(status).toBe(200);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(2);
      expect(data.data.some((c) => c.title === 'List Chat 1')).toBe(true);
      expect(data.data.some((c) => c.title === 'List Chat 2')).toBe(true);

      // Clean up
      await del(`/api/workspaces/${workspaceId}`);
    });

    test('should return empty array for workspace with no chats', async () => {
      // Create a fresh workspace
      const { data: wsData } = await post<WorkspaceResponse>('/api/workspaces', {
        title: 'Empty Chats Workspace',
      });
      const workspaceId = wsData.data.id;

      const { status, data } = await get<ChatListResponse>(`/api/workspaces/${workspaceId}/chats`);

      expect(status).toBe(200);
      expect(data.data.length).toBe(0);

      // Clean up
      await del(`/api/workspaces/${workspaceId}`);
    });

    test('should search chats by title', async () => {
      // Create a fresh workspace with known chats
      const { data: wsData } = await post<WorkspaceResponse>('/api/workspaces', {
        title: 'Search Chats Workspace',
      });
      const workspaceId = wsData.data.id;

      // Create chats
      await post<ChatResponse>(`/api/workspaces/${workspaceId}/chats`, {
        title: 'Alpha Chat',
      });
      await post<ChatResponse>(`/api/workspaces/${workspaceId}/chats`, {
        title: 'Beta Chat',
      });
      await post<ChatResponse>(`/api/workspaces/${workspaceId}/chats`, {
        title: 'Alpha Discussion',
      });

      // Search for "Alpha"
      const { status, data } = await get<ChatListResponse>(
        `/api/workspaces/${workspaceId}/chats?q=Alpha`
      );

      expect(status).toBe(200);
      expect(data.data.length).toBe(2);
      expect(data.data.some((c) => c.title === 'Alpha Chat')).toBe(true);
      expect(data.data.some((c) => c.title === 'Alpha Discussion')).toBe(true);
      expect(data.data.some((c) => c.title === 'Beta Chat')).toBe(false);

      // Clean up
      await del(`/api/workspaces/${workspaceId}`);
    });

    test('should return empty array for search with no matches', async () => {
      // Create a fresh workspace with known chats
      const { data: wsData } = await post<WorkspaceResponse>('/api/workspaces', {
        title: 'No Match Chats Workspace',
      });
      const workspaceId = wsData.data.id;

      // Create chats
      await post<ChatResponse>(`/api/workspaces/${workspaceId}/chats`, {
        title: 'Hello Chat',
      });

      // Search for non-matching term
      const { status, data } = await get<ChatListResponse>(
        `/api/workspaces/${workspaceId}/chats?q=NonExistent`
      );

      expect(status).toBe(200);
      expect(data.data.length).toBe(0);

      // Clean up
      await del(`/api/workspaces/${workspaceId}`);
    });
  });

  describe('GET /api/chats/:id', () => {
    test('should get a chat by id with empty messages', async () => {
      const { data: createData } = await post<ChatResponse>(
        `/api/workspaces/${testWorkspaceId}/chats`,
        {
          title: 'Get By ID Chat',
        }
      );

      const { status, data } = await get<ChatWithMessagesResponse>(
        `/api/chats/${createData.data.id}`
      );

      expect(status).toBe(200);
      expect(data.data.id).toBe(createData.data.id);
      expect(data.data.title).toBe('Get By ID Chat');
      expect(Array.isArray(data.data.messages)).toBe(true);
      expect(data.data.messages.length).toBe(0);
    });

    test('should return 404 for non-existent chat', async () => {
      const { status, data } = await get<ErrorResponse>('/api/chats/nonexistent-id');

      expect(status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/chats/:id', () => {
    test('should update chat title', async () => {
      const { data: createData } = await post<ChatResponse>(
        `/api/workspaces/${testWorkspaceId}/chats`,
        {
          title: 'Original Title',
        }
      );

      const { status, data } = await put<ChatResponse>(`/api/chats/${createData.data.id}`, {
        title: 'Updated Title',
      });

      expect(status).toBe(200);
      expect(data.data.title).toBe('Updated Title');
    });

    test('should update chat agent', async () => {
      const { data: createData } = await post<ChatResponse>(
        `/api/workspaces/${testWorkspaceId}/chats`,
        {}
      );

      const { status, data } = await put<ChatResponse>(`/api/chats/${createData.data.id}`, {
        agentId: testAgentId,
      });

      expect(status).toBe(200);
      expect(data.data.agentId).toBe(testAgentId);
    });

    test('should update chat CLI type', async () => {
      const { data: createData } = await post<ChatResponse>(
        `/api/workspaces/${testWorkspaceId}/chats`,
        {}
      );

      const { status, data } = await put<ChatResponse>(`/api/chats/${createData.data.id}`, {
        cliType: 'gemini',
      });

      expect(status).toBe(200);
      expect(data.data.cliType).toBe('gemini');
    });

    test('should clear chat agent by setting to null', async () => {
      const { data: createData } = await post<ChatResponse>(
        `/api/workspaces/${testWorkspaceId}/chats`,
        {
          agentId: testAgentId,
        }
      );

      const { status, data } = await put<ChatResponse>(`/api/chats/${createData.data.id}`, {
        agentId: null,
      });

      expect(status).toBe(200);
      expect(data.data.agentId).toBeNull();
    });

    test('should clear chat CLI type by setting to null', async () => {
      const { data: createData } = await post<ChatResponse>(
        `/api/workspaces/${testWorkspaceId}/chats`,
        {
          cliType: 'claude',
        }
      );

      const { status, data } = await put<ChatResponse>(`/api/chats/${createData.data.id}`, {
        cliType: null,
      });

      expect(status).toBe(200);
      expect(data.data.cliType).toBeNull();
    });

    test('should update multiple fields', async () => {
      const { data: createData } = await post<ChatResponse>(
        `/api/workspaces/${testWorkspaceId}/chats`,
        {}
      );

      const { status, data } = await put<ChatResponse>(`/api/chats/${createData.data.id}`, {
        title: 'Multi Update Title',
        agentId: testAgentId,
        cliType: 'claude',
      });

      expect(status).toBe(200);
      expect(data.data.title).toBe('Multi Update Title');
      expect(data.data.agentId).toBe(testAgentId);
      expect(data.data.cliType).toBe('claude');
    });

    test('should return 404 for non-existent chat', async () => {
      const { status, data } = await put<ErrorResponse>('/api/chats/nonexistent-id', {
        title: 'New Title',
      });

      expect(status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    test('should fail with invalid CLI type', async () => {
      const { data: createData } = await post<ChatResponse>(
        `/api/workspaces/${testWorkspaceId}/chats`,
        {}
      );

      const { status } = await put<unknown>(`/api/chats/${createData.data.id}`, {
        cliType: 'invalid_cli',
      });

      expect(status).toBe(400);
    });
  });

  describe('DELETE /api/chats/:id', () => {
    test('should delete a chat', async () => {
      const { data: createData } = await post<ChatResponse>(
        `/api/workspaces/${testWorkspaceId}/chats`,
        {
          title: 'To Be Deleted',
        }
      );

      const { status, data } = await del<SuccessResponse>(`/api/chats/${createData.data.id}`);

      expect(status).toBe(200);
      expect(data.success).toBe(true);

      // Verify it's gone from database
      resetDbConnection();
      const db = getDb();
      const row = db
        .query<{ id: string }, [string]>('SELECT id FROM chats WHERE id = ?')
        .get(createData.data.id);
      expect(row).toBeNull();
    });

    test('should return 404 for non-existent chat', async () => {
      const { status, data } = await del<ErrorResponse>('/api/chats/nonexistent-id');

      expect(status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    test('should cascade delete chat messages', async () => {
      const { data: createData } = await post<ChatResponse>(
        `/api/workspaces/${testWorkspaceId}/chats`,
        {
          title: 'Chat with Messages',
        }
      );

      // Add a message
      await post<ChatMessageResponse>(`/api/chats/${createData.data.id}/messages`, {
        content: 'Test message',
      });

      // Verify message exists
      resetDbConnection();
      const dbBefore = getDb();
      const messageBefore = dbBefore
        .query<{ id: string }, [string]>('SELECT id FROM chat_messages WHERE chat_id = ?')
        .get(createData.data.id);
      expect(messageBefore).not.toBeNull();

      // Delete chat
      await del(`/api/chats/${createData.data.id}`);

      // Verify message is deleted
      resetDbConnection();
      const dbAfter = getDb();
      const messageAfter = dbAfter
        .query<{ id: string }, [string]>('SELECT id FROM chat_messages WHERE chat_id = ?')
        .get(createData.data.id);
      expect(messageAfter).toBeNull();
    });

    test('should cascade delete chat queue item', async () => {
      const { data: createData } = await post<ChatResponse>(
        `/api/workspaces/${testWorkspaceId}/chats`,
        {
          title: 'Chat with Queue Item',
        }
      );

      // Add a message (which creates a queue item)
      await post<ChatMessageResponse>(`/api/chats/${createData.data.id}/messages`, {
        content: 'Test message',
      });

      // Verify queue item exists
      resetDbConnection();
      const dbBefore = getDb();
      const queueBefore = dbBefore
        .query<{ id: string }, [string]>('SELECT id FROM chat_queue WHERE chat_id = ?')
        .get(createData.data.id);
      expect(queueBefore).not.toBeNull();

      // Delete chat
      await del(`/api/chats/${createData.data.id}`);

      // Verify queue item is deleted
      resetDbConnection();
      const dbAfter = getDb();
      const queueAfter = dbAfter
        .query<{ id: string }, [string]>('SELECT id FROM chat_queue WHERE chat_id = ?')
        .get(createData.data.id);
      expect(queueAfter).toBeNull();
    });
  });

  describe('POST /api/chats/:id/messages', () => {
    test('should send a message to a chat', async () => {
      const { data: createData } = await post<ChatResponse>(
        `/api/workspaces/${testWorkspaceId}/chats`,
        {
          title: 'Message Chat',
        }
      );

      const { status, data } = await post<ChatMessageResponse>(
        `/api/chats/${createData.data.id}/messages`,
        {
          content: 'Hello, this is a test message',
        }
      );

      expect(status).toBe(201);
      expect(data.data.message).toBe('Hello, this is a test message');
      expect(data.data.chatId).toBe(createData.data.id);
      expect(data.data.role).toBe('user');
      expect(data.data.id).toBeDefined();
    });

    test('should fail without content', async () => {
      const { data: createData } = await post<ChatResponse>(
        `/api/workspaces/${testWorkspaceId}/chats`,
        {}
      );

      const { status } = await post<unknown>(`/api/chats/${createData.data.id}/messages`, {});

      expect(status).toBe(400);
    });

    test('should fail with empty content', async () => {
      const { data: createData } = await post<ChatResponse>(
        `/api/workspaces/${testWorkspaceId}/chats`,
        {}
      );

      const { status } = await post<unknown>(`/api/chats/${createData.data.id}/messages`, {
        content: '',
      });

      expect(status).toBe(400);
    });

    test('should return 404 for non-existent chat', async () => {
      const { status, data } = await post<ErrorResponse>('/api/chats/nonexistent-id/messages', {
        content: 'Test message',
      });

      expect(status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    test('should verify message exists in database', async () => {
      const { data: chatData } = await post<ChatResponse>(
        `/api/workspaces/${testWorkspaceId}/chats`,
        {
          title: 'DB Verify Message Chat',
        }
      );

      const { data: messageData } = await post<ChatMessageResponse>(
        `/api/chats/${chatData.data.id}/messages`,
        {
          content: 'DB verify message',
        }
      );

      resetDbConnection();
      const db = getDb();
      const row = db
        .query<{ id: string; message: string; role: string }, [string]>(
          'SELECT id, message, role FROM chat_messages WHERE id = ?'
        )
        .get(messageData.data.id);

      expect(row).not.toBeNull();
      expect(row?.message).toBe('DB verify message');
      expect(row?.role).toBe('user');
    });

    test('should create chat queue item when sending message', async () => {
      const { data: chatData } = await post<ChatResponse>(
        `/api/workspaces/${testWorkspaceId}/chats`,
        {
          title: 'Queue Item Message Chat',
        }
      );

      await post<ChatMessageResponse>(`/api/chats/${chatData.data.id}/messages`, {
        content: 'Message that creates queue item',
      });

      resetDbConnection();
      const db = getDb();
      const row = db
        .query<{ id: string; chat_id: string; status: string }, [string]>(
          'SELECT id, chat_id, status FROM chat_queue WHERE chat_id = ?'
        )
        .get(chatData.data.id);

      expect(row).not.toBeNull();
      expect(row?.chat_id).toBe(chatData.data.id);
      expect(row?.status).toBe('queued');
    });
  });

  describe('GET /api/chats/:id (with messages)', () => {
    test('should return chat with messages', async () => {
      const { data: chatData } = await post<ChatResponse>(
        `/api/workspaces/${testWorkspaceId}/chats`,
        {
          title: 'Chat with Messages',
        }
      );

      // Send multiple messages
      await post<ChatMessageResponse>(`/api/chats/${chatData.data.id}/messages`, {
        content: 'First message',
      });
      await post<ChatMessageResponse>(`/api/chats/${chatData.data.id}/messages`, {
        content: 'Second message',
      });

      const { status, data } = await get<ChatWithMessagesResponse>(
        `/api/chats/${chatData.data.id}`
      );

      expect(status).toBe(200);
      expect(data.data.id).toBe(chatData.data.id);
      expect(Array.isArray(data.data.messages)).toBe(true);
      expect(data.data.messages.length).toBe(2);
      expect(data.data.messages.some((m) => m.message === 'First message')).toBe(true);
      expect(data.data.messages.some((m) => m.message === 'Second message')).toBe(true);
    });
  });

  describe('POST /api/chats/:id/cancel', () => {
    test('should cancel chat processing', async () => {
      const { data: chatData } = await post<ChatResponse>(
        `/api/workspaces/${testWorkspaceId}/chats`,
        {
          title: 'Cancel Chat',
        }
      );

      // Send a message first to create queue item
      await post<ChatMessageResponse>(`/api/chats/${chatData.data.id}/messages`, {
        content: 'Message to cancel',
      });

      const { status, data } = await post<SuccessResponse>(
        `/api/chats/${chatData.data.id}/cancel`
      );

      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });

    test('should handle cancel on chat without queue item', async () => {
      const { data: chatData } = await post<ChatResponse>(
        `/api/workspaces/${testWorkspaceId}/chats`,
        {
          title: 'Chat Without Queue Item',
        }
      );
      // Don't send any messages - no queue item exists

      const { status, data } = await post<SuccessResponse>(
        `/api/chats/${chatData.data.id}/cancel`
      );

      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });

    test('should return 404 for non-existent chat', async () => {
      const { status, data } = await post<ErrorResponse>('/api/chats/nonexistent-id/cancel');

      expect(status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/chats/:id/attachments', () => {
    test('should return 400 for invalid form data (non-multipart request)', async () => {
      const { data: chatData } = await post<ChatResponse>(
        `/api/workspaces/${testWorkspaceId}/chats`,
        {
          title: 'Attachment Test Chat',
        }
      );

      const { status, data } = await post<ErrorResponse>(
        `/api/chats/${chatData.data.id}/attachments`,
        {}
      );

      expect(status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    test('should return 404 for non-existent chat', async () => {
      const { status, data } = await post<ErrorResponse>(
        '/api/chats/nonexistent-id/attachments',
        {}
      );

      expect(status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Cascade Delete', () => {
    test('should delete chats when workspace is deleted', async () => {
      // Create a workspace
      const { data: wsData } = await post<WorkspaceResponse>('/api/workspaces', {
        title: 'Cascade Delete Chat Workspace',
      });
      const workspaceId = wsData.data.id;

      // Create a chat
      const { data: chatData } = await post<ChatResponse>(`/api/workspaces/${workspaceId}/chats`, {
        title: 'Cascade Chat',
      });
      const chatId = chatData.data.id;

      // Verify chat exists
      resetDbConnection();
      const dbBefore = getDb();
      const chatBefore = dbBefore
        .query<{ id: string }, [string]>('SELECT id FROM chats WHERE id = ?')
        .get(chatId);
      expect(chatBefore).not.toBeNull();

      // Delete workspace
      await del(`/api/workspaces/${workspaceId}`);

      // Verify chat is deleted
      resetDbConnection();
      const dbAfter = getDb();
      const chatAfter = dbAfter
        .query<{ id: string }, [string]>('SELECT id FROM chats WHERE id = ?')
        .get(chatId);
      expect(chatAfter).toBeNull();
    });

    test('should delete chat messages when workspace is deleted', async () => {
      // Create a workspace
      const { data: wsData } = await post<WorkspaceResponse>('/api/workspaces', {
        title: 'Cascade Messages Workspace',
      });
      const workspaceId = wsData.data.id;

      // Create a chat
      const { data: chatData } = await post<ChatResponse>(`/api/workspaces/${workspaceId}/chats`, {
        title: 'Chat with Messages for Cascade',
      });

      // Add a message
      const { data: messageData } = await post<ChatMessageResponse>(
        `/api/chats/${chatData.data.id}/messages`,
        {
          content: 'Cascade test message',
        }
      );
      const messageId = messageData.data.id;

      // Verify message exists
      resetDbConnection();
      const dbBefore = getDb();
      const messageBefore = dbBefore
        .query<{ id: string }, [string]>('SELECT id FROM chat_messages WHERE id = ?')
        .get(messageId);
      expect(messageBefore).not.toBeNull();

      // Delete workspace
      await del(`/api/workspaces/${workspaceId}`);

      // Verify message is deleted
      resetDbConnection();
      const dbAfter = getDb();
      const messageAfter = dbAfter
        .query<{ id: string }, [string]>('SELECT id FROM chat_messages WHERE id = ?')
        .get(messageId);
      expect(messageAfter).toBeNull();
    });
  });
});
