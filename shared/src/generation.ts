/**
 * Contract of the AI generation failures (US11): the backend sends the cause
 * in `code`, and the frontend turns it into a plain-language message (AC11.3).
 */

export const GENERATION_ERROR_CODES = [
  "ai_unavailable",
  "ai_rate_limited",
  "ai_invalid_response",
] as const;
export type GenerationErrorCode = (typeof GENERATION_ERROR_CODES)[number];

/** Body of the 502 response when a generation fails after all attempts. */
export interface GenerationErrorBody {
  error: string;
  code: GenerationErrorCode;
}

export function isGenerationErrorCode(value: unknown): value is GenerationErrorCode {
  return (GENERATION_ERROR_CODES as readonly unknown[]).includes(value);
}
