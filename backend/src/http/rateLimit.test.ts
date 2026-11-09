import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { generationRateLimit } from "./rateLimit.js";

function app(limit: number) {
  const app = express();
  app.post("/generate", generationRateLimit({ windowMs: 60_000, limit }), (_req, res) => {
    res.status(201).json({ ok: true });
  });
  return app;
}

describe("generationRateLimit", () => {
  it("allows requests up to the limit", async () => {
    const server = app(2);

    expect((await request(server).post("/generate")).status).toBe(201);
    expect((await request(server).post("/generate")).status).toBe(201);
  });

  it("responds 429 with the usage limit code above the limit", async () => {
    const server = app(1);
    await request(server).post("/generate");

    const res = await request(server).post("/generate");

    expect(res.status).toBe(429);
    expect(res.body).toEqual({ code: "ai_rate_limited", error: expect.any(String) });
  });

  it("counts per account, not per IP", async () => {
    const server = express();
    server.use((req, _res, next) => {
      req.user = { id: String(req.headers["x-user"]), name: "x", email: "x@x.com" };
      next();
    });
    server.post("/generate", generationRateLimit({ windowMs: 60_000, limit: 1 }), (_req, res) => {
      res.status(201).json({ ok: true });
    });

    expect((await request(server).post("/generate").set("x-user", "a")).status).toBe(201);
    expect((await request(server).post("/generate").set("x-user", "a")).status).toBe(429);
    expect((await request(server).post("/generate").set("x-user", "b")).status).toBe(201);
  });
});
