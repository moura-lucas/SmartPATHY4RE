import { it, expect } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";
import { LlmService } from "./llm/llmService.js";
import type { PersonaRepository } from "./personas/persona.repository.js";
import type { ProjectRepository } from "./projects/project.repository.js";
import type { RequirementRepository } from "./requirements/requirement.repository.js";

const llm = new LlmService({ complete: async () => "{}" });
const projectRepository: ProjectRepository = {
  create: async () => {
    throw new Error("not used");
  },
  findById: async () => null,
  listSummaries: async () => [],
};
const personaRepository: PersonaRepository = {
  upsert: async () => {
    throw new Error("not used");
  },
  findByProjectId: async () => null,
  updateSections: async () => {
    throw new Error("not used");
  },
};
const requirementRepository: RequirementRepository = {
  replaceAll: async () => {
    throw new Error("not used");
  },
  findByProjectId: async () => [],
};
const deps = { llm, projectRepository, personaRepository, requirementRepository };

it("GET /health responds with ok", async () => {
  const res = await request(createApp(deps)).get("/health");
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ status: "ok" });
});

it("unknown routes do not expose internal details", async () => {
  const res = await request(createApp(deps)).get("/does-not-exist");
  expect(res.status).toBe(404);
  expect(res.text).not.toMatch(/stack|at .*\.ts/i);
});
