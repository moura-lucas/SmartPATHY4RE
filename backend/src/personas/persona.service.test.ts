import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PersonaDto } from "@smartpathy/shared";
import { LlmError, LlmUnavailableError } from "../llm/errors.js";
import { LlmService } from "../llm/llmService.js";
import type { LlmProvider } from "../llm/provider.js";
import type { ProjectRepository } from "../projects/project.repository.js";
import { buildPersonaDto, buildSections, llmResponse, project } from "./persona.fixtures.js";
import type { PersonaRepository } from "./persona.repository.js";
import { createPersonaService } from "./persona.service.js";

let provider: { complete: ReturnType<typeof vi.fn<LlmProvider["complete"]>> };
let projects: ProjectRepository;
let personas: PersonaRepository;

function service() {
  // No retries, so the failure tests do not wait for the backoff.
  const llm = new LlmService(provider, { maxRetries: 0, baseDelayMs: 0 });
  return createPersonaService({ llm, projects, personas });
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  provider = { complete: vi.fn<LlmProvider["complete"]>(async () => llmResponse()) };
  projects = {
    create: vi.fn(),
    findById: vi.fn(async (id) => (id === project.id ? project : null)),
  };
  personas = {
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
    updateSections: vi.fn(
      async (_projectId, sections): Promise<PersonaDto> => ({ ...buildPersonaDto(), ...sections }),
    ),
  };
});

describe("PersonaService.generate", () => {
  it("sends the prompt built from the project to the LLM (AC3.1)", async () => {
    await service().generate(project.id);

    const [request] = provider.complete.mock.calls[0]!;
    expect(request.prompt).toContain(project.name);
    expect(request.prompt).toContain(project.domain);
    expect(request.prompt).toContain(project.description);
  });

  it("uses exactly the name, age and level provided by the user (AC3.3)", async () => {
    projects.findById = vi.fn(async () => ({
      ...project,
      personaName: "Ana",
      personaAge: 34,
      techExperienceLevel: "high" as const,
    }));

    const persona = await service().generate(project.id);

    expect(persona).toMatchObject({ name: "Ana", age: 34, techExperienceLevel: "high" });
  });

  it("keeps the name and age suggested by the LLM when omitted (AC3.4)", async () => {
    const persona = await service().generate(project.id);

    expect(persona).toMatchObject({ name: "Maria", age: 50, techExperienceLevel: "low" });
  });

  it("saves the persona linked to the project and returns it (AC3.6)", async () => {
    const persona = await service().generate(project.id);

    expect(personas.upsert).toHaveBeenCalledWith(
      project.id,
      expect.objectContaining({ name: "Maria" }),
    );
    expect(persona).toMatchObject({ id: "persona-1", projectId: project.id });
  });

  it("returns null without calling the LLM when the project does not exist", async () => {
    await expect(service().generate("missing")).resolves.toBeNull();
    expect(provider.complete).not.toHaveBeenCalled();
  });

  it("does not save a response with an empty PATHY field (AC3.2)", async () => {
    provider.complete.mockResolvedValue(
      llmResponse({ problems: { routineProblems: "", howApplicationCanHelp: "x" } }),
    );

    await expect(service().generate(project.id)).rejects.toBeInstanceOf(LlmUnavailableError);
    expect(personas.upsert).not.toHaveBeenCalled();
  });

  it("saves nothing when the LLM fails (AC3.8)", async () => {
    provider.complete.mockRejectedValue(new LlmError("HTTP 401", false));

    await expect(service().generate(project.id)).rejects.toBeInstanceOf(LlmUnavailableError);
    expect(personas.upsert).not.toHaveBeenCalled();
  });
});

describe("PersonaService.find", () => {
  it("returns the project's stored persona (AC4.1)", async () => {
    personas.findByProjectId = vi.fn(async () => buildPersonaDto());

    await expect(service().find(project.id)).resolves.toEqual({ persona: buildPersonaDto() });
    expect(personas.findByProjectId).toHaveBeenCalledWith(project.id);
  });

  it("returns a null persona when the project has none yet (AC4.6)", async () => {
    await expect(service().find(project.id)).resolves.toEqual({ persona: null });
  });

  it("returns null when the project does not exist (AC4.7)", async () => {
    await expect(service().find("missing")).resolves.toBeNull();
    expect(personas.findByProjectId).not.toHaveBeenCalled();
  });
});

describe("PersonaService.updateSections", () => {
  it("saves the sections of an existing persona (AC7.3)", async () => {
    personas.findByProjectId = vi.fn(async () => buildPersonaDto());
    const sections = buildSections();
    sections.who.profession = "Head nurse";

    const result = await service().updateSections(project.id, sections);

    expect(personas.updateSections).toHaveBeenCalledWith(project.id, sections);
    expect(result).toEqual({
      status: "updated",
      persona: expect.objectContaining({ who: sections.who, name: "Maria" }),
    });
  });

  it("reports a missing project or persona without saving", async () => {
    await expect(service().updateSections("missing", buildSections())).resolves.toEqual({
      status: "project_not_found",
    });
    await expect(service().updateSections(project.id, buildSections())).resolves.toEqual({
      status: "persona_missing",
    });
    expect(personas.updateSections).not.toHaveBeenCalled();
  });
});
