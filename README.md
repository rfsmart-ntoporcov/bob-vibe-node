# bob-template-node-pg-react

Bob's Node/tRPC greenfield template — **Fastify + tRPC v11 + Drizzle ORM + Postgres 15 + React 19 + Vite + Tailwind 4 + TanStack Router**.

This is a [GitHub template repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template). To create a new project from it, use Bob's **New Project** button — Bob will call GitHub's generate-from-template endpoint on your behalf and land you in a fresh repo on your personal account, ready to boot.

## What ships in a new project

- `backend/` — Fastify server exposing tRPC procedures.
  - `src/index.ts` — server entrypoint (Fastify + tRPC plugin + auto-migrate on startup).
  - `src/db/{schema.ts, index.ts, migrate.ts}` — Drizzle schema, client, and idempotent bootstrap migration.
  - `src/trpc/{trpc.ts, context.ts, router.ts, routers/todos.ts}` — tRPC initialization, request context, root router, and a Todos router as a working demo.
- `frontend/` — React 19 with the React Compiler, Vite 7, TypeScript, Tailwind 4, TanStack Router, shadcn-style primitives.
  - Same RF-SMART design tokens as `bob-template-dotnet-pg-react` (light + dark mode, oklch color space).
  - tRPC client + `@trpc/react-query` — the frontend imports `AppRouter` types directly from `backend` (via pnpm workspaces), so every procedure is autocomplete + type-safe end-to-end.
  - Working Todos demo with dark-mode toggle.
- Root — pnpm workspace glue (`package.json`, `pnpm-workspace.yaml`, `.npmrc`).
- `.bob/` — dev-env wiring for Bob MicroVMs.
  - `config.yaml` — declares `install`, `start`, `port`, `services`, `env`, `persistence`, and the `post_clone` hook.
  - `hooks/post_clone.sh` — installs Postgres 15 via `dnf` (Bob's Firecracker MicroVMs don't allow nested virt, so no Docker), initializes the data directory, and starts Postgres. Node 22 is already in Bob's base image.
  - `AGENTS.md` + `README.md` — playbook + reference docs for AI assistants.

## Why tRPC?

For greenfield / vibe-coded work, tRPC hits a nice sweet spot: it gives you API structure (typed procedures, input validation via Zod, query/mutation semantics) without the ceremony of REST + a separate schema + a separate client. The frontend imports procedure types directly from the backend — rename a router, mistype an input, whatever, and TypeScript flags it in the frontend at compile time. No OpenAPI codegen step, no manual `fetch` wrappers, no schema drift.

The trade-off: tRPC is a Node + TypeScript world. If your team primarily writes .NET or Python, use `bob-template-dotnet-pg-react` (or file a request for a Python one).

## Editing this template

Every push to `main` here changes what future greenfields look like. Existing repos already created from this template are NOT retroactively updated — GitHub's generate-from-template is a one-shot copy at creation time.

A few conventions worth respecting when editing:

1. **Backend is called `backend`** in `pnpm-workspace.yaml` and referenced as `"backend": "workspace:*"` from frontend's `package.json`. The frontend imports its types via `import type { AppRouter } from "backend"`. Don't rename it without updating both sides.
2. **The database is named `app`** (created in `post_clone.sh`, referenced in the `DATABASE_URL` env var in `.bob/config.yaml`).
3. **The `post_clone` hook is idempotent.** Bob's VMs are ephemeral (recreated per session), so this hook runs on every boot. Keep it fast and don't assume prior state.
4. **`.bob/config.yaml` MUST validate against Bob's schema.** IDEs pick up the schema via the `# yaml-language-server: $schema=…` directive at the top of the file.
5. **Docker is not available in the Bob VM.** Postgres and any other daemons must be installed natively via `dnf` in the `post_clone` hook.
6. **Auto-migrate on startup** is fine for dev but should be turned off before productionizing. The pattern is called out in `backend/src/index.ts` with a `NODE_ENV` check.

## Testing changes

To smoke-test a change without going through Bob's New Project UI:

1. Push your changes to a branch here.
2. Open GitHub → **Use this template** → **Create a new repository** (in your personal account).
3. Boot a Bob session on the newly-created repo and confirm it makes it to the `ready` boot stage.
4. Delete the throwaway repo.

### Disposable Bob preview

After this repository's **Bob preview** workflow is on `main`, open
**Actions → Bob preview → Run workflow**, select the branch to test, and choose:

- `launch` to boot that branch's exact commit in Bob stage;
- `terminate` to stop the preview for that branch.

This pilot intentionally keeps one `manual` preview per repository. Launching a
different branch replaces the previous preview; `terminate` stops whichever
branch is currently assigned to that slot.

The run publishes an authenticated preview URL and an **Edit with Bob** link.
The latter creates a separate personal Bob session at the preview commit; it
does not modify or transfer the repository-owned preview VM.

The Action is vendored under `.github/actions/bob-environment` because GitHub
does not allow a private action in an organization-owned repository to be used
directly by a personal-account repository. Its header records the upstream Bob
commit to use when refreshing it.

## Related repos

- [`bob-vm`](https://github.com/rfs-internal/bob-vm) — the launcher that generates new repos from this template.
- [`bob-template-dotnet-pg-react`](https://github.com/rfs-internal/bob-template-dotnet-pg-react) — the .NET flavor of the same idea.
