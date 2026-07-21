# .bob/AGENTS.md

You (the AI assistant) are working on a project scaffolded from Bob's
Node/tRPC/Postgres/React greenfield template
(`rfs-internal/bob-template-node-pg-react`). This file exists to
answer the questions you'd otherwise waste turns on.

## Layout in one screen

```
package.json                             pnpm workspace root
pnpm-workspace.yaml                      → [backend, frontend]
.npmrc                                   pnpm settings (auto-install-peers)

backend/                                 Fastify + tRPC v11 + Drizzle
├── package.json
├── tsconfig.json
├── drizzle.config.ts                    drizzle-kit config (for `pnpm db:generate`)
├── migrations/                          drizzle-kit output (kept in-repo)
└── src/
    ├── index.ts                         server entrypoint — Fastify + tRPC plugin
    ├── env.ts                           parsed process.env (DATABASE_URL, PORT, NODE_ENV)
    ├── db/
    │   ├── index.ts                     drizzle client + postgres.js connection
    │   ├── schema.ts                    pgTable definitions (todos, ...)
    │   └── migrate.ts                   idempotent bootstrap migration (dev auto-run)
    └── trpc/
        ├── trpc.ts                      initTRPC + reusable procedures
        ├── context.ts                   createContext (db, req, res)
        ├── router.ts                    root router — exports `AppRouter` type
        └── routers/
            └── todos.ts                 vertical slice: procedures for /trpc/todos.*

frontend/                                React 19 + Vite 7 + TS + Tailwind 4 + TanStack Router
├── package.json                         depends on `backend: workspace:*` (types only)
├── tsconfig.json
├── vite.config.ts
├── index.html
└── src/
    ├── main.tsx                         QueryClient + tRPC client + Router
    ├── index.css                        Tailwind 4 + oklch design tokens (light + dark)
    ├── trpc.ts                          createTRPCReact<AppRouter>() — imports type from `backend`
    ├── routes/                          TanStack Router file-based routes
    │   ├── __root.tsx
    │   └── index.tsx                    Todos UI using trpc.todos.*.useQuery/useMutation
    ├── lib/utils.ts                     `cn()` helper (clsx + tailwind-merge)
    └── components/ui/button.tsx         shadcn Button primitive

.bob/                                    Bob VM wiring
├── config.yaml
├── AGENTS.md                            (this file)
├── README.md
└── hooks/post_clone.sh                  Installs Postgres 15 via dnf, boots it
```

## Runtime shape (already wired)

- **Postgres 15** on `127.0.0.1:5432`, database `app`, user `postgres`,
  password `postgres` (though `trust` auth is configured so the
  password is effectively ignored on localhost). Installed and started
  by `.bob/hooks/post_clone.sh` via `dnf` and `pg_ctl` — **not** via
  Docker, because Bob's Firecracker MicroVMs don't allow nested virt.
- **Node 22** is already in Bob's base image. `pnpm` too (`pnpm@9.15.0`
  is pinned in the root `package.json`'s `packageManager` field).
- **Backend** on `http://127.0.0.1:5000` via `tsx watch` — TypeScript
  edits hot-reload. tRPC procedures live at `/api/trpc/<router>.<procedure>`.
- **Frontend** on `http://127.0.0.1:5173`. Vite proxies `/api` to the
  backend so same-origin fetches work in the browser.
- **Migrations** run automatically on backend startup when
  `NODE_ENV=development` (see `backend/src/index.ts` — calls
  `runMigrations()` from `backend/src/db/migrate.ts`). Safe to re-run:
  the bootstrap uses `CREATE TABLE IF NOT EXISTS`.

## Tech invariants (things I care about)

### Backend

- **Fastify** as the HTTP server. Not Express, not Hono. If a plugin
  you want is Fastify-only, that's fine; if it's Express-only, wrap
  it or find an alternative.
- **tRPC v11** for the API surface. NEVER add REST endpoints as a
  parallel API — either everything is a tRPC procedure, or you have
  a very deliberate reason for the exception (e.g., a webhook
  receiver from a service that only speaks REST). Even then, mount
  it as a separate route, not "the API".
- **Zod** for tRPC input validation. Import from `"zod"`. Every
  mutation should validate its input with `.input(z.object({ ... }))`.
- **Drizzle ORM** for Postgres. NEVER use raw SQL through
  `db.execute(sql\`...\`)` for CRUD — use the query builder
  (`db.select().from(todos)`, `db.insert(todos).values(...)`, etc.).
  Raw SQL is fine for one-off maintenance queries or things Drizzle
  can't express.
- **Migrations live in `backend/migrations/`** — SQL files generated
  by `pnpm db:generate` after schema edits. In dev, the bootstrap
  migration in `backend/src/db/migrate.ts` runs on startup (idempotent
  `CREATE TABLE IF NOT EXISTS`). For real migrations, use drizzle-kit:
  ```
  # After editing backend/src/db/schema.ts:
  pnpm --filter backend db:generate
  # Commits a new SQL file under backend/migrations/. Apply on next boot.
  ```
- **Vertical slice organization.** Every feature gets a file (or a
  folder) under `backend/src/trpc/routers/`: the router, its
  procedures, and any feature-scoped helpers colocated. Import the
  Drizzle table from `../../db/schema.ts`. Register the router in
  `backend/src/trpc/router.ts`'s root aggregation.
- **Never leak Node internals into the tRPC context.** `createContext`
  in `backend/src/trpc/context.ts` should hand procedures a small
  object: `{ db, req, res, user? }`. If a procedure needs Fastify's
  raw reply, ask.

### Frontend

- **React 19** with the React Compiler enabled
  (`babel-plugin-react-compiler`).
- **TanStack Router**, **file-based routes** under `src/routes/`.
  Convention: `foo.tsx` → `/foo`, `foo.$id.tsx` → `/foo/:id`. Route
  tree is auto-generated to `src/routeTree.gen.ts` (gitignored).
- **TanStack Query** for server state. Wired to tRPC via
  `@trpc/react-query`. Use `trpc.<router>.<procedure>.useQuery()` /
  `.useMutation()` in components; never `fetch()` directly.
- **Tailwind 4** via the `@tailwindcss/vite` plugin. Design tokens
  live in `src/index.css` — every color is a CSS variable that
  switches on `.dark` on `<html>`.
- **shadcn/ui** primitives under `src/components/ui/`. Copy-paste
  model — no runtime component library dep. If you need a new
  primitive, copy from shadcn docs and adapt the imports to
  `@/lib/utils`.
- Path alias `@/*` → `src/*`.
- **Type imports from backend** are legal and encouraged. Frontend's
  `package.json` has `"backend": "workspace:*"`; you can
  `import type { AppRouter } from "backend"` (as `src/trpc.ts`
  already does). NEVER do a runtime `import` from `backend` — those
  aren't bundled, only types are.

### Database

- **Postgres 15.** Column and table names use `snake_case` (Postgres
  convention). Drizzle's `pgTable` accepts `snake_case` strings for
  the physical name and lets you use `camelCase` in TypeScript:
  ```typescript
  export const todos = pgTable("todos", {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  });
  ```

## Adding a new feature (walkthrough)

Say the user asks for a "projects" feature.

1. **Schema.** Edit `backend/src/db/schema.ts` — add:
   ```typescript
   export const projects = pgTable("projects", {
     id: serial("id").primaryKey(),
     name: text("name").notNull(),
     createdAt: timestamp("created_at").notNull().defaultNow(),
   });
   export type Project = typeof projects.$inferSelect;
   export type NewProject = typeof projects.$inferInsert;
   ```
2. **Migration.** Run `pnpm --filter backend db:generate` to produce
   a new SQL file in `backend/migrations/`. For dev, that migration
   also gets applied automatically because
   `backend/src/db/migrate.ts` runs the bootstrap `CREATE TABLE IF
   NOT EXISTS` for known-good tables on startup — but for cleanliness
   in a real deployment, use drizzle-kit's migrator.

   For the fastest dev loop (during vibe coding), you can also add
   the projects table to the bootstrap in `migrate.ts` directly so
   the next backend restart picks it up without needing a
   drizzle-kit run. The AI should do this when the user is
   iterating quickly; switch to real migrations before shipping.
3. **Router.** Create `backend/src/trpc/routers/projects.ts`:
   ```typescript
   import { z } from "zod";
   import { desc, eq } from "drizzle-orm";
   import { projects } from "../../db/schema";
   import { router, publicProcedure } from "../trpc";

   export const projectsRouter = router({
     list: publicProcedure.query(async ({ ctx }) => {
       return await ctx.db.select().from(projects).orderBy(desc(projects.createdAt));
     }),
     create: publicProcedure
       .input(z.object({ name: z.string().min(1) }))
       .mutation(async ({ ctx, input }) => {
         const [row] = await ctx.db.insert(projects).values(input).returning();
         return row;
       }),
   });
   ```
4. **Register.** In `backend/src/trpc/router.ts`, add:
   ```typescript
   import { projectsRouter } from "./routers/projects";
   export const appRouter = router({
     todos: todosRouter,
     projects: projectsRouter,   // ← new
   });
   ```
5. **Frontend.** The frontend gets it for free — `trpc.projects.list`
   and `trpc.projects.create` are now typed, autocompletable, and
   ready to use in any component. No frontend code change needed
   for the API surface itself; just add a route/component that
   consumes it:
   ```typescript
   const projects = trpc.projects.list.useQuery();
   ```

Because backend runs under `tsx watch`, saving the router file
picks up the change automatically. The frontend picks up the new
types on the next TS check.

## Bob-provided env vars (visible to hooks and to the app process)

Baseline (always set):
- `BOB_SESSION_ID` — the current session's id.
- `BOB_OWNER_LOGIN` — the GitHub login of the person who booted
  this session.
- `BOB_REPO_URL`, `BOB_REPO_BRANCH` — the checked-out repo.

From `.bob/config.yaml` `env:` block:
- `DATABASE_URL` — Postgres connection string.
- `NODE_ENV` — set to `development` inside Bob.
- `PORT` — backend HTTP port (matches `services.api.port`).
- `VITE_API_ORIGIN` — where the frontend's `/api` proxy targets.

Anything you add to `.bob/config.yaml` under `env:` flows through
automatically; anything under `secrets:` or `variables:` requires
the user to set a value in the launcher UI at
`bob.ai.rfsmart.com/repos/<owner>/<repo>`.

## HMR / long-lived connections

Vite's HMR WebSocket goes through CloudFront which has a 60s
origin-idle timeout. This stack already includes a heartbeat plugin
(`frontend/vite.config.ts`) that pushes a `type: "custom"` HMR
message every 15s to keep the WS warm. Don't remove it. See
DECISIONS #046 in the bob-vm repo.

`tsx watch` doesn't need a similar heartbeat — it's stdio-based,
not WebSocket.

## Testing

The starter has none yet. When you add them, favor `vitest` for
both frontend and backend (it's the closest thing to a
"universal" test runner in this stack). For tRPC procedure tests,
you can call procedures directly:
```typescript
const caller = appRouter.createCaller({ db, req: {} as any, res: {} as any });
const todos = await caller.todos.list();
```

## Deploy target (aspirational)

RF-SMART deploys to AWS with Terraform. This starter has NO
deploy config yet. If they ask you to add one, prefer Terraform
(`terraform/` at the repo root, one module per environment) over
CDK for consistency with the rest of the org. Before
productionizing:

1. **Set `NODE_ENV=production`** in your deploy env. This turns
   off the auto-migrate on startup in `backend/src/index.ts` —
   migrations should run as a separate step in your deploy
   pipeline so a bad migration doesn't take the app down.
2. **Move `DATABASE_URL` out of `.bob/config.yaml`.** It's fine
   for the ephemeral in-VM Postgres but not for anywhere
   reachable from outside the VM.
3. **Build the frontend** with `pnpm --filter frontend build` and
   serve the static `dist/` from CloudFront + S3 (or your CDN of
   choice). The backend can serve it too via Fastify's static
   plugin, but a CDN is faster.
4. **Build the backend** with `pnpm --filter backend build`
   (produces `dist/index.js`) and run with `node dist/index.js`
   in production. `tsx` is only for dev — don't ship it.
