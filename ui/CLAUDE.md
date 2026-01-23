# Malamar UI

Frontend application for Malamar - a multi-agent workflow orchestration tool.

For project overview and shared guidelines, see the root `CLAUDE.md`.

---

## Tech Stack

**MUST use these technologies** - do not substitute alternatives:

| Category      | Technology                   | NOT This                        |
| ------------- | ---------------------------- | ------------------------------- |
| Framework     | React 19                     | Vue, Angular, Svelte            |
| Bundler       | Vite                         | Webpack, Bun.serve for frontend |
| Server State  | React Query (TanStack Query) | Redux, SWR                      |
| Forms         | react-hook-form + Zod        | Formik, uncontrolled forms      |
| UI Components | shadcn/ui                    | Material UI, Ant Design         |
| Styling       | Tailwind CSS v4              | CSS modules, styled-components  |
| Icons         | Lucide React                 | FontAwesome, Heroicons          |
| Routing       | React Router v7              | Next.js, Remix                  |

### Package Manager

Use Bun for all operations:

- `bun install` - not npm, yarn, or pnpm
- `bun run dev` - development server
- `bunx shadcn@latest add <component>` - add shadcn components

---

## Architecture

### Feature-Based Organization

Code is organized by feature/domain, not by type:

```
src/features/<feature>/
├── api/          # API calls for this feature
├── hooks/        # React hooks (queries, mutations)
├── types/        # TypeScript interfaces
├── components/   # Feature-specific components
└── pages/        # Page components
```

### Layer Responsibilities

| Layer         | Purpose                  | Example                                   |
| ------------- | ------------------------ | ----------------------------------------- |
| `api/`        | HTTP calls via apiClient | `workspaces.api.ts`                       |
| `hooks/`      | React Query wrappers     | `useWorkspaces()`, `useCreateWorkspace()` |
| `types/`      | TypeScript definitions   | `Workspace`, `CreateWorkspaceInput`       |
| `components/` | Feature UI components    | `CreateWorkspaceDialog`                   |
| `pages/`      | Route page components    | `WorkspacesPage`                          |

---

## Directory Structure

```
ui/
├── src/
│   ├── main.tsx                 # Application entry point
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components (auto-generated)
│   │   ├── layout/              # App layout (AppLayout, AppHeader, AppSidebar)
│   │   └── theme-provider.tsx   # Theme context
│   ├── features/
│   │   ├── workspaces/          # Workspace feature
│   │   ├── settings/            # Settings feature
│   │   └── dashboard/           # Dashboard feature
│   ├── hooks/                   # Global hooks
│   │   ├── use-theme.ts
│   │   ├── use-media-query.ts
│   │   └── use-mobile.ts
│   ├── lib/                     # Utilities
│   │   ├── api-client.ts        # HTTP client
│   │   ├── query-client.ts      # React Query config
│   │   ├── utils.ts             # Helper functions (cn)
│   │   └── date-utils.ts        # Date formatting
│   ├── styles/                  # Global CSS (Tailwind)
│   └── routes/                  # React Router config
├── public/                      # Static assets
├── vite.config.ts
├── components.json              # shadcn/ui config
├── package.json
└── CLAUDE.md                    # This file
```

---

## State Management

### React Query for Server State

**ALL server state** must use React Query - no exceptions.

Configuration in `src/lib/query-client.ts`:

- 30-second stale time
- 5-minute garbage collection
- 1 retry attempt
- Refetch on window focus

### Query Hooks Pattern

Location: `features/<feature>/hooks/`

```
useWorkspaces()        # Query hook - fetches data
useCreateWorkspace()   # Mutation hook - creates data
useUpdateWorkspace()   # Mutation hook - updates data
useDeleteWorkspace()   # Mutation hook - deletes data
```

### Mutation Invalidation

**MUST** invalidate related queries after mutations:

- After creating a workspace → invalidate workspaces list
- After updating an agent → invalidate agents list AND workspace detail
- After deleting a chat → invalidate chats list

### Local State

For UI-only state (not from server):

- `useState` for simple component state (dialog open/close)
- React Context for theme (light/dark/system)
- react-hook-form for complex form state

**Do NOT use Redux or Zustand** - React Query + local state is sufficient.

---

## Component Conventions

### shadcn/ui Components

Location: `src/components/ui/`

**IMPORTANT**: These are auto-generated. Do not edit directly.

To add a new component:

```bash
bunx shadcn@latest add button
```

To update a component, regenerate it - don't manually edit.

### Custom Components

Location: `src/components/` (global) or `features/<feature>/components/` (feature-specific)

### Responsive Dialog Pattern

Use Dialog on desktop, Drawer on mobile:

```typescript
const isMobile = useMobile();
// Render Dialog or Drawer based on isMobile
```

### Loading States

Use `Loader2` from Lucide with spin animation for loading indicators.

### Class Merging

Use `cn()` from `src/lib/utils.ts` for merging Tailwind classes:

```typescript
import { cn } from "@/lib/utils";

<div className={cn("base-class", conditional && "conditional-class")} />
```

---

## Styling Guidelines

### Tailwind CSS v4

- Uses `@tailwindcss/vite` plugin
- oklch color space for modern color definition
- CSS variables for theme colors with dark mode support

### Theme Support

- System preference detection (`prefers-color-scheme`)
- Manual toggle via theme provider
- Stored in localStorage

### Component Variants

Use `class-variance-authority` (CVA) for variant-based styling:

```typescript
const buttonVariants = cva("base-styles", {
  variants: {
    variant: { default: "...", destructive: "..." },
    size: { default: "...", sm: "...", lg: "..." },
  },
});
```

### Styling Patterns

- Use `data-slot` attributes for component identification
- Mobile-first responsive design
- Container queries for responsive layouts
- Focus rings and borders via base layer config

### Color Variables

Theme colors are defined as CSS variables:

- `--background`, `--foreground`
- `--primary`, `--primary-foreground`
- `--destructive`, `--destructive-foreground`
- `--muted`, `--muted-foreground`
- `--accent`, `--accent-foreground`
- `--border`, `--input`, `--ring`

---

## API Integration

### API Client

Location: `src/lib/api-client.ts`

Provides typed methods:

- `apiClient.get<T>(path)`
- `apiClient.post<T>(path, data)`
- `apiClient.put<T>(path, data)`
- `apiClient.delete<T>(path)`

### Feature APIs

Location: `features/<feature>/api/`

Thin wrappers around apiClient:

```typescript
// workspaces.api.ts
export const workspacesApi = {
  list: () => apiClient.get<WorkspacesResponse>("/workspaces"),
  get: (id: string) => apiClient.get<Workspace>(`/workspaces/${id}`),
  create: (input: CreateWorkspaceInput) =>
    apiClient.post<Workspace>("/workspaces", input),
};
```

### Error Handling

`ApiError` class with:

- `code` - Error code from server
- `message` - Human-readable message
- `status` - HTTP status code

---

## Routing

### Configuration

Location: `src/routes/index.tsx`

### Patterns

- Lazy-loaded pages with custom `lazy()` wrapper
- Redirect patterns for default routes
- Nested routes for workspace sections

### Standard Routes

| Path                       | Page                     |
| -------------------------- | ------------------------ |
| `/workspaces`              | Workspace list           |
| `/workspaces/:id/agents`   | Workspace agents         |
| `/workspaces/:id/tasks`    | Workspace tasks (Kanban) |
| `/workspaces/:id/chats`    | Workspace chats          |
| `/workspaces/:id/settings` | Workspace settings       |
| `/settings/clis`           | CLI settings             |

### Code Splitting

Use `lazy()` for route-level code splitting - all pages should be lazy-loaded.

---

## Forms

### Required Stack

Every form MUST use:

1. `react-hook-form` for form state
2. `Zod` for validation schema
3. `@hookform/resolvers/zod` to connect them

### Form Pattern

1. Define Zod schema
2. Create form with `useForm()` and zodResolver
3. Use `<Form>` component from shadcn/ui
4. Connect fields with `<FormField>` and `control`

### Validation

- Client-side validation via Zod
- Server errors displayed via Alert component
- Field-level errors shown below inputs

---

## Type System

### Organization

Types are organized by feature in `features/<feature>/types/`:

- `workspace.types.ts` - Workspace, CreateWorkspaceInput
- `agent.types.ts` - Agent, CreateAgentInput
- `health.types.ts` - CliHealth, HealthStatus

### Conventions

| Pattern               | Use For                             |
| --------------------- | ----------------------------------- |
| `interface`           | Entity shapes (Workspace, Agent)    |
| `type`                | Unions, intersections, mapped types |
| `<Entity>Response`    | API response wrappers               |
| `Create<Entity>Input` | Creation DTOs                       |
| `Update<Entity>Input` | Update DTOs                         |

### CLI Types

```typescript
type CliType = "claude" | "gemini" | "codex" | "opencode";
```

---

## Common Pitfalls

### shadcn/ui Components

- **DON'T** edit files in `src/components/ui/` directly
- **DO** regenerate with `bunx shadcn@latest add <component>`

### React Query

- **DON'T** forget to invalidate queries after mutations
- **DON'T** use Redux/Zustand for server state
- **DO** use query keys consistently

### Forms

- **DON'T** use uncontrolled forms
- **DON'T** forget zodResolver when using react-hook-form
- **DO** define Zod schema for every form

### Routing

- **DON'T** use inline imports for pages
- **DO** use `lazy()` for code splitting

### Styling

- **DON'T** use inline styles
- **DON'T** create custom CSS files (use Tailwind)
- **DO** use `cn()` for conditional classes

### State

- **DON'T** store server data in useState
- **DO** use React Query for all server state
- **DO** invalidate queries after mutations

---

## Code Quality

### Linting

```bash
bun run lint        # Check for issues
bun run lint:fix    # Auto-fix issues
```

### Import Order

ESLint plugin `simple-import-sort` enforces:

1. React and external packages
2. Internal modules (`@/`)
3. Relative imports (`./`, `../`)

### TypeScript

- Strict mode enabled
- Path alias `@/` maps to `./src`
- No unused locals/parameters

---

## Development

### Scripts

| Script     | Command                                | Description                |
| ---------- | -------------------------------------- | -------------------------- |
| `dev`      | `vite`                                 | Development server (:5137) |
| `build`    | `tsc -b && vite build`                 | Production build           |
| `lint`     | `eslint . && prettier --check .`       | Check lint                 |
| `lint:fix` | `eslint . --fix && prettier --write .` | Fix lint                   |
| `preview`  | `vite preview`                         | Preview production build   |

### API Proxy

In development, Vite proxies `/api/*` requests to `localhost:3456`.

Configure via `MALAMAR_API_BASE_URL` environment variable.

### Hot Module Replacement

Vite provides HMR - changes reflect immediately without full reload.

---

## Quick Reference

| Need                   | Where to Look                                                               |
| ---------------------- | --------------------------------------------------------------------------- |
| Add a feature          | Create folder in `features/` with api/, hooks/, types/, components/, pages/ |
| Add a shadcn component | Run `bunx shadcn@latest add <component>`                                    |
| Add a global hook      | Create in `src/hooks/`                                                      |
| Add a page             | Create in `features/<feature>/pages/`, add route in `routes/index.tsx`      |
| Add an API call        | Create in `features/<feature>/api/`                                         |
| Add a query hook       | Create in `features/<feature>/hooks/`                                       |
| Merge classes          | Use `cn()` from `@/lib/utils`                                               |
| Handle loading         | Use `Loader2` icon with `animate-spin`                                      |
