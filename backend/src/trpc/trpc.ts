import { initTRPC } from "@trpc/server";

import type { Context } from "./context.js";

/**
 * tRPC init. `superjson` isn't used here to keep the dependency
 * surface small — the demo procedures only pass primitives + dates
 * (dates get serialized as ISO strings via JSON, which the frontend
 * parses back). If you need Date/Map/Set/BigInt round-tripping,
 * install `superjson` and set it as the `transformer` here.
 *
 * Note: `initTRPC.context<Context>().create()` gives us both the
 * router builder and procedure factories. Every route in
 * `src/trpc/routers/` uses these.
 */
const t = initTRPC.context<Context>().create();

/** Compose one or more procedure sets into a router. */
export const router = t.router;

/** Base procedure — no auth. Extend with middleware for authenticated variants. */
export const publicProcedure = t.procedure;

/**
 * If/when you add auth, define a `protectedProcedure` here like:
 *
 * ```ts
 * export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
 *   if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
 *   return next({ ctx: { ...ctx, user: ctx.user } });
 * });
 * ```
 */
