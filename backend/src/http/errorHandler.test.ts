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
