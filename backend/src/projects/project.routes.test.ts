import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { ProjectDto } from "@smartpathy/shared";
import { createApp } from "../app.js";
import { LlmService } from "../llm/llmService.js";
import type { ProjectRepository } from "./project.repository.js";

const llm = new LlmService({ complete: async () => "{}" });

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
  return createApp({ llm, projectRepository: repository });
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
