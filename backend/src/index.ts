import cors from "@fastify/cors";
import { fastifyTRPCPlugin, type FastifyTRPCPluginOptions } from "@trpc/server/adapters/fastify";
import Fastify from "fastify";

import { runMigrations } from "./db/migrate.js";
import { env } from "./env.js";
import { createContext } from "./trpc/context.js";
import { appRouter, type AppRouter } from "./trpc/router.js";

/**
 * Server entrypoint — Fastify + tRPC plugin.
 *
 * In dev (Bob's default), auto-migrates on startup so the todos
 * table exists before the first request. In production, migrations
 * should run as a separate deploy step; the `NODE_ENV` guard here
 * turns the auto-migrate off. See `.bob/AGENTS.md` for the
 * conventions around growing the schema.
 */

const server = Fastify({
  logger: {
    level: env.NODE_ENV === "production" ? "info" : "debug",
  },
  // Reasonable defaults for a small API. Bump if you need to accept
  // larger payloads (e.g., file uploads).
  bodyLimit: 1_048_576, // 1 MB
});

// Permissive CORS for the Vite dev server. Vite proxies /api → this
// server so cross-origin is rare, but in case the frontend is served
// from a different origin during dev (raw `vite build --preview`,
// etc.) we allow all. In production, lock this down to your real
// frontend origin.
await server.register(cors, { origin: true, credentials: true });

// Mount tRPC at /api/trpc. The frontend's httpBatchLink points at
// this exact path.
await server.register(fastifyTRPCPlugin, {
  prefix: "/api/trpc",
  trpcOptions: {
    router: appRouter,
    createContext,
    onError({ path, error }) {
      // Surface unexpected errors in the console. Expected errors
      // (validation failures, NOT_FOUND, etc.) are still logged by
      // Fastify at info-level via tRPC's default handler.
      if (error.code === "INTERNAL_SERVER_ERROR") {
        server.log.error({ path, error }, "tRPC procedure crashed");
      }
    },
  } satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"],
});

// Lightweight health check for the AI's smoke tests + for the
// launcher's port-probe. `/api/trpc/*` is tRPC's concern; anything
// else under /api/ is fair game for regular Fastify routes if you
// need them (webhooks, uploads, etc.).
server.get("/api/health", async () => ({
  status: "ok",
  service: "backend",
  env: env.NODE_ENV,
}));

// ---- Bootstrap migrations (dev only) --------------------------------------
if (env.NODE_ENV === "development") {
  try {
    await runMigrations();
    server.log.info("Bootstrap migrations applied");
  } catch (err) {
    server.log.error({ err }, "Bootstrap migrations failed — is Postgres reachable?");
    // Fatal — Fastify hasn't started listening yet, so exiting is
    // the right call. Bob's boot splash will surface the error.
    process.exit(1);
  }
}

// ---- Listen ---------------------------------------------------------------
// 0.0.0.0 so Bob's Caddy can reach us from inside the VM.
try {
  await server.listen({ host: "0.0.0.0", port: env.PORT });
} catch (err) {
  server.log.error({ err }, "Failed to start server");
  process.exit(1);
}
