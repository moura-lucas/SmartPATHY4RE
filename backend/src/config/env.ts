import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().trim().min(1),
  GEMINI_API_KEY: z.string().trim().min(1),
  LLM_MODEL: z.string().min(1).default("gemini-3.5-flash"),
  PORT: z.coerce.number().int().positive().default(4000),
});

export type Env = z.infer<typeof EnvSchema>;

export class InvalidEnvError extends Error {
  override name = "InvalidEnvError";
}

// It accepts "source" as a parameter so it can be tested without modifying `process.env`.
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    // Only the variable NAMES are included in the message, never the values.
    const names = [
      ...new Set(result.error.issues.map((i) => i.path.join("."))),
    ];
    throw new InvalidEnvError(
      `Missing or invalid environment variable(s): ${names.join(", ")}. ` +
        `Define them in backend/.env (see backend/.env.example).`,
    );
  }
  return result.data;
}
