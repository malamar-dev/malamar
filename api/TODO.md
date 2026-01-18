# API Implementation TODO

This document outlines the complete implementation plan for the Malamar API. Each TODO item is scoped for one commit and contains enough detail for autonomous agent execution.

---

## Agent Instructions

Before working on any TODO item, read and follow these guidelines.

### Specs References

Always read the relevant specs before implementing. Specs are located at `/Users/irvingdinh/Workspace/github.com/malamar-dev/specs/`:

| Document | Purpose |
|----------|---------|
| `SPECS.md` | Product behavior, features, UX (WHAT and WHY) |
| `TECHNICAL_DESIGN.md` | Architecture, APIs, data models (HOW) |
| `MEETING-MINUTES/SESSION-012.md` | Backend folder structure, module patterns, conventions |
| `APPENDIX_ONBOARDING_RESOURCES.md` | Sample workspace and agent instructions |

### Key Decisions

These decisions were made during planning and should be followed:

1. **Scope**: API/backend only. UI will be implemented separately.
2. **CLI Adapters**: Implement Claude Code adapter first. Other adapters (Gemini, Codex, OpenCode) are follow-up items.
3. **Malamar Agent**: Implement the full Malamar Agent with all actions (create/update/delete agents, update workspace, etc.) from the start.
4. **Testing**: Each feature is only "done" when all relevant tests are implemented and passing.
5. **Migrations**: Use multiple migration files in logical groups, not one large file.

### Code Conventions

Follow these conventions from SESSION-012:

| Convention | Rule |
|------------|------|
| **File naming** | kebab-case for all files (e.g., `task-worker.ts`, `chat-worker.ts`) |
| **Imports** | Relative paths throughout, no tsconfig aliases |
| **Module structure** | Flat with conventions (no sub-folders within domain modules) |
| **Module files** | `index.ts`, `routes.ts`, `service.ts`, `repository.ts`, `schemas.ts`, `types.ts` |
| **Public API** | Each module exports through `index.ts` |

### Testing Requirements

Three test types, included at different stages:

| Test Type | Location | When to Add |
|-----------|----------|-------------|
| **Unit tests** | `src/**/*.test.ts` (co-located) | With the implementation commit |
| **Integration tests** | `tests/` folder | After module is complete |
| **E2E tests** | `e2e/` folder | After routes + server infrastructure exist |

### Commit Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

```
<type>(api): <description>
```

**Types:**
- `feat(api):` — New feature
- `fix(api):` — Bug fix
- `chore(api):` — Maintenance, setup, config
- `test(api):` — Adding tests
- `refactor(api):` — Code restructuring
- `docs(api):` — Documentation

**Rules:**
- Prefer one-line commit messages, but use body if needed for context
- Push directly to `origin main` after each commit
- Each TODO item = one commit

### Workflow Per TODO Item

1. Read the TODO item and understand the scope
2. Read relevant specs if needed
3. Implement the feature/module
4. Write tests (unit tests with implementation, integration/E2E as specified)
5. Run tests and ensure they pass
6. Run linter and fix any issues
7. Commit with conventional commit message
8. Push to `origin main`
9. Mark TODO item as complete (add `[x]` to checkbox)
10. Move to next item

---

## Phase 1: Project Setup

### 1.1 Dependencies and Tooling

- [x] **Install core dependencies**
  
  Install production dependencies:
  - `hono` — Web framework
  - `@hono/zod-validator` — Request validation middleware
  - `zod` — Schema validation
  - `nanoid` — ID generation
  
  Install dev dependencies:
  - `@types/bun` — Bun types (already present)
  - `typescript` — TypeScript (already present)
  - `prettier` — Code formatting
  - `eslint` — Linting
  - `eslint-plugin-simple-import-sort` — Import sorting
  
  Update `package.json` with scripts:
  - `dev` — Run with watch mode
  - `start` — Run production
  - `test` — Run all tests
  - `test:unit` — Run unit tests only (`bun test src/`)
  - `test:integration` — Run integration tests only (`bun test tests/`)
  - `test:e2e` — Run E2E tests only (`bun test e2e/`)
  - `lint` — Run ESLint
  - `format` — Run Prettier
  
  Commit: `chore(api): install dependencies and configure package.json scripts`

- [x] **Configure TypeScript**
  
  Update `tsconfig.json` with strict settings:
  - `strict: true`
  - `noUncheckedIndexedAccess: true`
  - `noImplicitReturns: true`
  - Target ES2022+ for Bun compatibility
  - Module resolution for Bun
  
  Commit: `chore(api): configure TypeScript with strict settings`

- [x] **Configure Prettier**
  
  Create `.prettierrc` with settings:
  - Single quotes
  - No semicolons (or with — choose one, be consistent)
  - 2 space indentation
  - 100 print width
  - Trailing commas
  
  Create `.prettierignore` to exclude `node_modules`, `dist`, etc.
  
  Commit: `chore(api): configure Prettier`

- [x] **Configure ESLint**
  
  Create `eslint.config.js` (flat config) with:
  - TypeScript ESLint parser and plugin
  - `eslint-plugin-simple-import-sort` for import ordering
  - Rules appropriate for Bun/TypeScript project
  
  Create `.eslintignore` if needed.
  
  Commit: `chore(api): configure ESLint with import sorting`

- [x] **Create initial folder structure**
  
  Create empty directories with `.gitkeep` files:
  ```
  src/
  ├── commands/
  ├── core/
  ├── shared/
  ├── workspace/
  ├── agent/
  ├── task/
  ├── chat/
  ├── settings/
  ├── health/
  ├── cli/
  │   └── adapters/
  ├── runner/
  ├── jobs/
  ├── events/
  ├── notifications/
  └── instructions/
  migrations/
  tests/
  ├── helpers/
  ├── workspace/
  ├── agent/
  ├── task/
  └── chat/
  e2e/
  └── helpers/
  public/
  ```
  
  Commit: `chore(api): create initial folder structure`

---

## Phase 2: Core Infrastructure

### 2.1 Configuration

- [x] **Create `core/config.ts`**
  
  Implement configuration loading with priority: defaults → CLI flags → env vars.
  
  Settings to support:
  - `MALAMAR_HOST` / `--host` (default: `127.0.0.1`)
  - `MALAMAR_PORT` / `--port` (default: `3456`)
  - `MALAMAR_DATA_DIR` / `--data-dir` (default: `~/.malamar`)
  - `MALAMAR_LOG_LEVEL` / `--log-level` (default: `info`)
  - `MALAMAR_LOG_FORMAT` / `--log-format` (default: `text`)
  - `MALAMAR_RUNNER_POLL_INTERVAL` / `--runner-poll-interval` (default: `1000`)
  - `MALAMAR_TEMP_DIR` / `--temp-dir` (default: system `/tmp`)
  
  Parse CLI flags from `process.argv`. Export typed config object.
  
  Include unit tests for config parsing logic.
  
  Commit: `feat(api): implement configuration loading with env vars and CLI flags`

- [x] **Create `core/logger.ts`**
  
  Implement simple logger with:
  - Log levels: `debug`, `info`, `warn`, `error`
  - Text format: `[2025-01-18T10:30:00Z] [INFO] Message here { context }`
  - JSON format: `{"timestamp":"...","level":"info","message":"...","context":{}}`
  - API: `logger.debug()`, `logger.info()`, `logger.warn()`, `logger.error()`
  - Each method accepts `(message: string, context?: object)`
  - Respects `MALAMAR_LOG_LEVEL` and `MALAMAR_LOG_FORMAT` from config
  
  Include unit tests.
  
  Commit: `feat(api): implement logger with text and JSON formats`

- [x] **Create `core/errors.ts`**
  
  Implement custom error classes:
  - `AppError` — Base class with `code` and `statusCode`
  - `NotFoundError` — 404, code `NOT_FOUND`
  - `ValidationError` — 400, code `VALIDATION_ERROR`
  - `ConflictError` — 409, code `CONFLICT`
  - `InternalError` — 500, code `INTERNAL_ERROR`
  
  Each error should serialize to the API format:
  ```json
  { "error": { "code": "NOT_FOUND", "message": "Task not found" } }
  ```
  
  Include unit tests.
  
  Commit: `feat(api): implement custom error classes`

- [x] **Create `core/types.ts`**
  
  Define shared utility types:
  - `CliType` enum: `claude`, `gemini`, `codex`, `opencode`
  - `TaskStatus` enum: `todo`, `in_progress`, `in_review`, `done`
  - `QueueStatus` enum: `queued`, `in_progress`, `completed`, `failed`
  - `ActorType` enum: `user`, `agent`, `system`
  - `WorkingDirectoryMode` enum: `static`, `temp`
  - Common type utilities as needed
  
  Commit: `feat(api): define shared types and enums`

### 2.2 Database

- [x] **Create `core/database.ts`**
  
  Implement SQLite database module using `bun:sqlite`:
  - Single `Database` instance (singleton pattern)
  - Initialize with PRAGMAs on startup:
    - `PRAGMA journal_mode = WAL;`
    - `PRAGMA synchronous = NORMAL;`
    - `PRAGMA busy_timeout = 5000;`
  - Database file location: `{MALAMAR_DATA_DIR}/malamar.db`
  - Export `db` instance and helper functions:
    - `getDb()` — Get database instance
    - `transaction<T>(fn: () => T): T` — Transaction wrapper
    - `closeDb()` — Close connection (for shutdown)
  - Migration runner:
    - Create `_migrations` table if not exists
    - Read `.sql` files from `migrations/` folder
    - Run migrations with version > max applied
    - Panic on migration failure
  
  Include unit tests for transaction helper (using in-memory DB).
  
  Commit: `feat(api): implement SQLite database with migrations runner`

### 2.3 Shared Utilities

- [x] **Create `shared/nanoid.ts`**
  
  Export ID generation function:
  - Use `nanoid` package with default settings (21 chars)
  - Export `generateId(): string`
  - Define `MOCK_USER_ID = '000000000000000000000'` (21 zeros)
  
  Include unit tests (verify length, character set).
  
  Commit: `feat(api): implement nanoid ID generation`

- [x] **Create `shared/datetime.ts`**
  
  Export date/time utilities:
  - `now(): string` — Current ISO timestamp
  - `formatRelative(date: Date | string): string` — Relative time ("5 min ago", "2 days ago")
  
  Include unit tests.
  
  Commit: `feat(api): implement datetime utilities`

- [x] **Create `shared/types.ts`**
  
  Define cross-cutting types used by multiple modules:
  - Pagination types (if needed later)
  - Common response wrapper types
  - Any shared interfaces
  
  Commit: `feat(api): define shared cross-cutting types`

- [x] **Create `core/index.ts` and `shared/index.ts`**
  
  Export public APIs for both modules:
  - `core/index.ts`: config, logger, db, errors, types
  - `shared/index.ts`: nanoid, datetime, types
  
  Commit: `chore(api): create index exports for core and shared modules`

---

## Phase 3: Database Migrations

- [x] **Create `migrations/001_workspaces_agents.sql`**
  
  Create tables:
  - `_migrations` (version INTEGER PRIMARY KEY, applied_at DATETIME)
  - `workspaces` with all columns from TECHNICAL_DESIGN.md:
    - id, title, description, working_directory_mode, working_directory_path
    - auto_delete_done_tasks, retention_days
    - notify_on_error, notify_on_in_review
    - last_activity_at, created_at, updated_at
  - `agents` with all columns:
    - id, workspace_id, name, instruction, cli_type, order
    - created_at, updated_at
    - Foreign key to workspaces with CASCADE DELETE
  
  Commit: `feat(api): add migration for workspaces and agents tables`

- [x] **Create `migrations/002_tasks.sql`**
  
  Create tables:
  - `tasks`:
    - id, workspace_id, summary, description, status
    - created_at, updated_at
    - Foreign key to workspaces with CASCADE DELETE
  - `task_comments`:
    - id, task_id, workspace_id, user_id, agent_id, content
    - created_at, updated_at
    - Foreign keys with CASCADE DELETE
  - `task_logs`:
    - id, task_id, workspace_id, event_type, actor_type, actor_id, metadata
    - created_at
    - Foreign keys with CASCADE DELETE
  - `task_queue`:
    - id, task_id, workspace_id, status, is_priority
    - created_at, updated_at
    - Foreign keys with CASCADE DELETE
  
  Commit: `feat(api): add migration for tasks, comments, logs, and queue tables`

- [x] **Create `migrations/003_chats.sql`**
  
  Create tables:
  - `chats`:
    - id, workspace_id, agent_id, cli_type, title
    - created_at, updated_at
    - Foreign key to workspaces with CASCADE DELETE
  - `chat_messages`:
    - id, chat_id, role, message, actions
    - created_at
    - Foreign key to chats with CASCADE DELETE
  - `chat_queue`:
    - id, chat_id, workspace_id, status
    - created_at, updated_at
    - Foreign keys with CASCADE DELETE
  
  Commit: `feat(api): add migration for chats, messages, and chat queue tables`

- [x] **Create `migrations/004_settings.sql`**
  
  Create tables:
  - `settings`:
    - key (PRIMARY KEY), value (JSON)
  
  Insert default settings:
  - `notify_on_error`: `true`
  - `notify_on_in_review`: `true`
  
  Commit: `feat(api): add migration for settings table`

---

## Phase 4: Domain Modules

### 4.1 Workspace Module

- [x] **Create `workspace/types.ts`**
  
  Define TypeScript interfaces:
  - `Workspace` — Full workspace entity
  - `WorkspaceRow` — Database row type
  - `CreateWorkspaceInput`
  - `UpdateWorkspaceInput`
  
  Commit: `feat(api): define workspace types`

- [x] **Create `workspace/repository.ts` with unit tests**
  
  Implement database operations:
  - `findAll(): Workspace[]`
  - `findById(id: string): Workspace | null`
  - `search(query: string): Workspace[]` — Title search
  - `create(input: CreateWorkspaceInput): Workspace`
  - `update(id: string, input: UpdateWorkspaceInput): Workspace`
  - `delete(id: string): void` — Cascade handled by DB
  - `updateLastActivity(id: string): void`
  
  Co-located unit tests in `workspace/repository.test.ts` using in-memory SQLite.
  
  Commit: `feat(api): implement workspace repository with unit tests`

- [x] **Create `workspace/service.ts` with unit tests**
  
  Implement business logic:
  - `listWorkspaces(): Workspace[]`
  - `searchWorkspaces(query: string): Workspace[]`
  - `getWorkspace(id: string): Workspace` — Throws NotFoundError
  - `createWorkspace(input): Workspace`
  - `updateWorkspace(id: string, input): Workspace`
  - `deleteWorkspace(id: string): void` — Kill subprocesses first (placeholder for now)
  
  Co-located unit tests in `workspace/service.test.ts` with mocked repository.
  
  Commit: `feat(api): implement workspace service with unit tests`

- [x] **Create `workspace/schemas.ts`**
  
  Define Zod schemas:
  - `createWorkspaceSchema` — title (required), description (optional), etc.
  - `updateWorkspaceSchema` — All fields optional
  - `workspaceResponseSchema` — For API responses
  - `workspaceListResponseSchema`
  
  Commit: `feat(api): define workspace Zod schemas`

- [x] **Create `workspace/routes.ts`**
  
  Implement Hono routes:
  - `GET /` — List workspaces (supports `?q=` query)
  - `POST /` — Create workspace
  - `GET /:id` — Get workspace
  - `PUT /:id` — Update workspace
  - `DELETE /:id` — Delete workspace
  
  Use `@hono/zod-validator` for request validation.
  Handle errors and return proper status codes.
  
  Commit: `feat(api): implement workspace routes`

- [x] **Create `workspace/index.ts`**
  
  Export public API:
  - `workspaceRoutes` — Hono router
  - Types as needed by other modules
  
  Commit: `chore(api): create workspace module index exports`

- [ ] **Add integration tests for workspace module**
  
  Create `tests/workspace/repository.test.ts`:
  - Test CRUD operations with real SQLite (temp file)
  - Test cascade delete behavior
  - Test search functionality
  
  Create `tests/workspace/service.test.ts`:
  - Test service with real repository and DB
  - Test error cases (not found, etc.)
  
  Commit: `test(api): add workspace integration tests`

### 4.2 Agent Module

- [x] **Create `agent/types.ts`**
  
  Define TypeScript interfaces:
  - `Agent` — Full agent entity
  - `AgentRow` — Database row type
  - `CreateAgentInput`
  - `UpdateAgentInput`
  - `ReorderAgentsInput`
  
  Commit: `feat(api): define agent types`

- [x] **Create `agent/repository.ts` with unit tests**
  
  Implement database operations:
  - `findByWorkspaceId(workspaceId: string): Agent[]` — Ordered by `order`
  - `findById(id: string): Agent | null`
  - `findByName(workspaceId: string, name: string): Agent | null`
  - `create(input: CreateAgentInput): Agent`
  - `update(id: string, input: UpdateAgentInput): Agent`
  - `delete(id: string): void`
  - `reorder(workspaceId: string, agentIds: string[]): void`
  - `getNextOrder(workspaceId: string): number`
  
  Co-located unit tests.
  
  Commit: `feat(api): implement agent repository with unit tests`

- [x] **Create `agent/service.ts` with unit tests**
  
  Implement business logic:
  - `listAgents(workspaceId: string): Agent[]`
  - `getAgent(id: string): Agent`
  - `createAgent(workspaceId: string, input): Agent` — Check unique name
  - `updateAgent(id: string, input): Agent` — Check unique name if changed
  - `deleteAgent(id: string): void`
  - `reorderAgents(workspaceId: string, agentIds: string[]): void`
  
  Co-located unit tests.
  
  Commit: `feat(api): implement agent service with unit tests`

- [x] **Create `agent/schemas.ts`**
  
  Define Zod schemas for requests/responses.
  
  Commit: `feat(api): define agent Zod schemas`

- [x] **Create `agent/routes.ts`**
  
  Implement Hono routes:
  - `GET /workspaces/:id/agents` — List agents
  - `POST /workspaces/:id/agents` — Create agent
  - `PUT /agents/:id` — Update agent
  - `DELETE /agents/:id` — Delete agent
  - `PUT /workspaces/:id/agents/reorder` — Reorder agents
  
  Commit: `feat(api): implement agent routes`

- [x] **Create `agent/index.ts`**
  
  Export public API.
  
  Commit: `chore(api): create agent module index exports`

- [ ] **Add integration tests for agent module**
  
  Create `tests/agent/repository.test.ts` and `tests/agent/service.test.ts`.
  
  Commit: `test(api): add agent integration tests`

### 4.3 Task Module

- [x] **Create `task/types.ts`**
  
  Define TypeScript interfaces:
  - `Task`, `TaskRow`
  - `TaskComment`, `TaskCommentRow`
  - `TaskLog`, `TaskLogRow`
  - `TaskQueueItem`, `TaskQueueItemRow`
  - Input types for create/update operations
  - `TaskEventType` enum for activity log events
  
  Commit: `feat(api): define task types`

- [x] **Create `task/repository.ts` with unit tests**
  
  Implement database operations for tasks:
  - `findByWorkspaceId(workspaceId: string): Task[]`
  - `findById(id: string): Task | null`
  - `create(input): Task`
  - `update(id: string, input): Task`
  - `delete(id: string): void`
  - `updateStatus(id: string, status: TaskStatus): void`
  - `deleteDoneByWorkspace(workspaceId: string): void`
  
  Commit: `feat(api): implement task repository with unit tests`

- [x] **Create `task/comment-repository.ts` with unit tests**
  
  (Consolidated into `task/repository.ts`)

- [x] **Create `task/log-repository.ts` with unit tests**
  
  (Consolidated into `task/repository.ts`)

- [x] **Create `task/queue-repository.ts` with unit tests**
  
  (Consolidated into `task/repository.ts`)

- [x] **Create `task/service.ts` with unit tests**
  
  Implement business logic:
  - `listTasks(workspaceId: string): Task[]`
  - `getTask(id: string): Task`
  - `createTask(workspaceId: string, input): Task` — Also creates queue item and log
  - `updateTask(id: string, input): Task`
  - `deleteTask(id: string): void` — Kill subprocess first (placeholder)
  - `changeStatus(id: string, status: TaskStatus): void`
  - `prioritizeTask(id: string): void`
  - `deprioritizeTask(id: string): void`
  - `cancelTask(id: string): void` — Kill subprocess, move to in_review
  - `addComment(taskId: string, input): TaskComment`
  - `getComments(taskId: string): TaskComment[]`
  - `getLogs(taskId: string): TaskLog[]`
  - `deleteDoneTasks(workspaceId: string): void`
  
  Commit: `feat(api): implement task service with unit tests`

- [x] **Create `task/schemas.ts`**
  
  Define Zod schemas for all task-related requests/responses.
  
  Commit: `feat(api): define task Zod schemas`

- [x] **Create `task/routes.ts`**
  
  Implement Hono routes:
  - `GET /workspaces/:id/tasks` — List tasks
  - `POST /workspaces/:id/tasks` — Create task
  - `GET /tasks/:id` — Get task
  - `PUT /tasks/:id` — Update task
  - `DELETE /tasks/:id` — Delete task
  - `POST /tasks/:id/prioritize` — Prioritize task
  - `POST /tasks/:id/cancel` — Cancel task
  - `DELETE /workspaces/:id/tasks/done` — Delete done tasks
  - `GET /tasks/:id/comments` — List comments
  - `POST /tasks/:id/comments` — Add comment
  - `GET /tasks/:id/logs` — List activity logs
  
  Commit: `feat(api): implement task routes`

- [x] **Create `task/index.ts`**
  
  Export public API.
  
  Commit: `chore(api): create task module index exports`

- [ ] **Add integration tests for task module**
  
  Create integration tests for repositories and service.
  
  Commit: `test(api): add task integration tests`

### 4.4 Chat Module

- [x] **Create `chat/types.ts`**
  
  Commit: `feat(api): define chat types`

- [x] **Create `chat/repository.ts` with unit tests**
  
  Commit: `feat(api): implement chat repository with unit tests`

- [x] **Create `chat/message-repository.ts` with unit tests**
  
  (Consolidated into `chat/repository.ts`)

- [x] **Create `chat/queue-repository.ts` with unit tests**
  
  (Consolidated into `chat/repository.ts`)

- [x] **Create `chat/service.ts` with unit tests**
  
  Commit: `feat(api): implement chat service with unit tests`

- [x] **Create `chat/schemas.ts`**
  
  Commit: `feat(api): define chat Zod schemas`

- [x] **Create `chat/routes.ts`**
  
  Commit: `feat(api): implement chat routes`

- [x] **Create `chat/index.ts`**
  
  Commit: `chore(api): create chat module index exports`

- [ ] **Add integration tests for chat module**
  
  Create integration tests for repositories and service.
  
  Commit: `test(api): add chat integration tests`

### 4.5 Settings Module

- [x] **Create `settings/types.ts`**
  
  Commit: `feat(api): define settings types`

- [x] **Create `settings/repository.ts` with unit tests**
  
  Commit: `feat(api): implement settings repository with unit tests`

- [x] **Create `settings/service.ts` with unit tests**
  
  Commit: `feat(api): implement settings service with unit tests`

- [x] **Create `settings/schemas.ts`**
  
  Commit: `feat(api): define settings Zod schemas`

- [x] **Create `settings/routes.ts`**
  
  Commit: `feat(api): implement settings routes`

- [x] **Create `settings/index.ts`**
  
  Commit: `chore(api): create settings module index exports`

### 4.6 Health Module

- [ ] **Create `health/types.ts`**
  
  Define TypeScript interfaces:
  - `HealthStatus`
  - `CliHealthStatus`
  
  Commit: `feat(api): define health types`

- [ ] **Create `health/service.ts` with unit tests**
  
  Implement health checks:
  - `getOverallHealth(): HealthStatus`
  - `getCliHealth(): CliHealthStatus[]`
  - `refreshCliHealth(): void` — Trigger CLI re-detection
  
  Commit: `feat(api): implement health service with unit tests`

- [ ] **Create `health/routes.ts`**
  
  Implement Hono routes:
  - `GET /health` — Overall health
  - `GET /health/cli` — CLI health status
  - `POST /health/cli/refresh` — Refresh CLI detection
  
  Commit: `feat(api): implement health routes`

- [ ] **Create `health/index.ts`**
  
  Export public API.
  
  Commit: `chore(api): create health module index exports`

---

## Phase 5: CLI Adapters

### 5.1 CLI Infrastructure

- [ ] **Create `cli/types.ts`**
  
  Define TypeScript interfaces:
  - `CliAdapter` interface with methods:
    - `invoke(inputPath: string, outputPath: string, cwd: string): Promise<void>`
    - `healthCheck(): Promise<CliHealthResult>`
  - `CliHealthResult` type
  - `CliInvocationOptions` type
  
  Commit: `feat(api): define CLI adapter types`

- [ ] **Create `cli/health.ts` with unit tests**
  
  Implement CLI health checking logic:
  - `checkCliHealth(cliType: CliType, binaryPath?: string): Promise<CliHealthResult>`
  - Binary discovery (search PATH or use custom path)
  - Run minimal test prompt
  - Timeout handling (30 seconds)
  - Parse exit code, stdout, stderr
  
  Commit: `feat(api): implement CLI health checking`

### 5.2 Claude Code Adapter

- [ ] **Create `cli/adapters/claude.ts` with unit tests**
  
  Implement Claude Code adapter:
  - Command template with flags:
    - `--dangerously-skip-permissions`
    - `--output-format json`
    - `--json-schema '{...}'`
    - `--prompt "Read the file at {input_path}..."`
  - Environment variable injection (inherit + override from settings)
  - `invoke()` method using `Bun.spawn()`
  - `healthCheck()` method
  
  Define JSON schema for task/chat output format.
  
  Commit: `feat(api): implement Claude Code CLI adapter`

- [ ] **Create `cli/index.ts`**
  
  Export adapter factory:
  - `getCliAdapter(cliType: CliType): CliAdapter`
  - Export types
  
  Commit: `chore(api): create CLI module index exports`

---

## Phase 6: Events & SSE

- [ ] **Create `events/types.ts`**
  
  Define event types:
  - `TaskStatusChangedEvent`
  - `TaskCommentAddedEvent`
  - `TaskErrorOccurredEvent`
  - `AgentExecutionStartedEvent`
  - `AgentExecutionFinishedEvent`
  - `ChatMessageAddedEvent`
  - `ChatProcessingStartedEvent`
  - `ChatProcessingFinishedEvent`
  
  Commit: `feat(api): define SSE event types`

- [ ] **Create `events/emitter.ts`**
  
  Implement event emitter singleton:
  - Create `EventEmitter` instance
  - Export `emit(eventType: string, payload: object): void`
  - Export `subscribe(handler: (event) => void): () => void`
  
  Commit: `feat(api): implement event emitter singleton`

- [ ] **Create `events/registry.ts`**
  
  Implement SSE connection registry:
  - `Set<Response>` for active connections
  - `addConnection(res: Response): void`
  - `removeConnection(res: Response): void`
  - `broadcast(event: string, data: object): void`
  
  Commit: `feat(api): implement SSE connection registry`

- [ ] **Create `events/routes.ts`**
  
  Implement SSE endpoint:
  - `GET /events` — SSE stream
  - Send `:ok` comment on connect
  - Set `retry: 3000` header
  - Handle disconnect cleanup
  - Format: `event: {type}\ndata: {json}\n\n`
  
  Commit: `feat(api): implement SSE endpoint`

- [ ] **Create `events/index.ts`**
  
  Export public API.
  
  Commit: `chore(api): create events module index exports`

---

## Phase 7: Notifications

- [ ] **Create `notifications/types.ts`**
  
  Define notification types:
  - `NotificationEvent` enum: `error_occurred`, `task_in_review`
  - `NotificationPayload` type
  
  Commit: `feat(api): define notification types`

- [ ] **Create `notifications/mailgun.ts` with unit tests**
  
  Implement Mailgun API client:
  - `sendEmail(to: string, subject: string, body: string): Promise<void>`
  - Use fetch API to call Mailgun
  - Handle errors gracefully
  
  Commit: `feat(api): implement Mailgun API client`

- [ ] **Create `notifications/service.ts` with unit tests**
  
  Implement notification service:
  - `notify(event: NotificationEvent, payload: NotificationPayload): Promise<void>`
  - Check if notifications enabled for event
  - Check if Mailgun configured
  - Fire-and-forget (log errors, don't throw)
  
  Commit: `feat(api): implement notification service`

- [ ] **Create `notifications/index.ts`**
  
  Export public API.
  
  Commit: `chore(api): create notifications module index exports`

---

## Phase 8: Runner & Jobs

### 8.1 Runner Infrastructure

- [ ] **Create `runner/types.ts`**
  
  Define runner types:
  - `TaskContext` — Full context for CLI input
  - `TaskOutput` — Parsed CLI output
  - `ChatContext` — Full context for chat CLI input
  - `ChatOutput` — Parsed chat CLI output
  - `AgentAction` types (skip, comment, change_status)
  - `ChatAction` types (create_agent, update_agent, etc.)
  
  Commit: `feat(api): define runner types`

- [ ] **Create `runner/subprocess.ts`**
  
  Implement subprocess tracking:
  - `Map<string, Subprocess>` for task subprocesses (keyed by task ID)
  - `Map<string, Subprocess>` for chat subprocesses (keyed by chat ID)
  - `trackTaskProcess(taskId: string, proc: Subprocess): void`
  - `trackChatProcess(chatId: string, proc: Subprocess): void`
  - `killTaskProcess(taskId: string): void`
  - `killChatProcess(chatId: string): void`
  - `killWorkspaceProcesses(workspaceId: string): void`
  
  Commit: `feat(api): implement subprocess tracking`

- [ ] **Create `runner/input-builder.ts` with unit tests**
  
  Implement input file generation:
  - `buildTaskInput(task: Task, agent: Agent, workspace: Workspace): string`
    - Generate markdown file content per TECHNICAL_DESIGN.md format
    - Include workspace instruction, agent instruction, task details
    - Comments and activity logs in JSONL format
  - `buildChatInput(chat: Chat, agent: Agent | null, workspace: Workspace): string`
    - Generate chat input file content
    - Include conversation history in JSONL format
  - `buildChatContext(workspace: Workspace, agents: Agent[]): string`
    - Generate context file with workspace state
  
  Commit: `feat(api): implement CLI input file builders`

- [ ] **Create `runner/output-parser.ts` with unit tests**
  
  Implement output file parsing:
  - `parseTaskOutput(filePath: string): TaskOutput`
    - Read JSON file
    - Validate against expected schema
    - Return parsed actions
  - `parseChatOutput(filePath: string): ChatOutput`
    - Read JSON file
    - Validate against expected schema
    - Return message and actions
  - Handle all error cases from TECHNICAL_DESIGN.md:
    - Output file missing
    - Output file empty
    - JSON parse failure
    - Schema validation failure
  
  Commit: `feat(api): implement CLI output parsers`

### 8.2 Task Worker

- [ ] **Create `runner/task-worker.ts` with unit tests**
  
  Implement task processing logic:
  - `processTask(queueItem: TaskQueueItem): Promise<void>`
  - Fetch task, workspace, agents
  - Move task to "In Progress" if in "Todo"
  - Loop through agents by order:
    1. Build input file
    2. Invoke CLI adapter
    3. Parse output file
    4. Execute actions (skip/comment/change_status)
    5. If change_status to "In Review", stop loop
  - After all agents:
    - If any comment added: retrigger loop
    - If all skipped: move to "In Review"
  - Error handling: add system comment, stop loop
  - Update queue item status
  - Emit SSE events
  
  Commit: `feat(api): implement task worker`

- [ ] **Create `runner/action-executor.ts` with unit tests**
  
  Implement action execution for tasks:
  - `executeTaskActions(taskId: string, actions: AgentAction[]): void`
  - Handle `skip`, `comment`, `change_status` actions
  - Create activity log entries
  - Update workspace last_activity_at
  
  Commit: `feat(api): implement task action executor`

### 8.3 Chat Worker

- [ ] **Create `runner/chat-worker.ts` with unit tests**
  
  Implement chat processing logic:
  - `processChat(queueItem: ChatQueueItem): Promise<void>`
  - Fetch chat, workspace, agent (or use Malamar agent)
  - Determine CLI to use (override > agent default > first healthy)
  - Build input file and context file
  - Invoke CLI adapter
  - Parse output file
  - Add agent message to chat
  - Execute actions (create_agent, update_agent, etc.)
  - Handle rename_chat (only on first agent response)
  - Update queue item status
  - Emit SSE events
  
  Commit: `feat(api): implement chat worker`

- [ ] **Create `runner/chat-action-executor.ts` with unit tests**
  
  Implement action execution for chats (Malamar agent):
  - `executeChatActions(chatId: string, actions: ChatAction[]): ActionResult[]`
  - Handle actions:
    - `create_agent` — Create agent in workspace
    - `update_agent` — Update existing agent
    - `delete_agent` — Delete agent
    - `reorder_agents` — Change agent order
    - `update_workspace` — Update workspace settings
    - `rename_chat` — Rename chat title (first response only)
  - Execute all actions, collect errors
  - Add system message if any action failed
  
  Commit: `feat(api): implement chat action executor`

### 8.4 Runner Loop

- [ ] **Create `runner/index.ts`**
  
  Implement main runner loop:
  - Poll every `MALAMAR_RUNNER_POLL_INTERVAL` ms
  - Query for workspaces with queued task items
  - Track active workers in `Set<string>` (workspace IDs)
  - For each workspace with work and no active worker:
    - Spawn async worker function
    - Worker processes task, removes itself from Set when done
  - Implement queue pickup algorithm:
    1. Status filter (only "Todo" or "In Progress" tasks)
    2. Priority flag first
    3. Most recently processed task
    4. LIFO fallback
  - Separate loop for chat queue (simpler, no workspace limit)
  - Export `startRunner()`, `stopRunner()`
  
  Commit: `feat(api): implement runner main loop`

### 8.5 Scheduled Jobs

- [ ] **Create `jobs/cleanup.ts`**
  
  Implement cleanup job:
  - Delete completed/failed task queue items > 7 days old
  - Delete completed/failed chat queue items > 7 days old
  - Delete done tasks exceeding workspace retention period
  - Run daily + once on startup
  
  Commit: `feat(api): implement cleanup job`

- [ ] **Create `jobs/health-check.ts`**
  
  Implement CLI health check job:
  - Check all supported CLIs
  - Store status and error message in memory
  - Run every 5 minutes + once on startup
  
  Commit: `feat(api): implement CLI health check job`

- [ ] **Create `jobs/index.ts`**
  
  Implement job scheduler:
  - `startJobs()` — Start all scheduled jobs
  - `stopJobs()` — Stop all jobs (for shutdown)
  - Use `setInterval` for scheduling
  - Run jobs once immediately on startup
  
  Commit: `feat(api): implement job scheduler`

---

## Phase 9: CLI Commands

- [ ] **Create `commands/serve.ts`**
  
  Implement default serve command:
  - Initialize config
  - Initialize database, run migrations
  - Check first startup, create sample workspace if needed
  - Start background jobs
  - Create Hono app
  - Start HTTP server
  - Register shutdown handlers
  
  Commit: `feat(api): implement serve command`

- [ ] **Create `commands/version.ts`**
  
  Implement version command:
  - Print version from package.json
  - Exit with code 0
  
  Commit: `feat(api): implement version command`

- [ ] **Create `commands/help.ts`**
  
  Implement help command:
  - Print usage information
  - List available commands and flags
  - Exit with code 0
  
  Commit: `feat(api): implement help command`

- [ ] **Create `commands/doctor.ts`**
  
  Implement doctor command:
  - Check data directory (exists, writable)
  - Check database (accessible, migrations current)
  - Check configuration (valid)
  - Check CLI health status
  - Print results with ✓/✗ indicators
  - Exit code 0 if critical checks pass, non-zero otherwise
  
  Commit: `feat(api): implement doctor command`

- [ ] **Create `commands/config.ts`**
  
  Implement config command:
  - Print current configuration
  - Show effective values after defaults/flags/env resolution
  - Exit with code 0
  
  Commit: `feat(api): implement config command`

- [ ] **Create `commands/index.ts`**
  
  Implement command dispatcher:
  - Parse `process.argv` to determine command
  - Dispatch to appropriate command handler
  - Default to `serve` if no command specified
  - Handle `--help`, `--version` flags
  
  Commit: `feat(api): implement command dispatcher`

---

## Phase 10: Application Assembly

- [ ] **Create `app.ts`**
  
  Implement Hono app assembly:
  - Create Hono app instance
  - Mount all route modules:
    - `/api/workspaces` — workspaceRoutes
    - `/api/agents` — agentRoutes (for direct agent endpoints)
    - `/api/tasks` — taskRoutes (for direct task endpoints)
    - `/api/chats` — chatRoutes (for direct chat endpoints)
    - `/api/settings` — settingsRoutes
    - `/api/health` — healthRoutes
    - `/api/events` — eventsRoutes
  - Add error handling middleware
  - Add request logging middleware
  - Static file serving from `public/` (placeholder for now)
  - SPA fallback for non-API routes
  
  Commit: `feat(api): implement Hono app assembly`

- [ ] **Update `index.ts` entry point**
  
  Replace placeholder with proper entry point:
  - Import commands dispatcher
  - Run the appropriate command
  
  Commit: `feat(api): update entry point to use command dispatcher`

---

## Phase 11: First Startup & Sample Data

- [ ] **Create `instructions/sample-workspace.ts`**
  
  Define sample workspace and agents:
  - Copy content from `APPENDIX_ONBOARDING_RESOURCES.md`
  - Export `createSampleWorkspace(): void`
  - Create workspace with title "Sample: Code Assistant"
  - Create 4 agents: Planner, Implementer, Reviewer, Approver
  - Each with full instructions from appendix
  
  Commit: `feat(api): implement sample workspace creation`

- [ ] **Create `instructions/malamar-agent.ts`**
  
  Define Malamar agent instruction:
  - Copy content from `APPENDIX_ONBOARDING_RESOURCES.md`
  - Export `getMalamarAgentInstruction(): string`
  - This is hardcoded, not stored in database
  
  Commit: `feat(api): implement Malamar agent instruction`

- [ ] **Create `instructions/index.ts`**
  
  Export public API.
  
  Commit: `chore(api): create instructions module index exports`

- [ ] **Implement first startup detection in serve command**
  
  Update `commands/serve.ts`:
  - Check if data directory exists
  - If not: `isFirstLaunch = true`, create directory
  - After migrations: if first launch, call `createSampleWorkspace()`
  - Ensure sample workspace is only created once
  
  Commit: `feat(api): implement first startup detection and sample data creation`

---

## Phase 12: Graceful Shutdown

- [ ] **Implement shutdown handlers**
  
  Update `commands/serve.ts`:
  - Register handlers for `SIGTERM` and `SIGINT`
  - On signal:
    1. Stop accepting new queue pickups
    2. Kill all active CLI subprocesses
    3. Wait briefly for subprocesses to exit
    4. Close SSE connections
    5. Close database connection
    6. Exit process
  
  Commit: `feat(api): implement graceful shutdown`

- [ ] **Implement startup recovery**
  
  Update runner initialization:
  - Find queue items with status "in_progress"
  - Reset them to "queued"
  - Runner picks them up naturally
  
  Commit: `feat(api): implement startup recovery for interrupted tasks`

---

## Phase 13: E2E Tests

- [ ] **Create `e2e/helpers/server.ts`**
  
  Implement E2E test helpers:
  - `TEST_PORT` constant
  - `TEST_DATA_DIR` constant (`/tmp/malamar-test`)
  - `startServer()` — Clean data, spawn server process, wait for healthy
  - `stopServer()` — Kill server, clean data
  - `getBaseUrl()` — Return test server URL
  - `getDb()` — Return read-only database connection for assertions
  
  Commit: `test(api): implement E2E test helpers`

- [ ] **Create `e2e/workspace.test.ts`**
  
  Implement workspace E2E tests:
  - Create workspace and verify in DB
  - List workspaces
  - Update workspace
  - Delete workspace with cascade
  - Search workspaces
  
  Commit: `test(api): add workspace E2E tests`

- [ ] **Create `e2e/agent.test.ts`**
  
  Implement agent E2E tests:
  - Create agent in workspace
  - List agents (verify order)
  - Update agent
  - Delete agent
  - Reorder agents
  - Unique name validation
  
  Commit: `test(api): add agent E2E tests`

- [ ] **Create `e2e/task.test.ts`**
  
  Implement task E2E tests:
  - Create task
  - Update task
  - Delete task
  - Add comment
  - Get activity logs
  - Prioritize/deprioritize
  - Status transitions
  
  Commit: `test(api): add task E2E tests`

- [ ] **Create `e2e/chat.test.ts`**
  
  Implement chat E2E tests:
  - Create chat
  - Send message
  - List messages
  - Update chat (title, agent, CLI)
  - Delete chat
  - Search chats
  
  Commit: `test(api): add chat E2E tests`

- [ ] **Create `e2e/settings.test.ts`**
  
  Implement settings E2E tests:
  - Get settings
  - Update settings
  - Test email endpoint (mock or skip if no Mailgun)
  
  Commit: `test(api): add settings E2E tests`

- [ ] **Create `e2e/health.test.ts`**
  
  Implement health E2E tests:
  - Overall health endpoint
  - CLI health endpoint
  - CLI refresh endpoint
  
  Commit: `test(api): add health E2E tests`

- [ ] **Create `e2e/sse.test.ts`**
  
  Implement SSE E2E tests:
  - Connect to SSE endpoint
  - Verify initial `:ok` comment
  - Trigger event and verify receipt
  - Disconnect handling
  
  Commit: `test(api): add SSE E2E tests`

---

## Phase 14: Follow-up Items

These items are lower priority and can be implemented after the core system is working.

### File Attachments

- [ ] **Implement chat file attachment handling**
  
  Update chat module:
  - Handle `POST /chats/:id/attachments` endpoint
  - Store files in `/tmp/malamar_chat_{chat_id}_attachments/`
  - Add system message noting file path
  - Handle duplicate filename overwrites
  
  Commit: `feat(api): implement chat file attachments`

### Static File Serving

- [ ] **Implement static file serving for frontend**
  
  Update `app.ts`:
  - Serve files from `public/` directory
  - Set appropriate Content-Type headers
  - Set cache headers for hashed filenames
  - SPA fallback (serve index.html for non-API routes)
  
  Commit: `feat(api): implement static file serving`

---

## Completion Checklist

When all items are complete, verify:

- [ ] All unit tests pass (`bun test src/`)
- [ ] All integration tests pass (`bun test tests/`)
- [ ] All E2E tests pass (`bun test e2e/`)
- [ ] Linter passes (`bun run lint`)
- [ ] Server starts successfully (`bun run start`)
- [ ] Sample workspace is created on first startup
- [ ] CLI health check works
- [ ] Task processing loop works with Claude Code
- [ ] Chat processing works with Malamar agent
- [ ] SSE events are broadcast correctly
- [ ] Graceful shutdown works
