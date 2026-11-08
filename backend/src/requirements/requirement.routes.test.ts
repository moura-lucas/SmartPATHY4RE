import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { LlmError } from "../llm/errors.js";
import { LlmService } from "../llm/llmService.js";
import type { LlmProvider } from "../llm/provider.js";
import { buildPersonaDto, fakePersonaRepository, project } from "../personas/persona.fixtures.js";
import type { PersonaRepository } from "../personas/persona.repository.js";
import type { ProjectRepository } from "../projects/project.repository.js";
import { buildRequirementDtos, llmRequirementsResponse } from "./requirement.fixtures.js";
import type { RequirementRepository } from "./requirement.repository.js";

let complete: LlmProvider["complete"];
let projectRepository: ProjectRepository;
let personaRepository: PersonaRepository;
let requirementRepository: RequirementRepository;

function app() {
  const llm = new LlmService({ complete }, { maxRetries: 0, baseDelayMs: 0 });
  return createApp({ llm, projectRepository, personaRepository, requirementRepository });
}

beforeEach(() => {
  complete = vi.fn(async () => llmRequirementsResponse());
  projectRepository = {
    create: vi.fn(),
    findById: vi.fn(async (id) => (id === project.id ? project : null)),
    listSummaries: vi.fn(),
  };
  personaRepository = fakePersonaRepository([buildPersonaDto()]);
  requirementRepository = {
    replaceAll: vi.fn(async ({ id, projectId }) => buildRequirementDtos(projectId, id)),
    findByPersonaId: vi.fn(async () => buildRequirementDtos()),
  };
});

describe("POST /projects/:id/personas/:personaId/generate-requirements", () => {
  const url = "/projects/project-1/personas/persona-1/generate-requirements";

  it("generates, saves and returns the requirements (AC5.7)", async () => {
    const res = await request(app()).post(url);

    expect(res.status).toBe(201);
    expect(res.headers.location).toBe("/projects/project-1/requirements?persona=persona-1");
    expect(res.body).toEqual(buildRequirementDtos());
  });

  it("responds 409 without calling the LLM when there is no persona (AC5.1)", async () => {
    personaRepository = fakePersonaRepository();

    const res = await request(app()).post(url);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/persona/i);
    expect(complete).not.toHaveBeenCalled();
  });

  it("responds 404 when the persona is not in the project", async () => {
    const res = await request(app()).post(
      "/projects/project-1/personas/other/generate-requirements",
    );

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Persona not found." });
    expect(complete).not.toHaveBeenCalled();
  });

  it("responds 404 when the project does not exist", async () => {
    const res = await request(app()).post("/projects/missing/personas/persona-1/generate-requirements");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Project not found." });
  });

  it("responds 502 without internal details when the LLM fails (AC5.10)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    complete = async () => {
      throw new LlmError("Gemini responded with HTTP 401", false);
    };

    const res = await request(app()).post(url);

    expect(res.status).toBe(502);
    expect(res.text).not.toMatch(/401|Gemini/);
    expect(requirementRepository.replaceAll).not.toHaveBeenCalled();
  });
});

describe("GET /projects/:id/personas/:personaId/requirements", () => {
  const url = "/projects/project-1/personas/persona-1/requirements";

  it("returns the persona's requirements (AC12.4)", async () => {
    const res = await request(app()).get(url);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(buildRequirementDtos());
  });

  it("returns an empty list when nothing was generated yet", async () => {
    requirementRepository.findByPersonaId = vi.fn(async () => []);

    const res = await request(app()).get(url);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("responds 404 when the project does not exist", async () => {
    const res = await request(app()).get("/projects/missing/personas/persona-1/requirements");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Project not found." });
  });

  it("responds 404 when the persona is not in the project", async () => {
    const res = await request(app()).get("/projects/project-1/personas/other/requirements");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Persona not found." });
  });
});
