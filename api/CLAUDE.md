# Malamar API

Backend service for Malamar - a multi-agent workflow orchestration tool.

For project overview and shared guidelines, see the root `CLAUDE.md`.

---

## Tech Stack

**MUST use these technologies** - do not substitute alternatives:

| Category      | Technology              | NOT This                 |
| ------------- | ----------------------- | ------------------------ |
| Runtime       | Bun                     | Node.js                  |
| Web Framework | Hono                    | Express, Fastify         |
| Database      | SQLite via `bun:sqlite` | better-sqlite3, postgres |
| Validation    | Zod                     | Joi, Yup                 |
| IDs           | nanoid                  | uuid, cuid               |

### Bun-Specific APIs

- `Bun.serve()` for HTTP server (via Hono)
- `bun:sqlite` for database (not better-sqlite3)
- `Bun.spawn()` for subprocess management
- `Bun.file()` for file operations (prefer over node:fs)
- Environment variables auto-loaded from `.env`

---

## Architecture

### Three-Layer Pattern

All features follow this architecture:

```
Routes (HTTP handlers)
    ↓ calls
Service (Business logic)
    ↓ calls
Repository (Data access)
```

- **Routes**: Handle HTTP requests, validate input, return responses
- **Service**: Pure business logic functions, no HTTP concerns
- **Repository**: Database operations, SQL queries, row mapping

### Module Structure

Each feature module contains:

```
src/<feature>/
├── index.ts        # Public exports only
├── routes.ts       # Hono route handlers
├── service.ts      # Business logic functions
├── repository.ts   # Database operations
├── schemas.ts      # Zod validation schemas
└── types.ts        # TypeScript interfaces
```

---

## Directory Structure

```
api/
├── src/
│   ├── index.ts              # Application entry point
│   ├── app.ts                # Hono app and router setup
│   ├── core/                 # Infrastructure
│   │   ├── config.ts         # Configuration loading
│   │   ├── database.ts       # SQLite database management
│   │   └── migrations.ts     # Migration runner
│   ├── shared/               # Shared utilities
│   │   ├── errors.ts         # Error types and responses
│   │   ├── id.ts             # ID generation (nanoid)
│   │   └── index.ts          # Public exports
│   ├── migrations/
│   │   ├── entries/          # Individual migration files
│   │   └── index.ts          # Migration registry
│   ├── <feature>/            # Feature modules (workspace, agent, etc.)
│   ├── jobs/                 # Background jobs
│   └── prompts/              # CLI prompt templates
├── e2e/
│   ├── features/             # E2E test files
│   └── helpers.ts            # Test utilities
├── package.json
└── CLAUDE.md                 # This file
```

---

## Database Conventions

### SQLite Configuration

- WAL mode enabled for better concurrent reads
- Single `Database` instance shared across the application
- Managed in `src/core/database.ts`

### Migrations

**File naming**: `<unix_timestamp>_<description>.ts`

Example: `1737643200_create_chat_tables.ts`

**Structure**:

```typescript
const migration: Migration = {
  version: 1737643200,
  name: "create_chat_tables",
  up(db: Database) {
    db.run(`CREATE TABLE ...`);
  },
};
export default migration;
```

**IMPORTANT**: After creating a migration file, you MUST export it in `src/migrations/entries/index.ts`.

### Type Conventions

- **Database rows**: snake_case field names (e.g., `created_at`, `workspace_id`)
- **Domain entities**: camelCase field names (e.g., `createdAt`, `workspaceId`)
- Repository functions handle the conversion between row and entity types

### IDs

- Use `generateId()` from `src/shared/id.ts` (nanoid)
- 21 characters, URL-safe alphabet
- Mock user ID: `000000000000000000000` (21 zeros)

---

## Error Handling

### Standard Error Response

Use `createErrorResponse()` from `src/shared/errors.ts`:

```typescript
return createErrorResponse("NOT_FOUND", "Task not found");
```

### Error Codes

| Code               | HTTP Status | When to Use                       |
| ------------------ | ----------- | --------------------------------- |
| `NOT_FOUND`        | 404         | Resource doesn't exist            |
| `VALIDATION_ERROR` | 400         | Invalid request data              |
| `CONFLICT`         | 409         | Duplicate or constraint violation |
| `INTERNAL_ERROR`   | 500         | Unexpected server error           |

### Best Practices

- Never throw raw errors from route handlers
- Always use the standard error response format
- Include helpful error messages for debugging
- Log errors before returning responses

---

## Validation

### Zod Schemas

Define schemas in `<feature>/schemas.ts`:

- Use `.safeParse()` for validation (not `.parse()`)
- Return validation errors with field details
- Schemas double as TypeScript types via `z.infer<>`

### Route Validation Pattern

1. Parse request body with Zod schema
2. Check `.success` property
3. Return validation error if failed
4. Proceed with validated data

---

## Testing

### E2E Tests

- **Location**: `e2e/features/*.test.ts`
- **Framework**: Bun's native test framework (`bun:test`)
- **Run command**: `bun test e2e/`

### Test Isolation

- Each test file gets an isolated database in a temp directory
- Server starts on a random port per test run
- Cleanup happens automatically after tests

### Test Structure

```typescript
import { describe, expect, test } from "bun:test";

describe("Feature", () => {
  test("description", async () => {
    // Arrange, Act, Assert
  });
});
```

### Helpers

Test utilities are in `e2e/helpers.ts`:

- Server setup and teardown
- Database initialization
- HTTP request helpers

---

## Background Jobs

### Job Types

Located in `src/jobs/`:

| Job              | Purpose                 | Interval              |
| ---------------- | ----------------------- | --------------------- |
| Runner           | Process task queue      | 1000ms (configurable) |
| CLI Health Check | Verify CLI availability | 5 minutes             |
| Cleanup          | Remove old queue items  | Daily                 |

### Graceful Shutdown

- Jobs use `AbortController` for cancellation
- SIGTERM/SIGINT handlers stop jobs gracefully
- Active subprocesses are killed on shutdown

---

## CLI Adapters

### Supported CLIs

| CLI         | Notes                                          |
| ----------- | ---------------------------------------------- |
| Claude Code | Supports `--json-schema` for structured output |
| Gemini CLI  | Schema embedded in prompt                      |
| Codex CLI   | Schema embedded in prompt                      |
| OpenCode    | Schema embedded in prompt                      |

### Subprocess Management

- Use `Bun.spawn()` for CLI invocation
- Track active processes in `Map<string, Subprocess>`
- Pass working directory via `cwd` option
- Merge user env vars with system env

---

## Common Pitfalls

### Migrations

- **MUST** export new migrations in `src/migrations/entries/index.ts`
- Use timestamp (not sequential number) for version
- Test migrations on a fresh database

### Validation

- Use `.safeParse()` not `.parse()` - avoids throwing
- Always check `.success` before accessing `.data`

### Database

- Always map database rows to domain entities
- Use transactions for multi-step operations
- Close database connection on shutdown

### Routes

- Keep route handlers thin - delegate to services
- Don't put business logic in routes
- Always return proper error responses

### Services

- Services should be pure functions
- No HTTP concerns (Request/Response objects)
- No direct database access - use repositories

---

## Code Quality

### Linting

```bash
bun run lint        # Check for issues
bun run lint:fix    # Auto-fix issues
```

### Import Order

ESLint plugin `simple-import-sort` enforces:

1. External packages
2. Internal modules (`../`, `./`)
3. Sibling files

### TypeScript

- Strict mode enabled
- Prefer explicit return types on exported functions
- Use `interface` for object shapes

---

## Configuration

### Environment Variables

| Variable                       | Default      | Description               |
| ------------------------------ | ------------ | ------------------------- |
| `MALAMAR_HOST`                 | `127.0.0.1`  | Bind address              |
| `MALAMAR_PORT`                 | `3456`       | Server port               |
| `MALAMAR_DATA_DIR`             | `~/.malamar` | Data directory            |
| `MALAMAR_LOG_LEVEL`            | `info`       | Log verbosity             |
| `MALAMAR_RUNNER_POLL_INTERVAL` | `1000`       | Runner poll interval (ms) |

### Data Directory

Default: `~/.malamar/`

Contains:

- `malamar.db` - SQLite database
- Configuration files
- Temporary files for CLI communication

---

## Scripts

| Script     | Command                                | Description            |
| ---------- | -------------------------------------- | ---------------------- |
| `dev`      | `bun --watch src/index.ts`             | Development with watch |
| `start`    | `bun src/index.ts`                     | Production start       |
| `lint`     | `eslint . && prettier --check .`       | Check lint             |
| `lint:fix` | `eslint . --fix && prettier --write .` | Fix lint               |
| `test:e2e` | `bun test e2e/`                        | Run E2E tests          |

---

## Quick Reference

| Need                 | Where to Look                                              |
| -------------------- | ---------------------------------------------------------- |
| Add a new feature    | Copy existing module structure (e.g., `workspace/`)        |
| Add a migration      | Create file in `migrations/entries/`, export in `index.ts` |
| Add an endpoint      | Add route in `<feature>/routes.ts`, register in `app.ts`   |
| Add a background job | Create in `jobs/`, register in `jobs/index.ts`             |
| Handle errors        | Use `createErrorResponse()` from `shared/errors`           |
| Generate IDs         | Use `generateId()` from `shared/id`                        |
