import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { PATHY_FIELDS } from "@smartpathy/shared";
import { createApp } from "../app.js";
import { GENERATION_RATE_LIMIT } from "../http/rateLimit.js";
import { LlmError } from "../llm/errors.js";
import { LlmService } from "../llm/llmService.js";
import type { LlmProvider } from "../llm/provider.js";
import type { ProjectRepository } from "../projects/project.repository.js";
import type { RequirementRepository } from "../requirements/requirement.repository.js";
import {
  buildPersonaDto,
  buildSections,
  fakePersonaRepository,
  llmResponse,
  project,
} from "./persona.fixtures.js";
import type { PersonaRepository } from "./persona.repository.js";

let complete: LlmProvider["complete"];
let projectRepository: ProjectRepository;
let personaRepository: PersonaRepository;

function app() {
  const llm = new LlmService({ complete }, { maxRetries: 0, baseDelayMs: 0 });
  const requirementRepository: RequirementRepository = {
    replaceAll: vi.fn(),
    append: vi.fn(),
    findByPersonaId: vi.fn(),
  };
  return createApp({ llm, projectRepository, personaRepository, requirementRepository });
}

beforeEach(() => {
  complete = async () => llmResponse();
  projectRepository = {
    create: vi.fn(),
    findById: vi.fn(async (id) => (id === project.id ? project : null)),
    listSummaries: vi.fn(),
  };
  personaRepository = fakePersonaRepository();
});

describe("POST /projects/:id/generate-persona", () => {
  it("generates, saves and returns the full persona (AC3.2 / AC3.6)", async () => {
    const res = await request(app()).post("/projects/project-1/generate-persona");

    expect(res.status).toBe(201);
    expect(res.headers.location).toBe("/projects/project-1/persona?persona=persona-new");
    expect(res.body).toMatchObject({
      id: "persona-new",
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
    expect(personaRepository.create).not.toHaveBeenCalled();
  });

  it("responds 409 when the project already has a persona", async () => {
    personaRepository = fakePersonaRepository([buildPersonaDto()]);

    const res = await request(app()).post("/projects/project-1/generate-persona");

    expect(res.status).toBe(409);
    expect(personaRepository.create).not.toHaveBeenCalled();
  });

  it("responds 502 without internal details when the LLM fails (AC3.8)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    complete = async () => {
      throw new LlmError("Gemini responded with HTTP 401", false);
    };

    const res = await request(app()).post("/projects/project-1/generate-persona");

    expect(res.status).toBe(502);
    expect(res.text).not.toMatch(/401|Gemini/);
    expect(personaRepository.create).not.toHaveBeenCalled();
  });
});

describe("generation rate limit", () => {
  it("stops calling the LLM after the limit, counting all generation routes", async () => {
    const llmCall = vi.fn(async () => llmResponse());
    complete = llmCall;
    const server = app();

    for (let i = 0; i < GENERATION_RATE_LIMIT.limit - 1; i++) {
      await request(server).post("/projects/project-1/generate-persona");
    }
    await request(server).post("/projects/project-1/personas/other/generate-requirements");
    const res = await request(server).post("/projects/project-1/generate-persona");

    expect(res.status).toBe(429);
    expect(res.body.code).toBe("ai_rate_limited");
    expect(llmCall).toHaveBeenCalledTimes(GENERATION_RATE_LIMIT.limit - 1);
  });
});

describe("GET /projects/:id/personas", () => {
  it("returns the stored personas with all 17 PATHY fields (AC4.1 / AC4.5 / AC12.3)", async () => {
    personaRepository = fakePersonaRepository([buildPersonaDto()]);

    const res = await request(app()).get("/projects/project-1/personas");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([buildPersonaDto()]);
    for (const { section, field } of PATHY_FIELDS) {
      expect(res.body[0][section][field]).toEqual(expect.any(String));
    }
  });

  it("returns an empty list when the project has no persona yet (AC4.6)", async () => {
    const res = await request(app()).get("/projects/project-1/personas");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("responds 404 when the project does not exist (AC4.7)", async () => {
    const res = await request(app()).get("/projects/missing/personas");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Project not found." });
  });
});

describe("POST /projects/:id/personas", () => {
  beforeEach(() => {
    personaRepository = fakePersonaRepository([buildPersonaDto()]);
  });

  it("adds a persona with the chosen profile (AC12.1 / AC12.2)", async () => {
    const res = await request(app())
      .post("/projects/project-1/personas")
      .send({ techExperienceLevel: "high", personaName: "Bruno", personaAge: 28 });

    expect(res.status).toBe(201);
    expect(res.headers.location).toBe("/projects/project-1/persona?persona=persona-new");
    expect(res.body).toMatchObject({ name: "Bruno", age: 28, techExperienceLevel: "high" });
  });

  it("responds 400 without a valid experience level (AC12.1)", async () => {
    const res = await request(app()).post("/projects/project-1/personas").send({ personaName: "X" });

    expect(res.status).toBe(400);
    expect(res.body.fieldErrors).toHaveProperty("techExperienceLevel");
    expect(personaRepository.create).not.toHaveBeenCalled();
  });

  it("responds 409 when the project has no persona yet (AC12.1)", async () => {
    personaRepository = fakePersonaRepository();

    const res = await request(app())
      .post("/projects/project-1/personas")
      .send({ techExperienceLevel: "low" });

    expect(res.status).toBe(409);
  });

  it("responds 404 when the project does not exist", async () => {
    const res = await request(app())
      .post("/projects/missing/personas")
      .send({ techExperienceLevel: "low" });

    expect(res.status).toBe(404);
  });
});

describe("PUT /projects/:id/personas/:personaId", () => {
  const url = "/projects/project-1/personas/persona-1";

  beforeEach(() => {
    personaRepository = fakePersonaRepository([buildPersonaDto()]);
  });

  it("saves the edited sections and returns the updated persona (AC7.3)", async () => {
    const sections = buildSections();
    sections.context.routineTasks = "Night shifts in the emergency room.";

    const res = await request(app()).put(url).send(sections);

    expect(res.status).toBe(200);
    expect(personaRepository.updateSections).toHaveBeenCalledWith("persona-1", sections);
    expect(res.body.context.routineTasks).toBe("Night shifts in the emergency room.");
    expect(res.body.updatedAt).toBe("2026-10-19T12:00:00.000Z");
  });

  it("responds 400 with the empty fields, using the shared schema (AC7.2)", async () => {
    const sections = buildSections();
    sections.who.profession = "   ";

    const res = await request(app()).put(url).send(sections);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Invalid persona data.",
      fieldErrors: { "who.profession": ["This field is required."] },
    });
    expect(personaRepository.updateSections).not.toHaveBeenCalled();
  });

  it("responds 400 when a section is missing", async () => {
    const { problems: _omit, ...sections } = buildSections();

    const res = await request(app()).put(url).send(sections);

    expect(res.status).toBe(400);
    expect(res.body.fieldErrors).toHaveProperty("problems");
  });

  it("responds 404 when the persona is not in the project", async () => {
    const res = await request(app())
      .put("/projects/project-1/personas/other")
      .send(buildSections());

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Persona not found." });
  });

  it("responds 404 when the project does not exist", async () => {
    const res = await request(app())
      .put("/projects/missing/personas/persona-1")
      .send(buildSections());

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Project not found." });
    expect(personaRepository.updateSections).not.toHaveBeenCalled();
  });
});

describe("DELETE /projects/:id/personas/:personaId (AC12.5)", () => {
  const url = "/projects/project-1/personas/persona-1";

  it("responds 204 when the persona was deleted", async () => {
    const res = await request(app()).delete(url);

    expect(res.status).toBe(204);
    expect(personaRepository.deleteUnlessLast).toHaveBeenCalledWith("project-1", "persona-1");
  });

  it("responds 409 for the last persona", async () => {
    personaRepository.deleteUnlessLast = vi.fn(async () => "last_persona" as const);

    const res = await request(app()).delete(url);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/at least one persona/);
  });

  it("responds 404 when the persona is not in the project", async () => {
    personaRepository.deleteUnlessLast = vi.fn(async () => "persona_not_found" as const);

    const res = await request(app()).delete(url);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Persona not found." });
  });

  it("responds 404 when the project does not exist", async () => {
    const res = await request(app()).delete("/projects/missing/personas/persona-1");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Project not found." });
  });
});
