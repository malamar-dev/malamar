import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { createAgentSchema, reorderAgentsSchema, updateAgentSchema } from './schemas.ts';
import * as service from './service.ts';

// Routes for agents within workspaces
export const workspaceAgentRoutes = new Hono();

// GET /workspaces/:id/agents - List agents in workspace
workspaceAgentRoutes.get('/:id/agents', (c) => {
  const workspaceId = c.req.param('id');
  const agents = service.listAgents(workspaceId);
  return c.json({ data: agents });
});

// POST /workspaces/:id/agents - Create agent
workspaceAgentRoutes.post('/:id/agents', zValidator('json', createAgentSchema), (c) => {
  const workspaceId = c.req.param('id');
  const input = c.req.valid('json');
  const agent = service.createAgent({ ...input, workspaceId });
  return c.json({ data: agent }, 201);
});

// PUT /workspaces/:id/agents/reorder - Reorder agents
workspaceAgentRoutes.put('/:id/agents/reorder', zValidator('json', reorderAgentsSchema), (c) => {
  const workspaceId = c.req.param('id');
  const { agentIds } = c.req.valid('json');
  service.reorderAgents(workspaceId, agentIds);
  return c.json({ success: true });
});

// Routes for direct agent operations
export const agentRoutes = new Hono();

// PUT /agents/:id - Update agent
agentRoutes.put('/:id', zValidator('json', updateAgentSchema), (c) => {
  const id = c.req.param('id');
  const input = c.req.valid('json');
  const agent = service.updateAgent(id, input);
  return c.json({ data: agent });
});

// DELETE /agents/:id - Delete agent
agentRoutes.delete('/:id', (c) => {
  const id = c.req.param('id');
  service.deleteAgent(id);
  return c.json({ success: true });
});
