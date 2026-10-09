import type { ErrorRequestHandler } from "express";
import { LlmUnavailableError } from "../llm/errors.js";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Body that express.json() could not parse.
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: "Malformed JSON body." });
    return;
  }
  if (err instanceof LlmUnavailableError) {
    res.status(502).json({
      error:
        "It was not possible to generate the content with AI at the moment. Please try again in a few moments.",
    });
    return;
  }
  console.error(
    "[http] unhandled error:",
    err instanceof Error ? err.message : String(err),
  );
  res.status(500).json({ error: "Internal server error." }); // never err.message nor err.stack
};
