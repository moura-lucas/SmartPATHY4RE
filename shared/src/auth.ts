import { z } from "zod";

/** Name of the httpOnly cookie that holds the session token (AC18.2). */
export const SESSION_COOKIE = "smartpathy_session";

/** AC18.5: a session ends after this long without activity. */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const PASSWORD_MIN = 8;
/** bcrypt only uses the first 72 bytes, so longer passwords are refused. */
const PASSWORD_MAX_BYTES = 72;

function utf8Length(value: string): number {
  let bytes = 0;
  for (const char of value) {
    const code = char.codePointAt(0)!;
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  return bytes;
}

const email = z
  .string({ error: "Email is required" })
  .trim()
  .toLowerCase()
  .max(191, "Email must be at most 191 characters")
  .pipe(z.email({ error: "Enter a valid email address" }));

/** AC18.1 */
export const registerSchema = z.object({
  name: z
    .string({ error: "Name is required" })
    .trim()
    .min(1, "Name is required")
    .max(120, "Name must be at most 120 characters"),
  email,
  password: z
    .string({ error: "Password is required" })
    .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`)
    .refine((value) => utf8Length(value) <= PASSWORD_MAX_BYTES, {
      message: `Password must be at most ${PASSWORD_MAX_BYTES} bytes`,
    }),
});
export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterFieldErrors = Partial<Record<keyof RegisterInput, string[]>>;

export type RegisterValidation =
  | { success: true; data: RegisterInput }
  | { success: false; fieldErrors: RegisterFieldErrors };

/** Used by the frontend (before submission) and the backend (POST /auth/register). */
export function validateRegister(input: unknown): RegisterValidation {
  const result = registerSchema.safeParse(input ?? {});
  if (result.success) return { success: true, data: result.data };
  return { success: false, fieldErrors: z.flattenError(result.error).fieldErrors };
}

/** AC18.2: only checks the shape; the credentials are verified by the backend. */
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** The authenticated user, as returned by the API. Never includes the password hash. */
export interface UserDto {
  id: string;
  name: string;
  email: string;
}
