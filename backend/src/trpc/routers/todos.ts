import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { todos } from "../../db/schema.js";
import { publicProcedure, router } from "../trpc.js";

/**
 * Todos — the demo feature slice. The layout here is the pattern
 * every subsequent feature router should follow:
 *
 * 1. Import the Drizzle table from `../../db/schema.js`.
 * 2. Define input schemas with Zod at the top of the file so they
 *    read like a mini spec for the router.
 * 3. Group procedures by verb: `list`, `create`, `update`, `remove`.
 * 4. Return the affected row (or a list of them) from mutations so
 *    the frontend can update its cache optimistically if it wants.
 */

const idInput = z.object({ id: z.number().int().positive() });
const createInput = z.object({ title: z.string().min(1).max(500) });
const updateInput = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(500).optional(),
  done: z.boolean().optional(),
});

export const todosRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.select().from(todos).orderBy(desc(todos.createdAt));
  }),

  create: publicProcedure.input(createInput).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .insert(todos)
      .values({ title: input.title.trim() })
      .returning();
    return row;
  }),

  update: publicProcedure.input(updateInput).mutation(async ({ ctx, input }) => {
    const patch: Partial<{ title: string; done: boolean }> = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.done !== undefined) patch.done = input.done;
    if (Object.keys(patch).length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "at least one of `title` or `done` must be provided",
      });
    }
    const [row] = await ctx.db
      .update(todos)
      .set(patch)
      .where(eq(todos.id, input.id))
      .returning();
    if (!row) {
      throw new TRPCError({ code: "NOT_FOUND", message: `todo ${input.id} not found` });
    }
    return row;
  }),

  remove: publicProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .delete(todos)
      .where(eq(todos.id, input.id))
      .returning();
    if (!row) {
      throw new TRPCError({ code: "NOT_FOUND", message: `todo ${input.id} not found` });
    }
    return row;
  }),
});
