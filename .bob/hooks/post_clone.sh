#!/bin/bash
# One-time (per-VM) system setup. Runs before .bob/config.yaml's
# `install` step. Idempotent.
#
# Bob's base image ships Node 22 + pnpm, so we don't touch either.
# We do install Postgres 15 natively — Firecracker (Bob's MicroVM
# hypervisor) forbids nested virtualization, so Docker isn't
# available inside the VM.

set -euo pipefail

log() { echo "[bob-template] $*"; }

# ---- PostgreSQL 15 ---------------------------------------------------------
if ! command -v pg_ctl >/dev/null 2>&1; then
  log "Installing PostgreSQL 15…"
  dnf install -y postgresql15-server postgresql15
fi

# ---- Initialize the data dir if it doesn't exist ---------------------------
# /var/lib/pgsql is the conventional location. Everything in the VM is
# ephemeral (DECISIONS #002 in bob-vm) so the data doesn't survive
# termination — migrations re-run on next boot to reproduce the schema.
PGDATA=/var/lib/pgsql/pgdata
if [ ! -f "$PGDATA/PG_VERSION" ]; then
  log "Initializing Postgres data dir at $PGDATA…"
  mkdir -p "$PGDATA"
  chown -R postgres:postgres "$PGDATA"
  chmod 700 "$PGDATA"
  # trust auth for both local socket + TCP host connections. Safe on
  # an ephemeral single-tenant VM that only listens on 127.0.0.1.
  # The DATABASE_URL in .bob/config.yaml still ships a password
  # so productionizing this stack later doesn't require a code change.
  sudo -u postgres /usr/bin/initdb \
    -D "$PGDATA" \
    --auth-local=trust \
    --auth-host=trust \
    --no-locale \
    --encoding=UTF8
fi

# ---- Start Postgres (idempotent — no-op if already running) ---------------
if ! sudo -u postgres /usr/bin/pg_ctl -D "$PGDATA" status >/dev/null 2>&1; then
  log "Starting Postgres…"
  sudo -u postgres /usr/bin/pg_ctl -D "$PGDATA" -l "$PGDATA/logfile" -w start
fi

# ---- Create the database (idempotent) -------------------------------------
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='app'" | grep -q 1; then
  log "Creating database app…"
  sudo -u postgres createdb app
fi

log "System setup complete: node $(node --version), pnpm $(pnpm --version), Postgres on 127.0.0.1:5432, db app."
