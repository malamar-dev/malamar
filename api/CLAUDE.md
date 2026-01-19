# Malamar API

Backend API for Malamar - a tool that combines the strengths of different AI CLIs into autonomous multi-agent workflows.

## Status

This codebase is feature-complete for v1. When working here:

- Focus on bug fixes, performance improvements, and dependency updates
- Validate any new feature requests against the specs repository first
- Don't add features that aren't in the specs without explicit approval

## Tech Stack

Use Bun, not Node.js.

| Use This | Instead Of |
|----------|------------|
| `bun <file>` | `node <file>` or `ts-node <file>` |
| `bun test` | `jest` or `vitest` |
| `bun install` | `npm install` or `pnpm install` |
| `bun run <script>` | `npm run <script>` |
| `bunx <pkg>` | `npx <pkg>` |

**APIs:**

| Use This | Instead Of |
|----------|------------|
| `bun:sqlite` | `better-sqlite3` |
| `Bun.file()` | `node:fs` readFile/writeFile |
| `Bun.serve()` | `express` |
| `Bun.spawn()` | `child_process` or `execa` |

Bun auto-loads `.env` files, so don't use `dotenv`.

**Framework stack:**

- **Hono** - web framework (routing, middleware)
- **Zod** - request validation + type inference
- **nanoid** - ID generation

## Architecture

Modular monolith pattern. Each domain is a self-contained module with shared core infrastructure.

```
src/
├── core/           # Infrastructure (database, config, logger, errors)
├── shared/         # Cross-cutting utilities (nanoid, datetime)
│
├── workspace/      # Workspace CRUD, settings
├── agent/          # Agent CRUD, reordering
├── task/           # Task CRUD, comments, activity logs, prioritization
├── chat/           # Chat CRUD, messages, attachments
│
├── settings/       # Global settings (Mailgun, CLI config)
├── health/         # Health check endpoints
├── cli/            # CLI adapters (claude, gemini, codex, opencode)
├── runner/         # Task/chat queue processing, subprocess management
├── jobs/           # Scheduled jobs (cleanup, health-check)
├── events/         # SSE subsystem
├── notifications/  # Email notifications via Mailgun
├── instructions/   # Sample workspace, Malamar agent prompts
├── commands/       # CLI commands (serve, version, help, doctor, config)
│
├── app.ts          # Hono app assembly, route mounting
└── index.ts        # Entry point, startup orchestration
```

## Module Pattern

Each domain module follows a flat structure with standard files:

```
src/workspace/
├── index.ts           # Public exports
├── routes.ts          # Hono route handlers
├── service.ts         # Business logic
├── repository.ts      # Database queries
├── schemas.ts         # Zod request/response schemas
├── types.ts           # TypeScript types
└── service.test.ts    # Unit tests (co-located)
```

Not every module needs all files. Use what makes sense.

## Database

SQLite via `bun:sqlite` with WAL mode for better concurrent read performance.

**Key patterns:**

- Single `Database` instance shared across the app (see `core/database.ts`)
- Repository pattern for queries (each module has its own `repository.ts`)
- Transactions for multi-step operations
- Migrations in `migrations/` folder (numbered SQL files: `001_*.sql`, `002_*.sql`)

**PRAGMAs configured on startup:**

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;
```

## Testing

Three test types with distinct purposes:

| Type | Location | Command | What it tests |
|------|----------|---------|---------------|
| Unit | `src/**/*.test.ts` | `bun run test:unit` | Individual functions, mocked deps |
| Integration | `tests/` | `bun run test:integration` | Service layers with real DB |
| E2E | `e2e/` | `bun run test:e2e` | HTTP requests against running server |

**Running tests:**

```bash
bun run test:unit              # Unit tests only
bun run test:integration       # Integration tests only
bun run test:e2e               # E2E tests only
bun test src/workspace/        # Single module
bun test e2e/workspace.test.ts # Single E2E file
```

E2E tests manage their own server lifecycle via `beforeAll`/`afterAll`. They use a separate test data directory (`/tmp/malamar-test`) and never touch `~/.malamar`.

## Common Commands

```bash
bun run dev        # Start with watch mode
bun run start      # Start without watch
bun run test       # Run all tests
bun run lint       # ESLint
bun run format     # Prettier
```

## Conventions

**File naming:** kebab-case for everything (`task-worker.ts`, `chat-action-executor.ts`)

**Imports:** Relative paths, no tsconfig aliases. Use `eslint-plugin-simple-import-sort` for automatic sorting (runs on `bun run lint --fix`).

**Error handling:** Use `AppError` classes from `core/errors.ts`. They include HTTP status codes and error codes for consistent API responses.

**SSE:** EventEmitter pattern in `events/` module. Domain modules import `emit()` to broadcast events. The registry tracks active connections.

**IDs:** nanoid with default 21-character URL-safe alphabet.

## Specs Reference

Product requirements and technical design live in a separate specs repository:

**Location:** `/Users/irvingdinh/Workspace/github.com/malamar-dev/specs`

Key documents:
- `SPECS.md` - what Malamar does and why
- `TECHNICAL_DESIGN.md` - how it's implemented
- `MEETING-MINUTES/SESSION-011.md` - backend implementation details
- `MEETING-MINUTES/SESSION-012.md` - backend repository structure

Always check specs before implementing new features or making architectural changes.
