# UI Implementation TODO

This document outlines the complete implementation plan for the Malamar UI. Each TODO item is scoped for one commit and contains enough detail for autonomous agent execution.

---

## Agent Instructions

Before working on any TODO item, read and follow these guidelines.

### Specs References

Always read the relevant specs before implementing. Specs are located at `/Users/irvingdinh/Workspace/github.com/malamar-dev/specs/`:

| Document | Purpose |
|----------|---------|
| `SPECS.md` | Product behavior, features, UX (WHAT and WHY) |
| `TECHNICAL_DESIGN.md` | Architecture, APIs, data models, UI implementation details (HOW) |
| `MEETING-MINUTES/SESSION-013.md` | Frontend folder structure, component patterns, conventions |

### Key Decisions

These decisions were made during planning and should be followed:

1. **Scope**: UI/frontend only. API is implemented separately and assumed to be running.
2. **Testing**: No tests for initial development. Focus on getting the app working first.
3. **Mobile-First**: All components built mobile-first from the start. Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`) to scale up.
4. **shadcn/ui**: Batch install all needed components upfront. Use `bunx --bun shadcn@latest add <component>`.
5. **Commit Granularity**: Group by logical unit (not per-file). Each TODO = one commit.
6. **Modals**: Task detail, chat detail, agent create/edit, workspace create all use modal pattern. Modals are full-screen styled on mobile.
7. **Navigation**: Bottom tabs on mobile for main navigation. Horizontal tabs for workspace sections (Tasks, Chat, Agents, Settings).

### Code Conventions

Follow these conventions from SESSION-013:

| Convention | Rule |
|------------|------|
| **Component files** | PascalCase (e.g., `WorkspaceCard.tsx`, `TaskForm.tsx`) |
| **Hook files** | kebab-case with `use-` prefix (e.g., `use-workspaces.ts`) |
| **API files** | kebab-case with `.api` suffix (e.g., `workspace.api.ts`) |
| **Type files** | kebab-case with `.types` suffix (e.g., `workspace.types.ts`) |
| **shadcn/ui components** | Keep as-is lowercase (e.g., `button.tsx`, `card.tsx`) |
| **Imports** | Use `@/` alias for `src/` |
| **Module structure** | Feature-based: `features/{feature}/pages/`, `components/`, `hooks/`, `api/`, `types/` |

### Commit Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

```
<type>(ui): <description>
```

**Types:**
- `feat(ui):` — New feature
- `fix(ui):` — Bug fix
- `chore(ui):` — Maintenance, setup, config
- `refactor(ui):` — Code restructuring
- `docs(ui):` — Documentation

**Rules:**
- Prefer one-line commit messages, but use body if needed for context
- Push directly to `origin main` after each commit
- Each TODO item = one commit

### Workflow Per TODO Item

1. Read the TODO item and understand the scope
2. Read relevant specs if needed
3. Implement the feature/component
4. Run linter and fix any issues (`bun run lint`)
5. Verify in browser (both mobile and desktop viewport)
6. Commit with conventional commit message
7. Push to `origin main`
8. Mark TODO item as complete (add `[x]` to checkbox)
9. Move to next item

### Development Setup

The UI runs on Vite dev server (port 5173) with proxy to API (port 3456):

```bash
# Terminal 1: Start API
cd api && bun run dev

# Terminal 2: Start UI
cd ui && bun run dev
```

Access the app at `http://localhost:5173`.

---

## Phase 1: Project Setup

### 1.1 Dependencies and Tooling

- [x] **Install core dependencies**
  
  Install production dependencies:
  - `react-router-dom` — Routing
  - `@tanstack/react-query` — Server state management
  - `zustand` — Client state (when needed)
  - `react-hook-form` — Form handling
  - `@hookform/resolvers` — Zod resolver for forms
  - `zod` — Schema validation
  - `next-themes` — Theme switching
  - `@dnd-kit/core` — Drag and drop
  - `@dnd-kit/sortable` — Sortable lists
  - `react-markdown` — Markdown rendering
  - `remark-gfm` — GitHub Flavored Markdown
  - `rehype-sanitize` — XSS protection
  - `rehype-highlight` — Syntax highlighting
  - `lucide-react` — Icons
  
  Dev dependencies should already be present from Vite scaffold.
  
  Update `package.json` scripts:
  - `dev` — Run Vite dev server
  - `build` — Build for production
  - `preview` — Preview production build
  - `lint` — Run ESLint
  - `format` — Run Prettier
  
  Commit: `chore(ui): install core dependencies`

- [x] **Configure Vite with API proxy**
  
  Update `vite.config.ts`:
  - Add proxy for `/api/*` to `http://localhost:3456`
  - Configure `@` alias for `src/`
  - Ensure React plugin is configured
  
  Commit: `chore(ui): configure Vite with API proxy and path alias`

- [x] **Configure Prettier**
  
  Create `.prettierrc` with settings:
  - Single quotes
  - 2 space indentation
  - 100 print width
  - Trailing commas
  
  Create `.prettierignore` to exclude `node_modules`, `dist`, `components/ui`.
  
  Commit: `chore(ui): configure Prettier`

- [x] **Configure ESLint**
  
  Update `eslint.config.js`:
  - Add `eslint-plugin-simple-import-sort` for import ordering
  - Ensure React hooks rules are configured
  - Ensure TypeScript rules are configured
  
  Commit: `chore(ui): configure ESLint with import sorting`

- [x] **Initialize shadcn/ui**
  
  Run shadcn init:
  ```bash
  bunx --bun shadcn@latest init
  ```
  
  Configure:
  - Style: Default
  - Base color: Slate (or Zinc)
  - CSS variables: Yes
  - Tailwind config: Yes
  - Components path: `src/components/ui`
  - Utils path: `src/lib/utils`
  
  This creates:
  - `components.json`
  - `src/components/ui/` folder
  - `src/lib/utils.ts` with `cn()` helper
  - Updates to `tailwind.config.js` and `globals.css`
  
  Commit: `chore(ui): initialize shadcn/ui`

- [x] **Install shadcn/ui components**
  
  Batch install all needed components:
  ```bash
  bunx --bun shadcn@latest add button card dialog dropdown-menu input textarea form select tabs badge tooltip avatar separator scroll-area skeleton alert sonner label switch
  ```
  
  Commit: `chore(ui): install shadcn/ui components`

- [x] **Create folder structure**
  
  Create the feature-based folder structure:
  ```
  src/
  ├── features/
  │   ├── workspace/
  │   │   ├── pages/
  │   │   ├── components/
  │   │   ├── hooks/
  │   │   ├── api/
  │   │   └── types/
  │   ├── task/
  │   │   ├── pages/
  │   │   ├── components/
  │   │   ├── hooks/
  │   │   ├── api/
  │   │   └── types/
  │   ├── chat/
  │   │   ├── pages/
  │   │   ├── components/
  │   │   ├── hooks/
  │   │   ├── api/
  │   │   └── types/
  │   ├── agent/
  │   │   ├── components/
  │   │   ├── hooks/
  │   │   ├── api/
  │   │   └── types/
  │   └── settings/
  │       ├── pages/
  │       ├── components/
  │       ├── hooks/
  │       ├── api/
  │       └── types/
  ├── components/          # Shared components
  ├── hooks/               # Shared hooks
  ├── lib/                 # Utilities
  ├── stores/              # Zustand stores
  ├── routes/              # React Router config
  └── types/               # Shared types
  ```
  
  Add `.gitkeep` files to empty directories.
  
  Commit: `chore(ui): create feature-based folder structure`

---

## Phase 2: Core Infrastructure

### 2.1 API Client

- [x] **Create API client utilities**
  
  Create `src/lib/api-client.ts`:
  - Thin wrapper around `fetch`
  - Base URL handling (relative `/api/...`)
  - JSON parsing with error handling
  - `ApiError` class with `code`, `message`, `status`
  - Methods: `get<T>()`, `post<T>()`, `put<T>()`, `delete<T>()`
  - Handle non-OK responses and parse error body
  
  Create `src/types/api.types.ts`:
  - `ApiError` type
  - `ApiResponse` wrapper if needed
  
  Commit: `feat(ui): implement API client with error handling`

### 2.2 React Query Setup

- [x] **Configure React Query**
  
  Create `src/lib/query-client.ts`:
  - Create `QueryClient` with defaults:
    - `staleTime: 30000` (30s)
    - `gcTime: 300000` (5min)
    - `refetchOnWindowFocus: true`
    - `retry: 1`
  
  Update `src/App.tsx`:
  - Wrap app with `QueryClientProvider`
  
  Commit: `feat(ui): configure React Query with defaults`

### 2.3 Routing

- [x] **Set up React Router**
  
  Create `src/routes/index.tsx`:
  - Define route structure with lazy loading:
    ```
    /                           → WorkspaceList
    /settings                   → GlobalSettings
    /workspaces/:workspaceId    → WorkspaceLayout
      /tasks                    → KanbanBoard (default)
      /tasks/:taskId            → TaskDetail (modal)
      /chats                    → ChatList
      /chats/:chatId            → ChatDetail
      /agents                   → AgentList
      /settings                 → WorkspaceSettings
    ```
  - Use `lazy()` for code splitting
  - Redirect `/workspaces/:id` to `/workspaces/:id/tasks`
  
  Update `src/App.tsx`:
  - Use `RouterProvider` with the router
  
  Commit: `feat(ui): set up React Router with lazy loading`

### 2.4 Layouts

- [x] **Create RootLayout**
  
  Create `src/components/layouts/RootLayout.tsx`:
  - Header with:
    - "Malamar" text logo (left)
    - Theme toggle button (right)
    - Link to global settings (right)
  - Main content area (`<Outlet />`)
  - Mobile: Bottom navigation tabs (Home, Settings)
  - Desktop: Header navigation only
  - Initialize SSE connection (placeholder for now)
  
  Commit: `feat(ui): implement RootLayout with header and mobile nav`

- [x] **Create WorkspaceLayout**
  
  Create `src/components/layouts/WorkspaceLayout.tsx`:
  - Workspace header with:
    - Back button (to workspace list)
    - Workspace title
  - Horizontal tabs: Tasks, Chat, Agents, Settings
  - Content area (`<Outlet />`)
  - Fetch workspace data and provide via context or props
  - Show loading skeleton while fetching
  - Show error if workspace not found
  
  Commit: `feat(ui): implement WorkspaceLayout with tabs`

### 2.5 Theme Support

- [x] **Implement theme switching**
  
  Update `src/App.tsx`:
  - Wrap with `ThemeProvider` from `next-themes`
  - Configure: `attribute="class"`, `defaultTheme="system"`, `enableSystem`
  
  Create `src/components/ThemeToggle.tsx`:
  - Toggle button with Sun/Moon icons
  - Uses `useTheme()` hook
  - Switches between light and dark
  
  Add `ThemeToggle` to `RootLayout` header.
  
  Commit: `feat(ui): implement theme switching with next-themes`

### 2.6 Toast Notifications

- [x] **Set up toast notifications**
  
  The `sonner` component is already installed via shadcn.
  
  Update `src/App.tsx`:
  - Add `<Toaster />` component with config:
    - `position="bottom-right"`
    - `duration={5000}`
    - `visibleToasts={3}`
    - `closeButton`
  
  Commit: `feat(ui): configure toast notifications with Sonner`

---

## Phase 3: Shared Components

- [x] **Create LoadingSpinner component**
  
  Create `src/components/LoadingSpinner.tsx`:
  - Centered spinner icon
  - Optional `size` prop (sm, md, lg)
  - Optional `className` for positioning
  
  Commit: `feat(ui): implement LoadingSpinner component`

- [x] **Create GlobalSpinner component**
  
  Create `src/components/GlobalSpinner.tsx`:
  - Fixed position spinner in bottom-left corner
  - Shows when any React Query is fetching (use `useIsFetching`)
  - Subtle, non-intrusive design
  
  Add to `RootLayout`.
  
  Commit: `feat(ui): implement GlobalSpinner for background fetching`

- [x] **Create ErrorMessage component**
  
  Create `src/components/ErrorMessage.tsx`:
  - Displays error message from API
  - Red/destructive styling
  - Optional icon
  - Props: `error: Error | ApiError`
  
  Commit: `feat(ui): implement ErrorMessage component`

- [x] **Create EmptyState component**
  
  Create `src/components/EmptyState.tsx`:
  - Centered message with optional icon
  - Optional action button/CTA
  - Props: `icon?`, `title`, `description?`, `action?`
  
  Commit: `feat(ui): implement EmptyState component`

- [x] **Create ConfirmDialog component**
  
  Create `src/components/ConfirmDialog.tsx`:
  - Uses shadcn Dialog
  - Props: `title`, `description`, `confirmLabel`, `onConfirm`, `variant` (default/destructive)
  - Cancel and Confirm buttons
  - Loading state for confirm button
  
  Commit: `feat(ui): implement ConfirmDialog component`

- [x] **Create TypeToConfirmDialog component**
  
  Create `src/components/TypeToConfirmDialog.tsx`:
  - Extends ConfirmDialog pattern
  - Input field to type confirmation text
  - Confirm button disabled until exact match
  - Props: `confirmText` (text user must type)
  
  Commit: `feat(ui): implement TypeToConfirmDialog component`

- [x] **Create TimeAgo component**
  
  Create `src/lib/date-utils.ts`:
  - `formatRelativeTime(date: Date | string): string`
  - Returns: "just now", "5 min ago", "3 hours ago", "2 days ago", "Jan 15", "Jan 15, 2025"
  - Uses `Intl.RelativeTimeFormat` and `Intl.DateTimeFormat`
  
  Create `src/components/TimeAgo.tsx`:
  - Displays relative time
  - Tooltip shows absolute timestamp on hover
  - Props: `date: string`
  
  Commit: `feat(ui): implement TimeAgo component with date utilities`

- [x] **Create Markdown component**
  
  Create `src/components/Markdown.tsx`:
  - Uses `react-markdown` with:
    - `remark-gfm` for GFM support
    - `rehype-sanitize` for XSS protection
    - `rehype-highlight` for syntax highlighting
  - Custom component mappings for shadcn/Tailwind styling
  - Props: `content: string`
  
  Import highlight.js CSS in `globals.css` (theme-aware).
  
  Commit: `feat(ui): implement Markdown renderer with syntax highlighting`

- [x] **Create SearchInput component**
  
  Create `src/components/SearchInput.tsx`:
  - Input with search icon
  - Debounced onChange (300ms)
  - Clear button when has value
  - Props: `value`, `onChange`, `placeholder`
  
  Commit: `feat(ui): implement SearchInput with debounce`

- [x] **Create PasswordInput component**
  
  Create `src/components/PasswordInput.tsx`:
  - Input with toggle visibility button (eye icon)
  - Password/text type switching
  - Props: same as standard input
  
  Commit: `feat(ui): implement PasswordInput with toggle visibility`

- [x] **Create skeletons for common patterns**
  
  Create `src/components/skeletons/`:
  - `CardSkeleton.tsx` — Skeleton for card layouts
  - `ListSkeleton.tsx` — Skeleton for list items
  - `FormSkeleton.tsx` — Skeleton for form fields
  
  Use shadcn `Skeleton` component internally.
  
  Commit: `feat(ui): implement skeleton components for loading states`

---

## Phase 4: Workspace Feature

### 4.1 Types and API

- [x] **Define workspace types and API**
  
  Create `src/features/workspace/types/workspace.types.ts`:
  - `Workspace` interface (id, title, description, working_directory_mode, etc.)
  - `CreateWorkspaceInput`, `UpdateWorkspaceInput`
  - `WorkingDirectoryMode` type
  
  Create `src/features/workspace/api/workspace.api.ts`:
  - `workspaceApi.list(query?: string)` — GET /api/workspaces
  - `workspaceApi.get(id)` — GET /api/workspaces/:id
  - `workspaceApi.create(data)` — POST /api/workspaces
  - `workspaceApi.update(id, data)` — PUT /api/workspaces/:id
  - `workspaceApi.delete(id)` — DELETE /api/workspaces/:id
  
  Create `src/features/workspace/hooks/use-workspaces.ts`:
  - `useWorkspaces(query?)` — List workspaces
  - `useWorkspace(id)` — Get single workspace
  - `useCreateWorkspace()` — Mutation
  - `useUpdateWorkspace()` — Mutation
  - `useDeleteWorkspace()` — Mutation
  
  Commit: `feat(ui): implement workspace types, API, and hooks`

### 4.2 Components

- [x] **Create WorkspaceCard component**
  
  Create `src/features/workspace/components/WorkspaceCard.tsx`:
  - Card displaying:
    - Title
    - Description (truncated, 2 lines max)
    - Last activity time (TimeAgo)
    - Task counts by status (badges: "3 Todo", "1 In Progress", etc.)
  - Click navigates to workspace detail
  - Mobile: Full-width card
  - Desktop: Grid item
  
  Commit: `feat(ui): implement WorkspaceCard component`

- [x] **Create WorkspaceForm component**
  
  Create `src/features/workspace/components/WorkspaceForm.tsx`:
  - Form fields:
    - Title (required)
    - Description (optional, textarea)
  - Uses React Hook Form + Zod
  - Submit and Cancel buttons
  - Loading state on submit
  - Props: `onSubmit`, `onCancel`, `defaultValues?`, `isLoading`
  
  Commit: `feat(ui): implement WorkspaceForm component`

- [x] **Create WorkspaceCreateModal component**
  
  Create `src/features/workspace/components/WorkspaceCreateModal.tsx`:
  - Modal dialog with WorkspaceForm
  - Calls `useCreateWorkspace` on submit
  - Closes on success, shows toast
  - Props: `open`, `onOpenChange`
  
  Commit: `feat(ui): implement WorkspaceCreateModal component`

### 4.3 Pages

- [x] **Create WorkspaceList page**
  
  Create `src/features/workspace/pages/WorkspaceList.tsx`:
  - Search input at top (always visible)
  - Grid of WorkspaceCards
  - "Create Workspace" button (opens modal)
  - Empty state when no workspaces
  - No results state with suggestion
  - Skeleton loading state
  - Mobile: Single column
  - Desktop: 2-3 column grid
  
  Create `src/features/workspace/index.ts`:
  - Export page component
  
  Commit: `feat(ui): implement WorkspaceList page`

- [x] **Create WorkspaceDetail page wrapper**
  
  Update `WorkspaceLayout` to:
  - Fetch workspace by ID from URL params
  - Provide workspace data to children via context
  - Handle loading and error states
  - Show "Workspace not found" for 404
  
  Create `src/features/workspace/context/WorkspaceContext.tsx`:
  - Context providing current workspace
  - `useCurrentWorkspace()` hook
  
  Commit: `feat(ui): implement WorkspaceDetail context and data fetching`

### 4.4 Workspace Settings

- [x] **Create WorkspaceSettings page**
  
  Create `src/features/workspace/pages/WorkspaceSettings.tsx`:
  - Form sections:
    - **General**: Title, Description
    - **Working Directory**: Mode (static/temp), Path (when static)
    - **Cleanup**: Auto-delete done tasks toggle, Retention days
    - **Notifications**: Notify on error toggle, Notify on in-review toggle
  - Save button with loading state
  - Uses `useUpdateWorkspace` mutation
  - Show warning if static path doesn't exist (non-blocking)
  
  Commit: `feat(ui): implement WorkspaceSettings page`

---

## Phase 5: Agent Feature

### 5.1 Types and API

- [x] **Define agent types and API**
  
  Create `src/features/agent/types/agent.types.ts`:
  - `Agent` interface (id, workspace_id, name, instruction, cli_type, order)
  - `CreateAgentInput`, `UpdateAgentInput`
  - `CliType` type
  
  Create `src/features/agent/api/agent.api.ts`:
  - `agentApi.list(workspaceId)` — GET /api/workspaces/:id/agents
  - `agentApi.create(workspaceId, data)` — POST /api/workspaces/:id/agents
  - `agentApi.update(id, data)` — PUT /api/agents/:id
  - `agentApi.delete(id)` — DELETE /api/agents/:id
  - `agentApi.reorder(workspaceId, agentIds)` — PUT /api/workspaces/:id/agents/reorder
  
  Create `src/features/agent/hooks/use-agents.ts`:
  - `useAgents(workspaceId)` — List agents
  - `useCreateAgent()` — Mutation
  - `useUpdateAgent()` — Mutation
  - `useDeleteAgent()` — Mutation
  - `useReorderAgents()` — Mutation
  
  Commit: `feat(ui): implement agent types, API, and hooks`

### 5.2 Components

- [x] **Create AgentCard component**
  
  Create `src/features/agent/components/AgentCard.tsx`:
  - Displays:
    - Order number (1, 2, 3...)
    - Name
    - CLI type badge
    - Instruction preview (truncated)
  - Actions: Edit, Delete
  - Mobile: Up/down arrows for reordering (always visible)
  - Desktop: Drag handle for reordering
  - Click opens edit modal
  
  Commit: `feat(ui): implement AgentCard component`

- [x] **Create AgentForm component**
  
  Create `src/features/agent/components/AgentForm.tsx`:
  - Form fields:
    - Name (required)
    - CLI type (select dropdown)
    - Instruction (opens full-screen editor modal)
  - Instruction field shows preview/summary, "Edit" button
  - Uses React Hook Form + Zod
  - Props: `onSubmit`, `onCancel`, `defaultValues?`, `isLoading`
  
  Commit: `feat(ui): implement AgentForm component`

- [x] **Create InstructionEditorModal component**
  
  Create `src/features/agent/components/InstructionEditorModal.tsx`:
  - Full-screen modal (both mobile and desktop)
  - Large textarea for instruction editing
  - Save and Cancel buttons
  - Props: `value`, `onChange`, `open`, `onOpenChange`
  
  Commit: `feat(ui): implement InstructionEditorModal component`

- [x] **Create AgentModal component (create/edit)**
  
  Create `src/features/agent/components/AgentModal.tsx`:
  - Modal dialog with AgentForm
  - Mode: create or edit (based on props)
  - Calls appropriate mutation on submit
  - Delete button in edit mode (with confirmation)
  - Props: `open`, `onOpenChange`, `agent?` (if editing)
  
  Commit: `feat(ui): implement AgentModal for create and edit`

### 5.3 Agent List with Reordering

- [x] **Create AgentList component with drag-and-drop**
  
  Create `src/features/agent/components/AgentList.tsx`:
  - List of AgentCards
  - Desktop: Drag-and-drop reordering with @dnd-kit
  - Mobile: Up/down arrow buttons for reordering
  - "Create Agent" button (hidden — users should chat with Malamar)
  - Empty state: Warning banner + prompt to chat with Malamar agent
  - Calls `useReorderAgents` on order change
  
  Create `src/features/agent/pages/AgentListPage.tsx`:
  - Wrapper that uses AgentList
  - Fetches agents for current workspace
  
  Commit: `feat(ui): implement AgentList with drag-and-drop reordering`

---

## Phase 6: Task Feature

### 6.1 Types and API

- [x] **Define task types and API**
  
  Create `src/features/task/types/task.types.ts`:
  - `Task` interface (id, workspace_id, summary, description, status, created_at, updated_at)
  - `TaskStatus` type
  - `TaskComment` interface
  - `TaskLog` interface
  - `CreateTaskInput`, `UpdateTaskInput`
  
  Create `src/features/task/api/task.api.ts`:
  - `taskApi.list(workspaceId)` — GET /api/workspaces/:id/tasks
  - `taskApi.get(id)` — GET /api/tasks/:id
  - `taskApi.create(workspaceId, data)` — POST /api/workspaces/:id/tasks
  - `taskApi.update(id, data)` — PUT /api/tasks/:id
  - `taskApi.delete(id)` — DELETE /api/tasks/:id
  - `taskApi.prioritize(id)` — POST /api/tasks/:id/prioritize
  - `taskApi.cancel(id)` — POST /api/tasks/:id/cancel
  - `taskApi.deleteDone(workspaceId)` — DELETE /api/workspaces/:id/tasks/done
  - `taskApi.getComments(id)` — GET /api/tasks/:id/comments
  - `taskApi.addComment(id, data)` — POST /api/tasks/:id/comments
  - `taskApi.getLogs(id)` — GET /api/tasks/:id/logs
  
  Create `src/features/task/hooks/use-tasks.ts`:
  - `useTasks(workspaceId)` — List tasks
  - `useTask(id)` — Get single task
  - `useCreateTask()` — Mutation
  - `useUpdateTask()` — Mutation
  - `useDeleteTask()` — Mutation
  - `usePrioritizeTask()` — Mutation (optimistic)
  - `useCancelTask()` — Mutation
  - `useDeleteDoneTasks()` — Mutation
  - `useTaskComments(taskId)` — List comments
  - `useAddComment()` — Mutation (optimistic)
  - `useTaskLogs(taskId)` — List logs
  
  Commit: `feat(ui): implement task types, API, and hooks`

### 6.2 Kanban Components

- [x] **Create TaskCard component**
  
  Create `src/features/task/components/TaskCard.tsx`:
  - Displays:
    - Summary (truncated)
    - Time since last update (TimeAgo)
    - Comment count badge (if > 0)
    - Priority badge (if prioritized)
    - Pulsing border when agent is processing (status = in_progress and has active queue item)
  - Click opens task detail modal
  - Mobile: Full-width
  - Desktop: Fixed width for column
  
  Commit: `feat(ui): implement TaskCard component`

- [x] **Create KanbanColumn component**
  
  Create `src/features/task/components/KanbanColumn.tsx`:
  - Column header with status name and count
  - List of TaskCards
  - Empty column shows no message (per spec)
  - Props: `status`, `tasks`
  
  Commit: `feat(ui): implement KanbanColumn component`

- [x] **Create KanbanBoard component**
  
  Create `src/features/task/components/KanbanBoard.tsx`:
  - Header with:
    - "Create Task" button
    - Hamburger/dots menu (dropdown with "Delete all done tasks")
  - Four columns: Todo, In Progress, In Review, Done
  - Mobile: Horizontal scroll through columns (swipe)
  - Desktop: 4-column grid
  - Tasks ordered by most recently updated within each column
  - Empty state when no tasks at all
  
  Commit: `feat(ui): implement KanbanBoard with horizontal scroll on mobile`

- [x] **Create KanbanBoardPage wrapper**
  
  Create `src/features/task/pages/KanbanBoardPage.tsx`:
  - Fetches tasks for current workspace
  - Renders KanbanBoard
  - Handles loading and error states
  - Renders `<Outlet />` for task detail modal
  
  Commit: `feat(ui): implement KanbanBoardPage with data fetching`

### 6.3 Task Detail Modal

- [x] **Create TaskForm component**
  
  Create `src/features/task/components/TaskForm.tsx`:
  - Form fields:
    - Summary (required)
    - Description (optional, plain textarea for markdown)
  - Uses React Hook Form + Zod
  - Props: `onSubmit`, `onCancel`, `defaultValues?`, `isLoading`
  
  Commit: `feat(ui): implement TaskForm component`

- [x] **Create TaskCreateModal component**
  
  Create `src/features/task/components/TaskCreateModal.tsx`:
  - Modal with TaskForm
  - Calls `useCreateTask` on submit
  - Closes on success
  - Props: `open`, `onOpenChange`
  
  Commit: `feat(ui): implement TaskCreateModal component`

- [x] **Create CommentList component**
  
  Create `src/features/task/components/CommentList.tsx`:
  - List of comments
  - Each comment shows:
    - Avatar/icon (user icon, robot icon, or system icon)
    - Author name ("You", agent name, or "System")
    - Content (rendered as Markdown)
    - Timestamp
  - Different styling per author type
  - Props: `comments`
  
  Commit: `feat(ui): implement CommentList component`

- [x] **Create CommentInput component**
  
  Create `src/features/task/components/CommentInput.tsx`:
  - Expandable textarea
  - Send button
  - Loading state when submitting
  - Props: `onSubmit`, `isLoading`
  
  Commit: `feat(ui): implement CommentInput component`

- [x] **Create ActivityLog component**
  
  Create `src/features/task/components/ActivityLog.tsx`:
  - List of activity log entries
  - Each entry shows:
    - Icon based on event type
    - Description (e.g., "Task created", "Status changed to In Progress", "Planner started")
    - Timestamp
  - Compact timeline style
  - Props: `logs`
  
  Commit: `feat(ui): implement ActivityLog component`

- [x] **Create TaskDetailModal component**
  
  Create `src/features/task/components/TaskDetailModal.tsx`:
  - Full-screen modal on mobile, centered dialog on desktop
  - Sections:
    - Header: Summary (editable inline or via edit mode), status badge, action buttons
    - Description: Markdown rendered, edit button
    - Comments section: CommentList + CommentInput
    - Activity section: Collapsible/separate tab showing ActivityLog
  - Actions (based on status):
    - Delete (all statuses, with confirmation)
    - Prioritize/Deprioritize (Todo, In Progress)
    - Cancel (In Progress, with confirmation)
    - Move to In Review (In Progress)
    - Move to Todo (In Review, Done)
    - Move to Done (In Review — human only)
  - Close button navigates back to Kanban
  
  Commit: `feat(ui): implement TaskDetailModal component`

- [x] **Create TaskDetailPage (route wrapper)**
  
  Create `src/features/task/pages/TaskDetailPage.tsx`:
  - Reads task ID from URL params
  - Fetches task, comments, logs
  - Renders TaskDetailModal
  - Handles URL-based open/close (navigate back on close)
  
  Commit: `feat(ui): implement TaskDetailPage with URL-based modal`

---

## Phase 7: Chat Feature

### 7.1 Types and API

- [x] **Define chat types and API**
  
  Create `src/features/chat/types/chat.types.ts`:
  - `Chat` interface (id, workspace_id, agent_id, cli_type, title, created_at, updated_at)
  - `ChatMessage` interface (id, chat_id, role, message, actions, created_at)
  - `MessageRole` type (user, agent, system)
  - `CreateChatInput`, `UpdateChatInput`, `SendMessageInput`
  
  Create `src/features/chat/api/chat.api.ts`:
  - `chatApi.list(workspaceId, query?)` — GET /api/workspaces/:id/chats
  - `chatApi.get(id)` — GET /api/chats/:id (includes messages)
  - `chatApi.create(workspaceId, data)` — POST /api/workspaces/:id/chats
  - `chatApi.update(id, data)` — PUT /api/chats/:id
  - `chatApi.delete(id)` — DELETE /api/chats/:id
  - `chatApi.sendMessage(id, data)` — POST /api/chats/:id/messages
  - `chatApi.cancel(id)` — POST /api/chats/:id/cancel
  - `chatApi.uploadAttachment(id, file)` — POST /api/chats/:id/attachments
  
  Create `src/features/chat/hooks/use-chats.ts`:
  - `useChats(workspaceId, query?)` — List chats
  - `useChat(id)` — Get chat with messages
  - `useCreateChat()` — Mutation
  - `useUpdateChat()` — Mutation
  - `useDeleteChat()` — Mutation
  - `useSendMessage()` — Mutation (optimistic)
  - `useCancelChat()` — Mutation
  - `useUploadAttachment()` — Mutation
  
  Commit: `feat(ui): implement chat types, API, and hooks`

### 7.2 Chat List

- [x] **Create ChatListItem component**
  
  Create `src/features/chat/components/ChatListItem.tsx`:
  - Displays:
    - Title
    - Agent name (or "Malamar")
    - Last message preview (truncated)
    - Last update time
  - Click navigates to chat detail
  
  Commit: `feat(ui): implement ChatListItem component`

- [x] **Create ChatList component**
  
  Create `src/features/chat/components/ChatList.tsx`:
  - Search input at top
  - List of ChatListItems
  - Ordered by most recently updated
  - "New Chat" dropdown button:
    - Options: "Chat with Malamar", then each workspace agent
  - Empty state: "No conversations yet" + "Start a chat" dropdown
  - No results state with suggestion
  
  Create `src/features/chat/pages/ChatListPage.tsx`:
  - Fetches chats for current workspace
  - Renders ChatList
  
  Commit: `feat(ui): implement ChatList page with search`

### 7.3 Chat Detail

- [x] **Create ChatMessage component**
  
  Create `src/features/chat/components/ChatMessage.tsx`:
  - Different layouts per role:
    - User: Right-aligned, user styling
    - Agent: Left-aligned, agent styling with avatar
    - System: Centered, muted styling
  - Content rendered as Markdown (for agent messages)
  - Timestamp
  
  Commit: `feat(ui): implement ChatMessage component`

- [x] **Create ChatMessageList component**
  
  Create `src/features/chat/components/ChatMessageList.tsx`:
  - Scrollable list of ChatMessages
  - Auto-scroll to bottom on new messages
  - Loading indicator when agent is processing
  
  Commit: `feat(ui): implement ChatMessageList component`

- [x] **Create ChatInput component**
  
  Create `src/features/chat/components/ChatInput.tsx`:
  - Expandable textarea (grows with content)
  - Paperclip icon button for attachments
  - Send button
  - Disabled when processing (agent is responding)
  - Handles file upload (adds system message after upload)
  
  Commit: `feat(ui): implement ChatInput with expandable textarea and attachments`

- [x] **Create ChatHeader component**
  
  Create `src/features/chat/components/ChatHeader.tsx`:
  - Back button (to chat list)
  - Chat title (editable inline)
  - Agent dropdown (shows current agent, allows switching)
  - CLI dropdown (shows current CLI override, allows changing)
  - Delete button (with confirmation)
  - Stop button (when processing, cancels with confirmation)
  
  Commit: `feat(ui): implement ChatHeader with agent and CLI switching`

- [x] **Create ChatDetail page**
  
  Create `src/features/chat/pages/ChatDetailPage.tsx`:
  - Full page layout (not modal for chats)
  - ChatHeader at top
  - ChatMessageList in middle (scrollable)
  - ChatInput at bottom (fixed)
  - Fetches chat data by ID
  - Real-time updates via SSE or polling
  
  Commit: `feat(ui): implement ChatDetailPage`

---

## Phase 8: Settings Feature

### 8.1 Types and API

- [x] **Define settings types and API**
  
  Create `src/features/settings/types/settings.types.ts`:
  - `Settings` interface (all settings keys)
  - `CliSettings` interface (per-CLI config)
  - `CliHealth` interface (status, error)
  
  Create `src/features/settings/api/settings.api.ts`:
  - `settingsApi.get()` — GET /api/settings
  - `settingsApi.update(data)` — PUT /api/settings
  - `settingsApi.testEmail()` — POST /api/settings/test-email
  - `settingsApi.getCliHealth()` — GET /api/health/cli
  - `settingsApi.refreshCliHealth()` — POST /api/health/cli/refresh
  
  Create `src/features/settings/hooks/use-settings.ts`:
  - `useSettings()` — Get settings
  - `useUpdateSettings()` — Mutation
  - `useTestEmail()` — Mutation
  - `useCliHealth()` — Get CLI health
  - `useRefreshCliHealth()` — Mutation
  
  Commit: `feat(ui): implement settings types, API, and hooks`

### 8.2 Global Settings Page

- [x] **Create CliSettingsSection component**
  
  Create `src/features/settings/components/CliSettingsSection.tsx`:
  - For each CLI (Claude, Gemini, Codex, OpenCode):
    - Health status indicator (green/red dot + text)
    - Binary path input (optional override)
    - Environment variables (key-value list with add/remove)
    - Env var values are password fields with toggle
  - "Refresh Status" button (calls refresh endpoint)
  
  Commit: `feat(ui): implement CliSettingsSection component`

- [x] **Create NotificationSettingsSection component**
  
  Create `src/features/settings/components/NotificationSettingsSection.tsx`:
  - Mailgun configuration:
    - API key (password field with toggle)
    - Domain
    - From email
    - To email
  - "Test Email" button (calls test endpoint, shows result)
  - Default notification toggles:
    - Notify on error
    - Notify on in-review
  
  Commit: `feat(ui): implement NotificationSettingsSection component`

- [x] **Create GlobalSettings page**
  
  Create `src/features/settings/pages/GlobalSettingsPage.tsx`:
  - Single scrollable page with sections:
    - CLI Configuration (CliSettingsSection)
    - Email Notifications (NotificationSettingsSection)
  - Save button at bottom (saves all settings)
  - Loading and error states
  
  Commit: `feat(ui): implement GlobalSettingsPage`

---

## Phase 9: Real-Time & SSE

### 9.1 SSE Infrastructure

- [x] **Create SSE connection hook**
  
  Create `src/hooks/use-sse.ts`:
  - Manages EventSource connection to `/api/events`
  - Auto-reconnect on disconnect
  - Connection state tracking (connected, reconnecting, error)
  - Exposes `subscribe(eventType, handler)` function
  
  Create `src/stores/sse-store.ts` (if needed):
  - Zustand store for connection state
  - Used by components to show connection status
  
  Commit: `feat(ui): implement SSE connection hook`

- [x] **Create SSE event handlers**
  
  Create `src/lib/sse-handlers.ts`:
  - Register handlers for each event type:
    - `task.status_changed` → Invalidate tasks, show toast
    - `task.comment_added` → Invalidate comments, show toast
    - `task.error_occurred` → Invalidate task, show toast
    - `agent.execution_started` → Invalidate task (for pulsing indicator)
    - `agent.execution_finished` → Invalidate task
    - `chat.message_added` → Invalidate chat, show toast
    - `chat.processing_started` → Invalidate chat (for loading state)
    - `chat.processing_finished` → Invalidate chat
  - Use `queryClient.invalidateQueries()` for cache updates
  - Use `toast()` for notifications
  
  Commit: `feat(ui): implement SSE event handlers with cache invalidation`

- [x] **Initialize SSE in RootLayout**
  
  Update `src/components/layouts/RootLayout.tsx`:
  - Call `useSSE()` to establish connection
  - Register all event handlers on mount
  - Clean up on unmount
  
  Commit: `feat(ui): connect SSE in RootLayout`

### 9.2 Optimistic Updates

- [ ] **Implement optimistic updates for comments**
  
  Update `useAddComment` hook:
  - Optimistically add comment to cache
  - Rollback on error
  - Use React Query's `onMutate`, `onError`, `onSettled` pattern
  
  Commit: `feat(ui): implement optimistic updates for task comments`

- [ ] **Implement optimistic updates for chat messages**
  
  Update `useSendMessage` hook:
  - Optimistically add user message to cache
  - Show loading state for agent response
  - Rollback on error
  
  Commit: `feat(ui): implement optimistic updates for chat messages`

- [ ] **Implement optimistic updates for task priority**
  
  Update `usePrioritizeTask` hook:
  - Optimistically toggle priority in cache
  - Rollback on error
  
  Commit: `feat(ui): implement optimistic updates for task priority`

---

## Phase 10: Polish & Accessibility

### 10.1 CLI Health Warnings

- [ ] **Implement CLI health warning banner**
  
  Update `RootLayout`:
  - Fetch CLI health on mount
  - If zero CLIs healthy, show persistent warning banner in header:
    - "No CLIs available — configure in settings"
    - Link to settings page
  
  Update `WorkspaceLayout`:
  - If any workspace agent's CLI is unhealthy, show warning banner
  
  Commit: `feat(ui): implement CLI health warning banners`

### 10.2 Delete Confirmations

- [ ] **Implement delete all done tasks flow**
  
  Update `KanbanBoard`:
  - Hamburger menu includes "Delete all done tasks"
  - Opens TypeToConfirmDialog (type workspace name)
  - Calls `useDeleteDoneTasks` on confirm
  
  Commit: `feat(ui): implement delete all done tasks with type-to-confirm`

- [ ] **Implement workspace delete flow**
  
  Update `WorkspaceSettings`:
  - Add "Delete Workspace" button (danger zone section)
  - Opens TypeToConfirmDialog (type workspace name)
  - On confirm, delete and navigate to workspace list
  
  Commit: `feat(ui): implement workspace delete with type-to-confirm`

### 10.3 Accessibility

- [x] **Add skip-to-content link**
  
  Update `RootLayout`:
  - Add visually hidden "Skip to main content" link at top
  - Links to `#main-content` ID on main element
  - Visible on focus for keyboard users
  
  Commit: `feat(ui): add skip-to-content link for accessibility`

- [ ] **Audit and fix accessibility issues**
  
  Review all components for:
  - Proper semantic HTML elements
  - ARIA attributes where needed (forms, alerts)
  - Focus management in modals (Radix handles most)
  - Keyboard navigation works
  - Color contrast (shadcn/ui themes are compliant)
  
  Fix any issues found.
  
  Commit: `fix(ui): address accessibility audit findings`

### 10.4 Final Polish

- [x] **Clean up unused files and code**
  
  Remove:
  - Default Vite scaffold files (App.css, react.svg, etc.)
  - Any unused components or imports
  - Console.log statements
  
  Ensure all files have proper exports.
  
  Commit: `chore(ui): clean up unused files and code`

- [ ] **Create feature index exports**
  
  For each feature, ensure `index.ts` exports:
  - Page components
  - Key hooks (for cross-feature use)
  - Types (for cross-feature use)
  
  Commit: `chore(ui): create feature index exports`

---

## Completion Checklist

When all items are complete, verify:

- [ ] Linter passes (`bun run lint`)
- [ ] App builds successfully (`bun run build`)
- [ ] All pages load without errors
- [ ] Workspace CRUD works
- [ ] Agent CRUD and reordering works
- [ ] Task Kanban displays correctly
- [ ] Task detail modal opens/closes with URL
- [ ] Comments and activity logs display
- [ ] Chat list and detail work
- [ ] Chat with Malamar agent works
- [ ] File attachments work
- [ ] Global settings save correctly
- [ ] CLI health displays correctly
- [ ] SSE events update UI in real-time
- [ ] Toasts appear for important events
- [ ] Theme switching works
- [ ] Mobile layout is usable
- [ ] Horizontal scroll on Kanban (mobile) works
- [ ] Bottom tabs work on mobile
- [ ] Modals are full-screen on mobile
- [ ] Delete confirmations work
- [ ] Optimistic updates work (comments, messages, priority)
