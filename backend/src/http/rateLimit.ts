import type { GenerationErrorBody } from "@smartpathy/shared";
import { rateLimit } from "express-rate-limit";

export const GENERATION_RATE_LIMIT = { windowMs: 10 * 60 * 1000, limit: 10 };

const LIMIT_REACHED: GenerationErrorBody = {
  code: "ai_rate_limited",
  error: "The AI usage limit has been reached. Please wait a while before trying again.",
};

/** Per-IP limit on the routes that call the LLM, protecting the Gemini quota. */
export function generationRateLimit(options = GENERATION_RATE_LIMIT) {
  return rateLimit({
    ...options,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: LIMIT_REACHED,
  });
}
