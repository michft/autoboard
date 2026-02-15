# Autoboard

Monorepo: Vite + React frontend and Hono API with a layered backend (Controller → Use Case → Persistence).

## Structure

- **apps/web** – Vite + React, Jotai, React Router
- **apps/api** – Hono server, controllers, auto-mode loop
- **packages/db** – Drizzle schema, migrations, repositories
- **packages/domain** – Use cases (business logic)
- **packages/services** – Agent, Claude provider, card-run state
- **packages/shared** – Shared types and errors

## Developing

```bash
pnpm install
pnpm dev
```

Runs the API (port 3001) and the web app (Vite). The web app proxies `/api`
to the API.

## Building

```bash
pnpm build
```

Before you run `pnpm dev`, make sure the shared packages that the API imports
are built so Node can resolve their `dist` entry points. Run the database and
domain builds first and then start the workspace dev server:

```bash
pnpm --filter @autoboard/db build
pnpm --filter @autoboard/domain build
pnpm dev
```

If you ever switch Node versions (for example upgrading past v22),
rebuild native bindings before starting the server so `better-sqlite3`
re-compiles for the current `NODE_MODULE_VERSION`:

```bash
pnpm rebuild better-sqlite3
```

When working in development you may also see `pnpm` warn about deprecated
`@esbuild-kit/core-utils`/`@esbuild-kit/esm-loader`; they are pulled in by
`drizzle-kit` and safe to ignore for now, but keep an eye on future kit
releases or use a local patch/override if you want to silence the warning.

## Database

Migrations and DB live in `packages/db`:

```bash
pnpm db:generate   # generate migrations
pnpm db:migrate    # run migrations
pnpm db:push       # push schema
pnpm db:studio     # Drizzle Studio
```

## Seeding tasks from a YAML plan

`seed-tasks-sqlite.mjs` lives under `scripts/` and imports TODOs from YAML plans into `packages/db/drizzle/db.sqlite`. Run it from the workspace root so pnpm can resolve native modules such as `better-sqlite3` before the script executes:

```bash
pnpm install
pnpm exec node scripts/seed-tasks-sqlite.mjs \
  --file=~/PATH-TO/plans/tasks.yaml \
  --project-path=~/PATH-TO-PROJECT-REPO \
  --dry-run
```

Use the script's built-in `--help` for the full list of flags, common options include:

- `--file` / `--tasks` (required): path to the YAML plan
- `--project-path`, `--project-name`, `--project-id`: choose the target project
- `--column`: Kanban column (`todo` by default)
- `--include-completed`: insert tasks already marked complete
- `--dry-run`: preview inserts without changing the database

Because it is not published as a bin, run it through `pnpm exec node scripts/seed-tasks-sqlite.mjs` (or from any package that depends on `better-sqlite3`).

## Engine

Node.js >= 22.
