import { it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { errorHandler } from "./errorHandler.js";
import { LlmError, LlmUnavailableError, type LlmFailureKind } from "../llm/errors.js";

it("responds with a 502 status, a friendly message, and no internal details.", async () => {
  const app = express();
  app.get("/boom", async () => {
    throw new LlmUnavailableError({
      cause: new Error("AIzaSECRET prompt: ..."),
    });
  });
  app.use(errorHandler);

  const res = await request(app).get("/boom");
  expect(res.status).toBe(502);
  expect(res.body.code).toBe("ai_unavailable");
  expect(res.body.error).toMatch(/try again/i);
  expect(JSON.stringify(res.body)).not.toMatch(
    /stack|AIza|prompt|LlmUnavailable/i,
  );
});

it("responds with a 500 status and a generic message for unexpected errors.", async () => {
  const app = express();
  app.get("/boom", async () => {
    throw new Error("internal detail: AIzaSECRET");
  });
  app.use(errorHandler);

  const res = await request(app).get("/boom");
  expect(res.status).toBe(500);
  expect(res.body).toEqual({ error: "Internal server error." });
});

it("responds with a 400 status when the JSON body is malformed.", async () => {
  const app = express();
  app.use(express.json());
  app.post("/echo", (req, res) => {
    res.json(req.body);
  });
  app.use(errorHandler);

  const res = await request(app)
    .post("/echo")
    .set("Content-Type", "application/json")
    .send("{");
  expect(res.status).toBe(400);
  expect(res.body).toEqual({ error: "Malformed JSON body." });
});

it.each<[LlmFailureKind, string]>([
  ["unavailable", "ai_unavailable"],
  ["rate_limited", "ai_rate_limited"],
  ["invalid_response", "ai_invalid_response"],
  ["invalid_key", "ai_invalid_key"],
  ["key_rate_limited", "ai_key_limit"],
])("responds 502 with code %s → %s and a plain-language message (AC11.3)", async (kind, code) => {
  const app = express();
  app.get("/boom", async () => {
    throw new LlmUnavailableError({
      cause: new LlmError("Gemini responded with HTTP 429", false, { kind }),
    });
  });
  app.use(errorHandler);

  const res = await request(app).get("/boom");
  expect(res.status).toBe(502);
  expect(res.body).toEqual({ code, error: expect.any(String) });
  expect(res.body.error).not.toMatch(/responded|HTTP|429|JSON|schema/i);
});
