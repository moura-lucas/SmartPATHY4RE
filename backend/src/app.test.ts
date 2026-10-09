import { it, expect } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";
import { LlmService } from "./llm/llmService.js";
import type { ProjectRepository } from "./projects/project.repository.js";

const llm = new LlmService({ complete: async () => "{}" });
const projectRepository: ProjectRepository = {
  create: async () => {
    throw new Error("not used");
  },
  findById: async () => null,
};

it("GET /health responds with ok", async () => {
  const res = await request(createApp({ llm, projectRepository })).get("/health");
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ status: "ok" });
});

it("unknown routes do not expose internal details", async () => {
  const res = await request(createApp({ llm, projectRepository })).get("/does-not-exist");
  expect(res.status).toBe(404);
  expect(res.text).not.toMatch(/stack|at .*\.ts/i);
});
