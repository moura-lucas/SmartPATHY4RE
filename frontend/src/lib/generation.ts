import type { GenerationErrorCode } from "@smartpathy/shared";

/** AC11.3: the cause of the failure in plain language, without technical details. */
export const GENERATION_ERROR_MESSAGES: Record<GenerationErrorCode, string> = {
  ai_unavailable:
    "The AI service is unavailable right now. Please try again in a few moments.",
  ai_rate_limited:
    "The AI usage limit has been reached. Please wait a while before trying again.",
  ai_invalid_response:
    "The AI returned an invalid response. Retrying usually solves it.",
  ai_invalid_key: "Your Gemini key was not accepted. Please check it in Settings.",
  ai_key_limit: "Your Gemini key has reached its usage limit. Please check your plan with Google.",
  ai_daily_limit:
    "You have used all of today's free generations. Add your own Gemini key in Settings to keep going.",
};

export const SERVER_UNREACHABLE_MESSAGE =
  "Could not reach the server. Check your connection and try again.";

/** A failed generation; `code` is null when the cause is not the AI (e.g. 404, 409). */
export class GenerationError extends Error {
  override name = "GenerationError";
  constructor(
    message: string,
    readonly code: GenerationErrorCode | null = null,
  ) {
    super(message);
  }
}
