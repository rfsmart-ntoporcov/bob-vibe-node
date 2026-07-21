# .bob/README.md

This directory is Bob's configuration for the project. Bob reads
`.bob/config.yaml` on every session boot to know how to install
deps, start your dev server, expose extra services, and merge
runtime env vars.

## Files

| File | Purpose |
|---|---|
| `config.yaml` | The one Bob actually reads. Full schema at [bob.ai.rfsmart.com/schema/config.schema.json](https://bob.ai.rfsmart.com/schema/config.schema.json). |
| `AGENTS.md` | Playbook for AI assistants. Explains the stack conventions in depth. |
| `README.md` | This file. |
| `hooks/post_clone.sh` | Runs before `install`. Installs Postgres 15 via `dnf`, initializes the data dir, starts Postgres, creates the database. |

## What was pre-wired

Because this repo was created from a Bob template, several things
are already set up for you:

- **`post_clone` hook** installs Postgres 15 via `dnf`, initializes
  the data directory, and starts Postgres. Node 22 is already in
  Bob's base image so nothing to install there. Idempotent — safe
  to re-run.
- **Install** does `pnpm install` at the workspace root — installs
  both `backend/` and `frontend/` in one pass.
- **Start** runs the backend (`tsx watch`) on `:5000` and Vite dev
  on `:5173` concurrently.
- **Port 5173** is the primary iframe target (React app in the
  right panel).
- **`api`** is exposed as a sibling service at
  `<sessionId>-api.vm.bob.ai.rfsmart.com` for direct probing (e.g.,
  hitting the tRPC HTTP endpoints from a REST client).
- **`DATABASE_URL`** points at the local Postgres so the backend
  talks to it out of the box.
- **Persistence** is enabled — your working tree is auto-committed
  to a `bob/persistence/*` branch periodically.

## Why no Docker?

Bob's MicroVMs run on Firecracker, which forbids nested
virtualization. So no Docker inside the VM. Postgres gets
installed via `dnf` and started with `pg_ctl` in
`.bob/hooks/post_clone.sh`. Outside Bob you can run Postgres
however you want (Docker locally, RDS in production, etc.) —
`DATABASE_URL` is the only thing that needs to point at the right
place.

## Bob-provided env vars

At session runtime, Bob sets these in the shell that runs your
hooks and your app process:

| Var | Value |
|---|---|
| `BOB_SESSION_ID` | This session's id (e.g., `swift-otter-a1b2`). |
| `BOB_OWNER_LOGIN` | GitHub login of whoever booted the session. |
| `BOB_REPO_URL` | This repo's clone URL. |
| `BOB_REPO_BRANCH` | The branch being worked on. |

Plus whatever you declare in `config.yaml` under `env:`
(baseline values, committed to the repo), `variables:`
(cleartext, per-repo, set in launcher UI), or `secrets:`
(SSM-backed, set in launcher UI).

## Modifying the config

Edit `config.yaml`, commit, push, restart the Bob session. The
launcher will reflect any new `secrets:` / `variables:`
declarations under Settings → Config → Global (or Personal).

If you break the config, Bob will show the error in the boot
splash and let you SSH in via the terminal panel to fix it.
