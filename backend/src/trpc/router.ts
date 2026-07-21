import { router } from "./trpc.js";
import { todosRouter } from "./routers/todos.js";

/**
 * Root router. Register new feature routers here — one entry per
 * vertical slice under `src/trpc/routers/`.
 *
 * When you add a router (say `projectsRouter` in `routers/projects.ts`):
 *
 *   import { projectsRouter } from "./routers/projects.js";
 *   export const appRouter = router({
 *     todos: todosRouter,
 *     projects: projectsRouter,
 *   });
 *
 * The frontend picks it up automatically via the `AppRouter` type
 * export below — `trpc.projects.list.useQuery()` becomes typed and
 * autocompletable with zero frontend code changes.
 */
export const appRouter = router({
  todos: todosRouter,
});

/**
 * Exported for the frontend to consume via
 * `import type { AppRouter } from "backend"`. The frontend workspace
 * declares `"backend": "workspace:*"` in its package.json; the
 * `types` field in `backend/package.json` points at this file.
 */
export type AppRouter = typeof appRouter;
