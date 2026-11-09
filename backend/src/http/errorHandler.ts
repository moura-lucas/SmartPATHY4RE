import type { ErrorRequestHandler } from "express";
import type { GenerationErrorBody } from "@smartpathy/shared";
import { LlmUnavailableError, type LlmFailureKind } from "../llm/errors.js";

const GENERATION_ERRORS: Record<LlmFailureKind, GenerationErrorBody> = {
  unavailable: {
    code: "ai_unavailable",
    error: "The AI service is unavailable at the moment. Please try again in a few moments.",
  },
  rate_limited: {
    code: "ai_rate_limited",
    error: "The AI usage limit has been reached. Please wait a while before trying again.",
  },
  invalid_response: {
    code: "ai_invalid_response",
    error: "The AI returned an invalid response. Please try again.",
  },
  invalid_key: {
    code: "ai_invalid_key",
    error: "Your Gemini key was not accepted. Please check it in Settings.",
  },
  key_rate_limited: {
    code: "ai_key_limit",
    error: "Your Gemini key has reached its usage limit.",
  },
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Body that express.json() could not parse.
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: "Malformed JSON body." });
    return;
  }
  if (err instanceof LlmUnavailableError) {
    // AC11.3: always 502; the cause goes in `code`, never the technical details.
    res.status(502).json(GENERATION_ERRORS[err.kind]);
    return;
  }
  console.error(
    "[http] unhandled error:",
    err instanceof Error ? err.message : String(err),
  );
  res.status(500).json({ error: "Internal server error." }); // never err.message nor err.stack
};
