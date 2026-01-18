// Routes
export { workspaceRoutes } from './routes.ts';

// Service
export {
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  listWorkspaces,
  searchWorkspaces,
  updateWorkspace,
} from './service.ts';

// Types
export type { CreateWorkspaceInput, UpdateWorkspaceInput, Workspace } from './types.ts';
