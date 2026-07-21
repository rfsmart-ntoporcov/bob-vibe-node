import { z } from "zod";

/**
 * Parsed process env. Fail fast on boot if any required var is
 * missing or malformed — much easier to debug than an obscure
 * runtime error later.
 *
 * Bob populates all of these via `.bob/config.yaml`'s `env:` block.
 * Outside Bob you'd typically load a `.env` file (e.g. via `dotenv`)
 * before importing this module; the template doesn't include one
 * because the in-VM Bob flow is the primary target.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().positive().default(5000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
