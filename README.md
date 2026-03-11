# Chronos

A local-first Todo & Timer web app with cloud sync. Built with Svelte 5, Cloudflare Pages Functions, and Drizzle ORM on D1.

![Chronos Header](https://raw.githubusercontent.com/quantavil/Chronos/main/public/header.png)

## Features

- **Per-task timers** — track exactly how long you spend on each task, with a running ticker and estimated time progress bar
- **Subtasks & rich notes** — break tasks down and add context with a Tiptap editor
- **Lists & tags** — organise tasks into custom lists, filter and group by tag, priority, or due date
- **Recurring tasks** — daily, weekday, weekly, biweekly, monthly, or custom recurrence with automatic next-occurrence creation
- **Undo system** — 30-second undo window for deletes and bulk operations
- **Local-first sync** — works offline; dirty items are pushed to the server on next connection using an optimistic sync strategy
- **Focus mode** — pause all distractions and concentrate on one task
- **Dark / Light / System theme**

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Svelte 5 (Runes), Tailwind CSS 4, Tiptap |
| Backend | Cloudflare Pages Functions (TypeScript) |
| Database | Cloudflare D1 (SQLite) via Drizzle ORM |
| Auth | Better Auth (email/password) |
| Build | Vite 5 |
| Tests | Vitest (143 tests) |

## Local Development

**Prerequisites:** Bun, Wrangler CLI

```bash
# Install dependencies
bun install

# Apply migrations to local D1
bunx wrangler d1 migrations apply chronos --local

# Start dev server (Vite frontend + Wrangler Pages Functions)
bunx wrangler pages dev --d1 DB=chronos -- bun run dev
```

Copy `.dev.vars.example` to `.dev.vars` (never commit this file):

```
BETTER_AUTH_SECRET=some_random_secret
BETTER_AUTH_URL=http://localhost:8788
```

## Deployment

```bash
# Build the frontend
bun run build

# Apply migrations to production D1
bunx wrangler d1 migrations apply chronos --remote

# Deploy to Cloudflare Pages
bunx wrangler pages deploy dist
```

## Database Migrations

Migrations live in `migrations/`. To generate a new migration after changing `functions/db/schema.ts`:

```bash
bunx drizzle-kit generate
bunx wrangler d1 migrations apply chronos --local   # local
bunx wrangler d1 migrations apply chronos --remote  # production
```

## Architecture

```
src/
  lib/
    models/      # TodoModel — reactive domain object (Svelte 5 $state)
    stores/      # TodoList, SyncCoordinator, AuthManager, TimerStore, UndoManager, DisplayEngine
    services/    # StorageService — localStorage persistence + sync orchestration
    utils/       # api.ts, formatTime.ts, recurrence.ts, smartInput.ts
    types.ts     # Central repository of all TypeScript types and constants
functions/
  api/
    todos/       # GET /api/todos, POST, PATCH (batch), PATCH /:id, DELETE /:id
    shared/      # auth.ts — Better Auth instance + getDb() helper
  db/
    schema.ts    # Drizzle schema (user, session, account, verification, todos)
migrations/      # SQL migration files tracked by Drizzle Kit
```

**Sync strategy:** local-dirty items are pushed first (`Promise.allSettled`), then the server state is fetched and merged. Local-dirty always wins; clean local items take the server version; items missing from the server are assumed deleted.

## License

GPL-3.0