import { sql } from "drizzle-orm";

import { db } from "./index.js";

/**
 * Bootstrap migrations for the template's initial schema. Idempotent
 * `CREATE TABLE IF NOT EXISTS` so it's safe to re-run every backend
 * boot in Development.
 *
 * As the schema grows, prefer generating real migrations with
 * `pnpm db:generate` (drizzle-kit) — this bootstrap is meant to give
 * you a working table on first boot without any tooling ceremony.
 * If you add tables here for the same reason, keep the SQL literal
 * strictly idempotent (`IF NOT EXISTS`, `IF EXISTS`, etc.).
 *
 * In production this function should NOT run; deploy-time migrations
 * belong in your CI/CD pipeline. See the `NODE_ENV === "development"`
 * guard in `src/index.ts`.
 */
export async function runMigrations(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      done BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
}
