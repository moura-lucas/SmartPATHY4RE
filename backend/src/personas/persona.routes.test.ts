import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { PATHY_FIELDS, type PersonaDto } from "@smartpathy/shared";
import { createApp } from "../app.js";
import { LlmError } from "../llm/errors.js";
import { LlmService } from "../llm/llmService.js";
import type { LlmProvider } from "../llm/provider.js";
import type { ProjectRepository } from "../projects/project.repository.js";
import { buildPersonaDto, llmResponse, project } from "./persona.fixtures.js";
import type { RequirementRepository } from "../requirements/requirement.repository.js";
import type { PersonaRepository } from "./persona.repository.js";

let complete: LlmProvider["complete"];
let projectRepository: ProjectRepository;
let personaRepository: PersonaRepository;

function app() {
  const llm = new LlmService({ complete }, { maxRetries: 0, baseDelayMs: 0 });
  const requirementRepository: RequirementRepository = {
    replaceAll: vi.fn(),
    findByProjectId: vi.fn(),
  };
  return createApp({ llm, projectRepository, personaRepository, requirementRepository });
}

beforeEach(() => {
  complete = async () => llmResponse();
  projectRepository = {
    create: vi.fn(),
    findById: vi.fn(async (id) => (id === project.id ? project : null)),
  };
  personaRepository = {
    upsert: vi.fn(
      async (projectId, persona): Promise<PersonaDto> => ({
        ...persona,
        id: "persona-1",
        projectId,
        createdAt: "2026-10-12T12:00:00.000Z",
        updatedAt: "2026-10-12T12:00:00.000Z",
      }),
    ),
    findByProjectId: vi.fn(async () => null),
  };
});

describe("POST /projects/:id/generate-persona", () => {
  it("generates, saves and returns the full persona (AC3.2 / AC3.6)", async () => {
    const res = await request(app()).post("/projects/project-1/generate-persona");

    expect(res.status).toBe(201);
    expect(res.headers.location).toBe("/projects/project-1/persona");
    expect(res.body).toMatchObject({
      id: "persona-1",
      projectId: "project-1",
      techExperienceLevel: "low",
    });
    for (const { section, field } of PATHY_FIELDS) {
      expect(res.body[section][field]).toEqual(expect.any(String));
    }
  });

  it("responds 404 when the project does not exist", async () => {
    const res = await request(app()).post("/projects/missing/generate-persona");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Project not found." });
    expect(personaRepository.upsert).not.toHaveBeenCalled();
  });

  it("responds 502 without internal details when the LLM fails (AC3.8)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    complete = async () => {
      throw new LlmError("Gemini responded with HTTP 401", false);
    };

    const res = await request(app()).post("/projects/project-1/generate-persona");

    expect(res.status).toBe(502);
    expect(res.text).not.toMatch(/401|Gemini/);
    expect(personaRepository.upsert).not.toHaveBeenCalled();
  });
});

describe("GET /projects/:id/persona", () => {
  it("returns the stored persona with all 17 PATHY fields (AC4.1 / AC4.5)", async () => {
    personaRepository.findByProjectId = vi.fn(async () => buildPersonaDto());

    const res = await request(app()).get("/projects/project-1/persona");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(buildPersonaDto());
    for (const { section, field } of PATHY_FIELDS) {
      expect(res.body[section][field]).toEqual(expect.any(String));
    }
  });

  it("responds 404 when the project has no persona yet (AC4.6)", async () => {
    const res = await request(app()).get("/projects/project-1/persona");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Persona not found." });
  });

  it("responds 404 when the project does not exist (AC4.7)", async () => {
    const res = await request(app()).get("/projects/missing/persona");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Project not found." });
    expect(personaRepository.findByProjectId).not.toHaveBeenCalled();
  });
});
