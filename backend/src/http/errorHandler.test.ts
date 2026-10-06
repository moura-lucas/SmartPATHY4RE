import { it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { errorHandler } from "./errorHandler.js";
import { LlmUnavailableError } from "../llm/errors.js";

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
