# Malamar API

Backend API for Malamar - a tool that combines the strengths of different AI CLIs into autonomous multi-agent workflows.

## Specs

Product requirements and technical design live in a separate specs repository:

**Location:** [malamar-dev/specs](https://github.com/malamar-dev/specs) (or locally at `/Users/irvingdinh/Workspace/github.com/malamar-dev/specs`)

| Document | What's in it |
|----------|--------------|
| `SPECS.md` | Product specifications - what Malamar does and why |
| `TECHNICAL_DESIGN.md` | Technical design - how Malamar is implemented |
| `MEETING-MINUTES/SESSION-011.md` | Backend implementation details (SQLite, SSE, subprocess, etc.) |
| `MEETING-MINUTES/SESSION-012.md` | Backend repository structure and conventions |

## Prerequisites

- **Bun** v1.3.5 or later - [bun.sh](https://bun.sh)
- SQLite is bundled with Bun, no separate installation needed

## Getting Started

```bash
# Install dependencies
bun install

# Start the server (with watch mode)
bun run dev

# Or start without watch
bun run start
```

The server starts at `http://127.0.0.1:3456` by default.

## Project Structure

```
api/
├── src/           # Source code (modular monolith)
├── migrations/    # SQL migration files
├── tests/         # Integration tests
├── e2e/           # End-to-end tests
└── public/        # Frontend build output (populated before production build)
```

See `CLAUDE.md` for detailed architecture documentation.

## CLI Commands

### `malamar` / `malamar serve`

Start the Malamar server (default command).

```bash
malamar
malamar serve
malamar serve --port 8080
```

### `malamar version`

Print version information.

```bash
malamar version
malamar -v
malamar --version
```

### `malamar help`

Show usage information.

```bash
malamar help
malamar -h
malamar --help
```

### `malamar doctor`

Check system health and configuration. Verifies:
- Data directory exists and is writable
- Database is accessible with current migrations
- CLI tools (Claude, Gemini, Codex, OpenCode) are available

```bash
malamar doctor
```

### `malamar config`

Show current configuration (resolved from defaults, CLI flags, and environment variables).

```bash
malamar config
```

## Environment Variables

All settings can be configured via environment variables or CLI flags. Environment variables take precedence over CLI flags.

| Variable | CLI Flag | Default | Description |
|----------|----------|---------|-------------|
| `MALAMAR_HOST` | `--host` | `127.0.0.1` | Server host |
| `MALAMAR_PORT` | `--port` | `3456` | Server port |
| `MALAMAR_DATA_DIR` | `--data-dir` | `~/.malamar` | Data directory (database, attachments) |
| `MALAMAR_LOG_LEVEL` | `--log-level` | `info` | Log level: `debug`, `info`, `warn`, `error` |
| `MALAMAR_LOG_FORMAT` | `--log-format` | `text` | Log format: `text`, `json` |
| `MALAMAR_RUNNER_POLL_INTERVAL` | `--runner-poll-interval` | `1000` | Runner poll interval in milliseconds |
| `MALAMAR_TEMP_DIR` | `--temp-dir` | System temp | Temporary directory for task working dirs |

## API Endpoints

The API is organized around these resource groups:

| Group | Base Path | Description |
|-------|-----------|-------------|
| Workspaces | `/api/workspaces` | Workspace CRUD and settings |
| Agents | `/api/agents`, `/api/workspaces/:id/agents` | Agent CRUD and reordering |
| Tasks | `/api/tasks`, `/api/workspaces/:id/tasks` | Task CRUD, comments, activity logs |
| Chats | `/api/chats`, `/api/workspaces/:id/chats` | Chat CRUD and messages |
| Settings | `/api/settings` | Global settings (Mailgun, CLI config) |
| Health | `/api/health` | Health check endpoints |
| Events | `/api/events` | Server-sent events (SSE) |

All endpoints return JSON. Error responses follow this format:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Workspace not found"
  }
}
```

## Testing

Three test types with distinct purposes:

| Type | Location | What it tests |
|------|----------|---------------|
| Unit | `src/**/*.test.ts` | Individual functions with mocked dependencies |
| Integration | `tests/` | Service layers with real database |
| E2E | `e2e/` | HTTP requests against a running server |

### Running Tests

```bash
# All tests
bun run test

# By type
bun run test:unit
bun run test:integration
bun run test:e2e

# Single file
bun test src/workspace/service.test.ts
bun test e2e/workspace.test.ts
```

E2E tests are self-contained - they start/stop their own server instance using a separate test data directory (`/tmp/malamar-test`). They never touch `~/.malamar`.

## Development

```bash
# Start with watch mode (auto-restart on changes)
bun run dev

# Lint
bun run lint

# Format
bun run format
```

The dev server runs at `http://127.0.0.1:3456` by default. Use `--port` or `MALAMAR_PORT` to change it.
