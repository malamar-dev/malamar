# Malamar UI — AI Assistant Context

> Frontend for Malamar — orchestrating AI coding assistants into multi-agent workflows.

## Quick Reference

```bash
bun install          # Install dependencies
bun run dev          # Start dev server (localhost:5173)
bun run build        # Production build
bun run lint         # Run ESLint
bun run format       # Run Prettier
```

## Tech Stack Preferences

| Use This | Instead Of |
|----------|------------|
| `bun install` / `bun run` | `npm` or `pnpm` commands |
| React Query | `useState` + `useEffect` for server data |
| Zustand | React Context for global client state |
| `cn()` utility | String concatenation for Tailwind classes |
| shadcn/ui components | Custom component implementations |
| Relative API paths (`/api/...`) | Hardcoded URLs |
| React Hook Form + Zod | Manual form handling |

**Core Stack:** Vite 7, React 19, React Router 7, React Query, Zustand, Tailwind CSS v4, shadcn/ui

## Architecture

Feature-based organization with shared infrastructure at `src/` level:

```
src/
├── components/           # Shared components
│   ├── ui/               # shadcn/ui primitives (DON'T EDIT)
│   ├── layouts/          # RootLayout, WorkspaceLayout
│   └── skeletons/        # Loading skeletons
├── features/             # Feature modules (self-contained)
│   ├── workspace/        # Workspace CRUD
│   ├── task/             # Kanban board, task management
│   ├── chat/             # Chat interface, messages
│   ├── agent/            # Agent configuration
│   └── settings/         # Global settings
├── hooks/                # Shared hooks (use-sse.ts, use-sse-events.ts)
├── lib/                  # Utilities
│   ├── api-client.ts     # Fetch wrapper with error handling
│   ├── query-client.ts   # React Query config
│   ├── sse-handlers.ts   # SSE → query invalidation
│   └── utils.ts          # cn() helper
├── routes/               # React Router config
├── stores/               # Zustand stores
└── types/                # Shared TypeScript types
```

**Feature Module Structure:**

```
features/<name>/
├── index.ts              # Public exports
├── pages/                # Route components
├── components/           # Feature-specific UI
├── hooks/                # Feature-specific hooks
├── api/                  # API functions
└── types/                # Feature types
```

## Component Rules

- **2+ features use it** → `src/components/`
- **1 feature uses it** → `src/features/*/components/`
- **shadcn/ui primitives** → `src/components/ui/` (don't modify)

## Key Patterns

### React Query

```typescript
// Query with SSE-driven invalidation
export const useWorkspaces = (query?: string) => {
  return useQuery({
    queryKey: ['workspaces', query],
    queryFn: () => workspaceApi.list(query),
  });
};

// Mutation with cache invalidation
export const useCreateWorkspace = () => {
  return useMutation({
    mutationFn: workspaceApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace created');
    },
  });
};
```

SSE events auto-invalidate queries via `lib/sse-handlers.ts`.

### Form Handling

```typescript
const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
});

const form = useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema),
  defaultValues: { title: '', description: '' },
});
```

### Mobile-First Styling

```typescript
// Base = mobile, add breakpoints for larger screens
<div className="flex flex-col gap-4 md:grid md:grid-cols-4">
<nav className="fixed bottom-0 lg:static lg:w-64">
```

| Prefix | Min Width |
|--------|-----------|
| (none) | Mobile |
| `sm:` | ≥640px |
| `md:` | ≥768px |
| `lg:` | ≥1024px |

## Warnings & Pitfalls

- **DO NOT** edit files in `src/components/ui/` — these are shadcn/ui primitives
- **DO NOT** use hardcoded API URLs — always use relative `/api/...` paths
- **DO NOT** use `useState`+`useEffect` for server data — use React Query
- **ALWAYS** use `cn()` from `lib/utils.ts` for Tailwind class merging
- **ALWAYS** check specs before implementing new features

## Specs Reference

Product requirements: `/Users/irvingdinh/Workspace/github.com/malamar-dev/specs`

| Document | Purpose |
|----------|---------|
| `SPECS.md` | What Malamar does and why |
| `TECHNICAL_DESIGN.md` | How Malamar is implemented |
| `SESSION-013.md` | Frontend structure decisions |
