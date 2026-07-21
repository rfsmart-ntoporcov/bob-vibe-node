import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "../env.js";
import * as schema from "./schema.js";

/**
 * Postgres.js connection + Drizzle client.
 *
 * `max: 10` caps the connection pool at 10 sockets — plenty for a
 * dev VM, and cheap to raise for production. `onnotice: () => {}`
 * silences Postgres's `NOTICE`-level messages (e.g. "table already
 * exists, skipping") that our idempotent bootstrap trips.
 */
const client = postgres(env.DATABASE_URL, {
  max: 10,
  onnotice: () => {},
});

export const db = drizzle(client, { schema });

export type DB = typeof db;
