import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { createChatSchema, sendMessageSchema, updateChatSchema } from './schemas.ts';
import * as service from './service.ts';

// Routes for chats within workspaces
export const workspaceChatRoutes = new Hono();

// GET /workspaces/:id/chats - List chats (supports ?q= search)
workspaceChatRoutes.get('/:id/chats', (c) => {
  const workspaceId = c.req.param('id');
  const query = c.req.query('q');

  const chats = query ? service.searchChats(workspaceId, query) : service.listChats(workspaceId);

  return c.json({ data: chats });
});

// POST /workspaces/:id/chats - Create chat
workspaceChatRoutes.post('/:id/chats', zValidator('json', createChatSchema), (c) => {
  const workspaceId = c.req.param('id');
  const input = c.req.valid('json');
  const chat = service.createChat({ ...input, workspaceId });
  return c.json({ data: chat }, 201);
});

// Routes for direct chat operations
export const chatRoutes = new Hono();

// GET /chats/:id - Get chat with messages
chatRoutes.get('/:id', (c) => {
  const id = c.req.param('id');
  const chat = service.getChat(id);
  const messages = service.getMessages(id);
  return c.json({ data: { ...chat, messages } });
});

// PUT /chats/:id - Update chat
chatRoutes.put('/:id', zValidator('json', updateChatSchema), (c) => {
  const id = c.req.param('id');
  const input = c.req.valid('json');
  const chat = service.updateChat(id, input);
  return c.json({ data: chat });
});

// DELETE /chats/:id - Delete chat
chatRoutes.delete('/:id', (c) => {
  const id = c.req.param('id');
  service.deleteChat(id);
  return c.json({ success: true });
});

// POST /chats/:id/messages - Send message
chatRoutes.post('/:id/messages', zValidator('json', sendMessageSchema), (c) => {
  const id = c.req.param('id');
  const { content } = c.req.valid('json');
  const message = service.sendMessage(id, content);
  return c.json({ data: message }, 201);
});

// POST /chats/:id/cancel - Cancel processing
chatRoutes.post('/:id/cancel', (c) => {
  const id = c.req.param('id');
  service.cancelProcessing(id);
  return c.json({ success: true });
});

// POST /chats/:id/attachments - Upload attachment (placeholder)
chatRoutes.post('/:id/attachments', async (c) => {
  const id = c.req.param('id');
  // Verify chat exists
  service.getChat(id);

  // TODO: Implement file attachment handling
  // Store files in /tmp/malamar_chat_{chat_id}_attachments/
  // Add system message noting file path

  return c.json({ message: 'File attachment support coming soon' }, 501);
});
