import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config. Used by `pnpm db:generate` to emit SQL migration
 * files under `./migrations/` from the schema definitions in
 * `./src/db/schema.ts`.
 *
 * For the fastest dev loop you can also use `pnpm db:push` to sync
 * the schema straight to the DB without generating a migration file
 * (see drizzle-kit docs). The template's default bootstrap in
 * `src/db/migrate.ts` runs on backend startup in Development mode
 * and covers the initial todos table without any drizzle-kit setup —
 * migrations are only needed once you diverge from the initial
 * schema.
 */
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app",
  },
});
