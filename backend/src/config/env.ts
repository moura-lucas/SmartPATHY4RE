import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().trim().min(1),
  GEMINI_API_KEY: z.string().trim().min(1),
  LLM_MODEL: z.string().min(1).default("gemini-3.5-flash"),
  // 32 random bytes in hex (openssl rand -hex 32): encrypts the users' Gemini keys.
  KEY_ENCRYPTION_SECRET: z.string().regex(/^[0-9a-fA-F]{64}$/),
  PORT: z.coerce.number().int().positive().default(4000),
  // The only origin the browser may call the API from with credentials.
  CORS_ORIGIN: z.string().trim().min(1).default("http://localhost:3000"),
  // AC18.2: on in production, off over plain HTTP in development.
  COOKIE_SECURE: z.stringbool().optional(),
  // Registering with this email claims the projects created before accounts existed.
  LEGACY_OWNER_EMAIL: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
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
