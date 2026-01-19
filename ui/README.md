# Malamar UI

Frontend application for Malamar — a tool that orchestrates multiple AI coding assistants into autonomous multi-agent workflows.

<!-- TODO: Add screenshot or GIF demo here -->
<!-- ![Malamar UI Screenshot](./docs/screenshot.png) -->

## Tech Stack

| Category | Technology |
|----------|------------|
| Runtime | [Bun](https://bun.sh) v1.3.5+ |
| Framework | React 19 |
| Build Tool | Vite 7 |
| Routing | React Router 7 |
| Server State | TanStack React Query |
| Client State | Zustand |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui (Radix UI) |
| Forms | React Hook Form + Zod |

## Getting Started

### Prerequisites

- **Bun** v1.3.5 or later — [Install Bun](https://bun.sh)

### Installation

```bash
# Clone the repository (if not already)
git clone https://github.com/malamar-dev/malamar.git
cd malamar/ui

# Install dependencies
bun install

# Start development server
bun run dev
```

The dev server starts at `http://localhost:5173` with API requests proxied to `http://localhost:3456`.

## Project Structure

```
ui/
├── src/
│   ├── components/      # Shared UI components
│   │   ├── ui/          # shadcn/ui primitives (don't edit directly)
│   │   ├── layouts/     # RootLayout, WorkspaceLayout
│   │   └── skeletons/   # Loading skeletons
│   ├── features/        # Feature modules
│   │   ├── workspace/   # Workspace management
│   │   ├── task/        # Kanban board, task details
│   │   ├── chat/        # Chat interface
│   │   ├── agent/       # Agent configuration
│   │   └── settings/    # Global settings
│   ├── hooks/           # Shared hooks (SSE, etc.)
│   ├── lib/             # Utilities (api-client, query-client)
│   ├── routes/          # React Router configuration
│   ├── stores/          # Zustand stores
│   ├── types/           # Shared TypeScript types
│   ├── App.tsx          # Root component with providers
│   └── main.tsx         # Application entry point
├── public/              # Static assets
└── index.html           # HTML template
```

For detailed architecture documentation, see [`CLAUDE.md`](./CLAUDE.md).

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:3456` | Backend API URL (used by Vite proxy in development) |

Copy `.env.example` to `.env.local` for local overrides (if needed).

## Development

```bash
# Start dev server with hot reload
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview

# Lint code
bun run lint

# Format code
bun run format
```

## Specs & Documentation

Product requirements and technical design live in a separate specs repository:

| Document | Description |
|----------|-------------|
| [`SPECS.md`](https://github.com/malamar-dev/specs/blob/main/SPECS.md) | Product specifications — what Malamar does and why |
| [`TECHNICAL_DESIGN.md`](https://github.com/malamar-dev/specs/blob/main/TECHNICAL_DESIGN.md) | Technical design — how Malamar is implemented |
| `SESSION-013.md` | Frontend repository structure and conventions |

Local specs path: `/Users/irvingdinh/Workspace/github.com/malamar-dev/specs`

## Contributing

1. Check the specs before implementing new features
2. Follow the coding conventions in [`CLAUDE.md`](./CLAUDE.md)
3. Ensure `bun run lint` and `bun run format` pass before committing
4. Create feature branches from `main`

## License

This project is proprietary. See the root repository for license details.
