import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Todos — the demo entity. Small on purpose so users don't have much
 * to delete before their real feature ships. If you're adding a new
 * feature, add its table here and its router under `src/trpc/routers/`.
 *
 * Column-name convention: `snake_case` at the DB level (matches
 * Postgres conventions), `camelCase` in TypeScript via Drizzle's
 * mapping. E.g. `created_at` in the DB, `createdAt` in code.
 */
export const todos = pgTable("todos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;
