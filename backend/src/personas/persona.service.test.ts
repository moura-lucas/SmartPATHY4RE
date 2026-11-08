import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NewPersonaInput, TechExperienceLevel } from "@smartpathy/shared";
import { LlmError, LlmUnavailableError } from "../llm/errors.js";
import { LlmService } from "../llm/llmService.js";
import type { LlmProvider } from "../llm/provider.js";
import type { ProjectRepository } from "../projects/project.repository.js";
import {
  buildPersonaDto,
  buildSections,
  fakePersonaRepository,
  llmResponse,
  project,
} from "./persona.fixtures.js";
import type { PersonaRepository } from "./persona.repository.js";
import { createPersonaService } from "./persona.service.js";

let provider: { complete: ReturnType<typeof vi.fn<LlmProvider["complete"]>> };
let projects: ProjectRepository;
let personas: PersonaRepository;

/** The validated input of a request that only chose the experience level. */
function level(techExperienceLevel: TechExperienceLevel): NewPersonaInput {
  return { techExperienceLevel, personaName: undefined };
}

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
    listSummaries: vi.fn(),
  };
  personas = fakePersonaRepository();
});

describe("PersonaService.generateFirst", () => {
  it("sends the prompt built from the project to the LLM (AC3.1)", async () => {
    await service().generateFirst(project.id);

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

    const result = await service().generateFirst(project.id);

    expect(result).toMatchObject({
      status: "generated",
      persona: { name: "Ana", age: 34, techExperienceLevel: "high" },
    });
  });

  it("keeps the name and age suggested by the LLM when omitted (AC3.4)", async () => {
    const result = await service().generateFirst(project.id);

    expect(result).toMatchObject({
      persona: { name: "Maria", age: 50, techExperienceLevel: "low" },
    });
  });

  it("saves the persona linked to the project and returns it (AC3.6)", async () => {
    const result = await service().generateFirst(project.id);

    expect(personas.create).toHaveBeenCalledWith(
      project.id,
      expect.objectContaining({ name: "Maria" }),
    );
    expect(result).toMatchObject({ persona: { id: "persona-new", projectId: project.id } });
  });

  it("does not call the LLM when the project does not exist", async () => {
    await expect(service().generateFirst("missing")).resolves.toEqual({
      status: "project_not_found",
    });
    expect(provider.complete).not.toHaveBeenCalled();
  });

  it("does not replace an existing persona", async () => {
    personas = fakePersonaRepository([buildPersonaDto()]);

    await expect(service().generateFirst(project.id)).resolves.toEqual({
      status: "already_has_persona",
    });
    expect(provider.complete).not.toHaveBeenCalled();
    expect(personas.create).not.toHaveBeenCalled();
  });

  it("does not save a response with an empty PATHY field (AC3.2)", async () => {
    provider.complete.mockResolvedValue(
      llmResponse({ problems: { routineProblems: "", howApplicationCanHelp: "x" } }),
    );

    await expect(service().generateFirst(project.id)).rejects.toBeInstanceOf(LlmUnavailableError);
    expect(personas.create).not.toHaveBeenCalled();
  });

  it("saves nothing when the LLM fails (AC3.8)", async () => {
    provider.complete.mockRejectedValue(new LlmError("HTTP 401", false));

    await expect(service().generateFirst(project.id)).rejects.toBeInstanceOf(LlmUnavailableError);
    expect(personas.create).not.toHaveBeenCalled();
  });
});

describe("PersonaService.add", () => {
  beforeEach(() => {
    personas = fakePersonaRepository([buildPersonaDto()]);
  });

  it("uses the chosen level, name and age, and the project's context (AC12.1)", async () => {
    const result = await service().add(project.id, {
      techExperienceLevel: "high",
      personaName: "Bruno",
      personaAge: 28,
    });

    const [request] = provider.complete.mock.calls[0]!;
    expect(request.prompt).toContain(project.description);
    expect(request.prompt).toContain("Technology experience level: high");
    expect(result).toMatchObject({
      status: "generated",
      persona: { name: "Bruno", age: 28, techExperienceLevel: "high" },
    });
  });

  it("lets the LLM suggest the name and age when omitted", async () => {
    const result = await service().add(project.id, level("moderate"));

    expect(result).toMatchObject({
      persona: { name: "Maria", age: 50, techExperienceLevel: "moderate" },
    });
  });

  it("does not take the name, age or level stored in the project", async () => {
    projects.findById = vi.fn(async () => ({
      ...project,
      personaName: "Ana",
      personaAge: 34,
      techExperienceLevel: "low" as const,
    }));

    const result = await service().add(project.id, level("high"));

    expect(result).toMatchObject({
      persona: { name: "Maria", age: 50, techExperienceLevel: "high" },
    });
  });

  it("adds without replacing, telling the LLM who already exists (AC12.2)", async () => {
    await service().add(project.id, level("high"));

    expect(personas.create).toHaveBeenCalledTimes(1);
    expect(provider.complete.mock.calls[0]![0].prompt).toContain('personas "Maria"');
  });

  it("requires the project to already have a persona (AC12.1)", async () => {
    personas = fakePersonaRepository();

    await expect(service().add(project.id, level("low"))).resolves.toEqual({
      status: "no_personas",
    });
    expect(provider.complete).not.toHaveBeenCalled();
  });

  it("reports a missing project", async () => {
    await expect(service().add("missing", level("low"))).resolves.toEqual({
      status: "project_not_found",
    });
  });
});

describe("PersonaService.list", () => {
  it("returns the project's personas (AC4.1 / AC12.3)", async () => {
    personas = fakePersonaRepository([buildPersonaDto()]);

    await expect(service().list(project.id)).resolves.toEqual([buildPersonaDto()]);
  });

  it("returns an empty list when the project has none yet (AC4.6)", async () => {
    await expect(service().list(project.id)).resolves.toEqual([]);
  });

  it("returns null when the project does not exist (AC4.7)", async () => {
    await expect(service().list("missing")).resolves.toBeNull();
    expect(personas.listByProjectId).not.toHaveBeenCalled();
  });
});

describe("PersonaService.updateSections", () => {
  it("saves the sections of an existing persona (AC7.3)", async () => {
    personas = fakePersonaRepository([buildPersonaDto()]);
    const sections = buildSections();
    sections.who.profession = "Head nurse";

    const result = await service().updateSections(project.id, "persona-1", sections);

    expect(personas.updateSections).toHaveBeenCalledWith("persona-1", sections);
    expect(result).toEqual({
      status: "updated",
      persona: expect.objectContaining({ who: sections.who, name: "Maria" }),
    });
  });

  it("reports a missing project or persona without saving", async () => {
    await expect(service().updateSections("missing", "persona-1", buildSections())).resolves.toEqual({
      status: "project_not_found",
    });
    await expect(service().updateSections(project.id, "other", buildSections())).resolves.toEqual({
      status: "persona_not_found",
    });
    expect(personas.updateSections).not.toHaveBeenCalled();
  });
});

describe("PersonaService.remove (AC12.5)", () => {
  it.each(["deleted", "last_persona", "persona_not_found"] as const)(
    "reports the repository outcome %s",
    async (outcome) => {
      personas.deleteUnlessLast = vi.fn(async () => outcome);

      await expect(service().remove(project.id, "persona-1")).resolves.toEqual({ status: outcome });
      expect(personas.deleteUnlessLast).toHaveBeenCalledWith(project.id, "persona-1");
    },
  );

  it("reports a missing project", async () => {
    await expect(service().remove("missing", "persona-1")).resolves.toEqual({
      status: "project_not_found",
    });
    expect(personas.deleteUnlessLast).not.toHaveBeenCalled();
  });
});
