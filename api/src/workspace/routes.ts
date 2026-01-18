import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { createWorkspaceSchema, updateWorkspaceSchema } from './schemas.ts';
import * as service from './service.ts';

export const workspaceRoutes = new Hono();

// GET / - List workspaces (supports ?q= for search)
workspaceRoutes.get('/', (c) => {
  const query = c.req.query('q');

  const workspaces = query ? service.searchWorkspaces(query) : service.listWorkspaces();

  return c.json({ data: workspaces });
});

// POST / - Create workspace
workspaceRoutes.post('/', zValidator('json', createWorkspaceSchema), (c) => {
  const input = c.req.valid('json');
  const workspace = service.createWorkspace(input);
  return c.json({ data: workspace }, 201);
});

// GET /:id - Get workspace
workspaceRoutes.get('/:id', (c) => {
  const id = c.req.param('id');
  const workspace = service.getWorkspace(id);
  return c.json({ data: workspace });
});

// PUT /:id - Update workspace
workspaceRoutes.put('/:id', zValidator('json', updateWorkspaceSchema), (c) => {
  const id = c.req.param('id');
  const input = c.req.valid('json');
  const workspace = service.updateWorkspace(id, input);
  return c.json({ data: workspace });
});

// DELETE /:id - Delete workspace
workspaceRoutes.delete('/:id', (c) => {
  const id = c.req.param('id');
  service.deleteWorkspace(id);
  return c.json({ success: true });
});
