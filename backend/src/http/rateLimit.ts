import type { GenerationErrorBody } from "@smartpathy/shared";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import type { Request } from "express";

export const GENERATION_RATE_LIMIT = { windowMs: 10 * 60 * 1000, limit: 10 };

const LIMIT_REACHED: GenerationErrorBody = {
  code: "ai_rate_limited",
  error: "The AI usage limit has been reached. Please wait a while before trying again.",
};

const clientIp = (req: Request) => ipKeyGenerator(req.ip ?? "");

/**
 * Per-account limit on the routes that call the LLM, protecting the Gemini quota.
 * By account because a whole class may share one IP.
 */
export function generationRateLimit(options = GENERATION_RATE_LIMIT) {
  return rateLimit({
    ...options,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: LIMIT_REACHED,
    keyGenerator: (req) => req.user?.id ?? clientIp(req),
  });
}

const TOO_MANY_ATTEMPTS = { error: "Too many attempts. Please try again later." };
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

/** Every registration and login attempt from an IP. Generous, since a class shares one IP. */
export function authAttemptRateLimit(limit = 100) {
  return rateLimit({
    windowMs: ATTEMPT_WINDOW_MS,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: TOO_MANY_ATTEMPTS,
    keyGenerator: clientIp,
  });
}

/** Password guessing against one account from one IP. */
export function loginRateLimit(limit = 10) {
  return rateLimit({
    windowMs: ATTEMPT_WINDOW_MS,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: TOO_MANY_ATTEMPTS,
    keyGenerator: (req) => {
      const email: unknown = req.body?.email;
      return `${clientIp(req)}:${typeof email === "string" ? email.trim().toLowerCase() : ""}`;
    },
  });
}
