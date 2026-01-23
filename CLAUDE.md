# Malamar

> **Malamar lets you combine the strengths of different AI CLIs into autonomous multi-agent workflows, limited only by your creativity.**

## What is Malamar?

Malamar is a multi-agent workflow orchestration tool that combines different AI CLI tools (Claude Code, Gemini CLI, Codex CLI, OpenCode) into autonomous workflows. Each agent processes tasks sequentially, with the loop continuing until all agents agree there's nothing more to do or human attention is needed.

### Core Value

- **Self-correcting**: Sequential agents catch mistakes a single session would miss
- **Fresh context**: Each agent starts clean, no long-session degradation
- **Structured autonomy**: Work progresses through natural checkpoints without supervision
- **CLI flexibility**: Each step can use the tool best suited for the job

---

## Specs Repository

Product requirements, technical design, and meeting minutes live in a **separate specs repository**:

**Location**: `/Users/irvingdinh/Workspace/github.com/malamar-dev/specs`

### When to Use Specs

- **MUST** use the `specs-first` skill at the start of each new conversation before coding
- Consult specs when implementing new features or making architectural decisions
- Check `MEETING-MINUTES/` for detailed implementation guidance on specific areas

### When to Use CLAUDE.md

- For code conventions, patterns, and tooling within this repository
- For understanding how the codebase is organized
- For common pitfalls and best practices specific to implementation

### Conflict Resolution

If there's a conflict between specs and existing code, **ask the user for clarification** before proceeding.

---

## Monorepo Structure

This is a monorepo with two independent packages:

```
malamar/
├── api/           # Backend - Bun, Hono, SQLite
├── ui/            # Frontend - React, Vite, shadcn/ui
├── Makefile       # Development commands
└── CLAUDE.md      # This file
```

### Shared Nothing Architecture

- `api/` and `ui/` are completely independent
- No shared packages or code between them
- API serves REST endpoints; UI consumes them
- UI proxies `/api/*` requests to the backend in development

### Package-Specific Documentation

- **Backend**: See `api/CLAUDE.md` for backend conventions, architecture, and patterns
- **Frontend**: See `ui/CLAUDE.md` for frontend conventions, components, and styling

---

## Development Commands

Use the Makefile for all development tasks:

### Full Stack

| Command | Description |
|---------|-------------|
| `make dev` | Run both API and UI in parallel (API on :3456, UI on :5137) |
| `make install` | Install dependencies for both packages |
| `make lint` | Run linting for both packages |
| `make fix` | Auto-fix lint issues for both packages |

### Individual Packages

| Command | Description |
|---------|-------------|
| `make dev-api` | Run API only |
| `make dev-ui` | Run UI only |
| `make install-api` | Install API dependencies |
| `make install-ui` | Install UI dependencies |
| `make lint-api` | Lint API |
| `make lint-ui` | Lint UI |
| `make fix-api` | Fix API lint issues |
| `make fix-ui` | Fix UI lint issues |

### Ports

- **API**: `http://localhost:3456`
- **UI**: `http://localhost:5137` (proxies `/api/*` to API)

---

## Shared Guidelines

These apply to both `api/` and `ui/` packages.

### Runtime and Package Manager

**MUST** use Bun everywhere:

- `bun install` - not npm, yarn, or pnpm
- `bun run <script>` - not npm run
- `bun test` - not jest or vitest directly
- `bunx <package>` - not npx

### TypeScript

- Strict mode enabled in both packages
- Prefer explicit types over inference for function signatures
- Use `interface` for object shapes, `type` for unions/intersections

### Code Quality

- **ESLint + Prettier** enforced via pre-commit hooks
- **simple-import-sort** plugin organizes imports automatically
- Run `make fix` before committing to auto-fix issues

### Git Conventions

- Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- Keep commits focused and atomic
- Write meaningful commit messages describing the "why"

---

## File Organization Principles

Both packages follow similar organizational principles:

1. **Feature-based organization**: Group related code by feature/domain, not by type
2. **Explicit exports**: Use `index.ts` files to define public module interfaces
3. **Co-location**: Keep related files together (types with their feature, tests with their code)
4. **Flat when possible**: Avoid deep nesting; prefer flatter structures

---

## Common Pitfalls (Cross-Package)

### Don't

- Use Node.js APIs directly (use Bun equivalents)
- Install packages with npm/yarn/pnpm
- Create deeply nested folder structures
- Mix concerns across feature boundaries

### Do

- Check existing patterns before implementing new features
- Keep the three-layer architecture (routes/service/repository for API)
- Use React Query for all server state (UI)
- Reference existing files as examples rather than inventing new patterns

---

## Quick Reference

| Need | Where to Look |
|------|---------------|
| Product requirements | Specs repo → `SPECS.md` |
| Technical design | Specs repo → `TECHNICAL_DESIGN.md` |
| Backend conventions | `api/CLAUDE.md` |
| Frontend conventions | `ui/CLAUDE.md` |
| Development commands | This file → Development Commands |
| Specific implementation guidance | Specs repo → `MEETING-MINUTES/` |
