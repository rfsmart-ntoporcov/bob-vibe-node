import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "backend";

/**
 * tRPC React hooks bound to the backend's router type. Import
 * `AppRouter` as a type-only import from the `backend` workspace
 * package — nothing at runtime; TypeScript strips it before Vite
 * bundles.
 *
 * Usage in components:
 *
 *   const todos = trpc.todos.list.useQuery();
 *   const create = trpc.todos.create.useMutation({
 *     onSuccess: () => utils.todos.list.invalidate(),
 *   });
 *
 * The type of every procedure, its input, and its output flows from
 * the backend without any codegen step.
 */
export const trpc = createTRPCReact<AppRouter>();
