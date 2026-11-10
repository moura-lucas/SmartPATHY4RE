import { testAccount } from "../account/account.fixtures.js";
import { TEST_USER, testAuth } from "../auth/auth.fixtures.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { ProjectDto, ProjectSummaryDto } from "@smartpathy/shared";
import { createApp } from "../app.js";
import { LlmService } from "../llm/llmService.js";
import type { PersonaRepository } from "../personas/persona.repository.js";
import type { RequirementRepository } from "../requirements/requirement.repository.js";
import type { ProjectRepository } from "./project.repository.js";

const llm = new LlmService({ complete: async () => "{}" });
const personaRepository: PersonaRepository = {
  create: vi.fn(),
  listByProjectId: vi.fn(),
  findById: vi.fn(),
  updateSections: vi.fn(),
  deleteUnlessLast: vi.fn(),
};
const requirementRepository: RequirementRepository = {
  replaceAll: vi.fn(),
  append: vi.fn(),
  findById: vi.fn(),
  applyEdit: vi.fn(),
  deleteById: vi.fn(),
  isOwnedBy: vi.fn(),
  findByPersonaId: vi.fn(),
};

const valid = {
  name: "  Clinic App  ",
  domain: "Healthcare",
  description: "App for nurses to manage patient records.",
  techExperienceLevel: "low",
};

const stored: ProjectDto = {
  id: "project-1",
  name: "Clinic App",
  domain: "Healthcare",
  description: "App for nurses to manage patient records.",
  additionalContext: null,
  personaName: null,
  personaAge: null,
  techExperienceLevel: "low",
  createdAt: "2026-10-09T12:00:00.000Z",
};

let repository: ProjectRepository;

function app() {
  return createApp({
    auth: testAuth, account: testAccount,
    llm,
    projectRepository: repository,
    personaRepository,
    requirementRepository,
  });
}

beforeEach(() => {
  repository = {
    create: vi.fn(async (input) => ({
      ...stored,
      ...input,
      additionalContext: input.additionalContext ?? null,
      personaName: input.personaName ?? null,
      personaAge: input.personaAge ?? null,
    })),
    findById: vi.fn(async (id) => (id === stored.id ? stored : null)),
    update: vi.fn(async (id, input) =>
      id === stored.id
        ? { ...stored, ...input, additionalContext: input.additionalContext ?? null }
        : null,
    ),
    remove: vi.fn(async (id) => id === stored.id),
    isOwnedBy: vi.fn(async () => true),
    listSummaries: vi.fn(async (): Promise<ProjectSummaryDto[]> => [
      { ...stored, hasPersona: true, personasCount: 2, requirementsCount: 3, stage: "requirements_generated" },
    ]),
  };
});

describe("POST /projects", () => {
  it("creates the project with trimmed data and responds 201 (AC2.6)", async () => {
    const res = await request(app()).post("/projects").send(valid);

    expect(res.status).toBe(201);
    expect(res.headers.location).toBe("/projects/project-1");
    expect(res.body).toMatchObject({
      id: "project-1",
      name: "Clinic App",
      createdAt: stored.createdAt,
    });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Clinic App" }),
      TEST_USER.id,
    );
  });

  it("accepts blank optional fields (AC2.3)", async () => {
    const res = await request(app())
      .post("/projects")
      .send({ ...valid, additionalContext: "", personaName: "   " });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ additionalContext: null, personaName: null });
  });

  it("persists the optional persona data when provided", async () => {
    const res = await request(app())
      .post("/projects")
      .send({ ...valid, additionalContext: "Night shifts", personaName: "Ana", personaAge: 34 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      additionalContext: "Night shifts",
      personaName: "Ana",
      personaAge: 34,
    });
  });

  it("responds 400 listing every missing mandatory field when there is no body (AC2.5)", async () => {
    const res = await request(app()).post("/projects");

    expect(res.status).toBe(400);
    expect(Object.keys(res.body.fieldErrors).sort()).toEqual([
      "description",
      "domain",
      "name",
      "techExperienceLevel",
    ]);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("responds 400 with the invalid fields and saves nothing (AC2.5)", async () => {
    const res = await request(app())
      .post("/projects")
      .send({
        ...valid,
        name: "a".repeat(121),
        personaAge: 0,
        techExperienceLevel: "expert",
      });

    expect(res.status).toBe(400);
    expect(Object.keys(res.body.fieldErrors).sort()).toEqual([
      "name",
      "personaAge",
      "techExperienceLevel",
    ]);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("responds 400 for a malformed JSON body", async () => {
    const res = await request(app())
      .post("/projects")
      .set("Content-Type", "application/json")
      .send("{");

    expect(res.status).toBe(400);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("responds 500 without internal details when persistence fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    repository.create = vi.fn(async () => {
      throw new Error("connect ECONNREFUSED db:3306");
    });

    const res = await request(app()).post("/projects").send(valid);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Internal server error." });
  });
});

describe("GET /projects/:id", () => {
  it("returns the project", async () => {
    const res = await request(app()).get("/projects/project-1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(stored);
  });

  it("responds 404 when the project does not exist", async () => {
    const res = await request(app()).get("/projects/missing");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Project not found." });
  });
});

describe("GET /projects", () => {
  it("returns the project summaries for the dashboard (AC8.1)", async () => {
    const res = await request(app()).get("/projects");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { ...stored, hasPersona: true, personasCount: 2, requirementsCount: 3, stage: "requirements_generated" },
    ]);
    expect(repository.listSummaries).toHaveBeenCalledWith(TEST_USER.id);
  });
});

describe("PATCH /projects/:id (AC17.1)", () => {
  const edit = {
    name: "New name",
    domain: "Education",
    description: "A new description.",
    additionalContext: "",
  };

  it("saves the changes and returns the project", async () => {
    const res = await request(app()).patch("/projects/project-1").send(edit);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      name: "New name",
      domain: "Education",
      additionalContext: null,
    });
  });

  it("does not change the persona data", async () => {
    await request(app())
      .patch("/projects/project-1")
      .send({ ...edit, personaName: "Ana", techExperienceLevel: "high" });

    const [, saved] = vi.mocked(repository.update).mock.calls[0]!;
    expect(saved).not.toHaveProperty("personaName");
    expect(saved).not.toHaveProperty("techExperienceLevel");
  });

  it("responds 400 with the field errors for invalid data", async () => {
    const res = await request(app()).patch("/projects/project-1").send({ ...edit, name: " " });

    expect(res.status).toBe(400);
    expect(res.body.fieldErrors.name).toEqual(["Project name is required"]);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("responds 404 when the project does not exist", async () => {
    const res = await request(app()).patch("/projects/missing").send(edit);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Project not found." });
  });
});

describe("DELETE /projects/:id (AC17.4 / AC17.5)", () => {
  it("responds 204 when the project was removed", async () => {
    const res = await request(app()).delete("/projects/project-1");

    expect(res.status).toBe(204);
    expect(repository.remove).toHaveBeenCalledWith("project-1");
  });

  it("responds 404 when the project does not exist", async () => {
    const res = await request(app()).delete("/projects/missing");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Project not found." });
  });
});

describe("another user's project (AC18.4)", () => {
  beforeEach(() => {
    repository.isOwnedBy = vi.fn(async () => false);
  });

  it.each([
    ["get", "/projects/project-1"],
    ["patch", "/projects/project-1"],
    ["delete", "/projects/project-1"],
    ["get", "/projects/project-1/personas"],
    ["post", "/projects/project-1/personas"],
    ["put", "/projects/project-1/personas/persona-1"],
    ["delete", "/projects/project-1/personas/persona-1"],
    ["post", "/projects/project-1/generate-persona"],
    ["get", "/projects/project-1/personas/persona-1/requirements"],
    ["post", "/projects/project-1/personas/persona-1/generate-requirements"],
    ["get", "/projects/project-1/export?format=json"],
  ] as const)("%s %s responds 404, as if it did not exist", async (method, url) => {
    const res = await request(app())[method](url).send({});

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Project not found." });
    expect(repository.isOwnedBy).toHaveBeenCalledWith("project-1", TEST_USER.id);
    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.remove).not.toHaveBeenCalled();
  });
});
