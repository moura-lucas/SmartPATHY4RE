import { z } from "zod";

/** Generations per day, per account, for users without their own Gemini key. */
export const SHARED_KEY_DAILY_LIMIT = 5;

export const geminiKeySchema = z.object({
  apiKey: z
    .string({ error: "Enter your Gemini API key" })
    .trim()
    .min(1, "Enter your Gemini API key")
    .max(200, "This does not look like a Gemini API key")
    // Google changes the format of its keys, so only what cannot be sent in a header is refused.
    .regex(/^[\x21-\x7e]*$/, "This does not look like a Gemini API key"),
});
export type GeminiKeyInput = z.infer<typeof geminiKeySchema>;

export type GeminiKeyValidation =
  | { success: true; data: GeminiKeyInput }
  | { success: false; fieldErrors: { apiKey?: string[] } };

/** Used by the frontend (before saving) and the backend (PUT /account/gemini-key). */
export function validateGeminiKey(input: unknown): GeminiKeyValidation {
  const result = geminiKeySchema.safeParse(input ?? {});
  if (result.success) return { success: true, data: result.data };
  return { success: false, fieldErrors: z.flattenError(result.error).fieldErrors };
}

/** The key itself never leaves the backend: only whether it exists and how it ends. */
export interface GeminiKeyStatusDto {
  hasKey: boolean;
  last4: string | null;
  dailyLimit: number;
  usedToday: number;
}
