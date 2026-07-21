import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";

import { db } from "../db/index.js";

/**
 * Request-scoped context passed to every tRPC procedure.
 *
 * Add auth here when you add auth — e.g. read a session cookie off
 * `req`, look up the user in the DB, attach `user: User | null` to
 * the returned object. Procedures can then narrow with a middleware.
 */
export function createContext({ req, res }: CreateFastifyContextOptions) {
  return {
    db,
    req,
    res,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
