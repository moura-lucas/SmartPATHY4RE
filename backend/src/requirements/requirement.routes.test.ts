import { testAccount } from "../account/account.fixtures.js";
import { testAuth } from "../auth/auth.fixtures.js";
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
  return createApp({ auth: testAuth, account: testAccount, llm, projectRepository, personaRepository, requirementRepository });
}

beforeEach(() => {
  complete = vi.fn(async () => llmRequirementsResponse());
  projectRepository = {
    create: vi.fn(),
    findById: vi.fn(async (id) => (id === project.id ? project : null)),
    listSummaries: vi.fn(),
    isOwnedBy: vi.fn(async () => true),
    update: vi.fn(),
    remove: vi.fn(),
  };
  personaRepository = fakePersonaRepository([buildPersonaDto()]);
  requirementRepository = {
    replaceAll: vi.fn(async ({ id, projectId }) => buildRequirementDtos(projectId, id)),
    append: vi.fn(async ({ id, projectId }) => ({
      status: "appended" as const,
      requirements: buildRequirementDtos(projectId, id),
    })),
    findByPersonaId: vi.fn(async () => buildRequirementDtos()),
    findById: vi.fn(async (id) => (id === "requirement-1" ? buildRequirementDtos()[0]! : null)),
    applyEdit: vi.fn(async (_id, edit) => ({
      ...buildRequirementDtos()[0]!,
      ...edit,
      edited: true,
    })),
    deleteById: vi.fn(async (id) => id === "requirement-1"),
    isOwnedBy: vi.fn(async () => true),
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

describe("POST /projects/:id/personas/:personaId/generate-more-requirements", () => {
  const url = "/projects/project-1/personas/persona-1/generate-more-requirements";

  it("adds the requirements and returns the full list (AC13.1)", async () => {
    const res = await request(app()).post(url);

    expect(res.status).toBe(201);
    expect(res.body).toEqual(buildRequirementDtos());
    expect(requirementRepository.replaceAll).not.toHaveBeenCalled();
  });

  it("responds 409 when the persona has no requirements yet", async () => {
    requirementRepository.findByPersonaId = vi.fn(async () => []);

    const res = await request(app()).post(url);

    expect(res.status).toBe(409);
    expect(complete).not.toHaveBeenCalled();
  });

  it("responds 409 when the limit was reached", async () => {
    requirementRepository.append = vi.fn(async () => ({ status: "limit_reached" as const }));

    const res = await request(app()).post(url);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/limit/);
  });

  it("responds 404 for a persona outside the project", async () => {
    const res = await request(app()).post(
      "/projects/project-1/personas/other/generate-more-requirements",
    );

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Persona not found." });
  });

  it("responds 404 when the project does not exist", async () => {
    const res = await request(app()).post(
      "/projects/missing/personas/persona-1/generate-more-requirements",
    );

    expect(res.status).toBe(404);
  });

  it("responds 502 and saves nothing when the LLM fails (AC13.4)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    complete = async () => {
      throw new LlmError("Gemini responded with HTTP 503", true);
    };

    const res = await request(app()).post(url);

    expect(res.status).toBe(502);
    expect(requirementRepository.append).not.toHaveBeenCalled();
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

describe("PATCH /requirements/:id", () => {
  const edit = {
    description: "New text.",
    moscow: "could",
    priority: "low",
    derivedFrom: ["C1", "P1"],
  };

  it("saves the changes and returns the edited requirement (AC14.1 / AC14.5)", async () => {
    const res = await request(app()).patch("/requirements/requirement-1").send(edit);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ...edit, edited: true, code: "FR1" });
  });

  it("does not change the code or the type (AC14.1)", async () => {
    await request(app())
      .patch("/requirements/requirement-1")
      .send({ ...edit, code: "FR99", type: "non_functional" });

    expect(requirementRepository.applyEdit).toHaveBeenCalledWith("requirement-1", edit);
  });

  it("responds 400 for an empty description (AC14.2)", async () => {
    const res = await request(app())
      .patch("/requirements/requirement-1")
      .send({ ...edit, description: "  " });

    expect(res.status).toBe(400);
    expect(res.body.fieldErrors.description).toEqual(["Description is required"]);
    expect(requirementRepository.applyEdit).not.toHaveBeenCalled();
  });

  it("responds 400 without derived from codes (AC14.2)", async () => {
    const res = await request(app())
      .patch("/requirements/requirement-1")
      .send({ ...edit, derivedFrom: [] });

    expect(res.status).toBe(400);
    expect(res.body.fieldErrors.derivedFrom).toEqual(["Select at least one PATHY code"]);
  });

  it("responds 404 for an unknown requirement", async () => {
    const res = await request(app()).patch("/requirements/missing").send(edit);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Requirement not found." });
  });
});

describe("DELETE /requirements/:id (AC14.3)", () => {
  it("responds 204 when it was deleted", async () => {
    const res = await request(app()).delete("/requirements/requirement-1");

    expect(res.status).toBe(204);
    expect(requirementRepository.deleteById).toHaveBeenCalledWith("requirement-1");
  });

  it("responds 404 for an unknown requirement", async () => {
    const res = await request(app()).delete("/requirements/missing");

    expect(res.status).toBe(404);
  });
});

describe("another user's requirement (AC18.4)", () => {
  beforeEach(() => {
    requirementRepository.isOwnedBy = vi.fn(async () => false);
  });

  it("responds 404 to an edit, changing nothing", async () => {
    const res = await request(app()).patch("/requirements/requirement-1").send({
      description: "x",
      moscow: "must",
      priority: "low",
      derivedFrom: ["C1"],
    });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Requirement not found." });
    expect(requirementRepository.applyEdit).not.toHaveBeenCalled();
  });

  it("responds 404 to a deletion, changing nothing", async () => {
    const res = await request(app()).delete("/requirements/requirement-1");

    expect(res.status).toBe(404);
    expect(requirementRepository.deleteById).not.toHaveBeenCalled();
  });
});
