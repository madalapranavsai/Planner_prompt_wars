import "server-only";
import { z } from "zod";

const ServerEnvSchema = z.object({
  GEMINI_API_KEY: z.string().trim().min(1).optional(),
  GEMINI_MODEL: z.string().trim().min(1).default("gemini-3.8-flash"),
  AI_PROVIDER: z.enum(["gemini", "mock"]).default("gemini"),
  AI_DAILY_CALL_CAP: z.coerce.number().int().min(1).default(500),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

let cachedEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = ServerEnvSchema.safeParse({
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
    AI_PROVIDER: process.env.AI_PROVIDER,
    AI_DAILY_CALL_CAP: process.env.AI_DAILY_CALL_CAP,
  });

  if (!result.success) {
    const errors = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
    throw new Error(`Invalid server environment variables: ${errors}`);
  }

  cachedEnv = result.data;
  return cachedEnv;
}
