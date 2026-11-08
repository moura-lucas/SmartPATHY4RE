import { beforeEach, describe, expect, it, vi } from "vitest";
import { personaSchema, requirementSchema } from "@smartpathy/shared";
import type { PersonaRepository } from "../personas/persona.repository.js";
import { buildPersona, buildPersonaDto, project, fakePersonaRepository } from "../personas/persona.fixtures.js";
import type { ProjectRepository } from "../projects/project.repository.js";
import { buildRequirementDtos, buildRequirements } from "../requirements/requirement.fixtures.js";
import type { RequirementRepository } from "../requirements/requirement.repository.js";
import { createExportService } from "./export.service.js";
import { EXPORTED_AT } from "./export.fixtures.js";

let projects: ProjectRepository;
let personas: PersonaRepository;
let requirements: RequirementRepository;

function service() {
  return createExportService({
    projects,
    personas,
    requirements,
    now: () => new Date(EXPORTED_AT),
  });
}

beforeEach(() => {
  projects = {
    create: vi.fn(),
    findById: vi.fn(async (id) => (id === project.id ? project : null)),
    listSummaries: vi.fn(),
  };
  personas = fakePersonaRepository([buildPersonaDto()]);
  requirements = {
    replaceAll: vi.fn(),
    append: vi.fn(),
    findByPersonaId: vi.fn(async () => buildRequirementDtos()),
  };
});

describe("ExportService.load", () => {
  it("gathers project, persona, requirements and the export date (AC9.2)", async () => {
    const result = await service().load(project.id);

    expect(result).toEqual({
      status: "ready",
      data: {
        exportedAt: EXPORTED_AT,
        project: {
          name: project.name,
          domain: project.domain,
          description: project.description,
          additionalContext: null,
        },
        persona: buildPersona(),
        requirements: buildRequirements(),
      },
    });
  });

  it("exports only what the shared schemas describe (AC9.3)", async () => {
    const result = await service().load(project.id);
    if (result.status !== "ready") throw new Error(result.status);

    expect(result.data.persona).not.toHaveProperty("id");
    expect(result.data.persona).not.toHaveProperty("projectId");
    expect(personaSchema.safeParse(result.data.persona).success).toBe(true);
    for (const req of result.data.requirements) {
      expect(req).not.toHaveProperty("id");
      expect(requirementSchema.safeParse(req).success).toBe(true);
    }
  });

  it("exports a persona without requirements", async () => {
    requirements.findByPersonaId = vi.fn(async () => []);
    const result = await service().load(project.id);
    expect(result).toMatchObject({ status: "ready", data: { requirements: [] } });
  });

  it("reports a missing persona or project (AC9.5 / AC10.5)", async () => {
    personas = fakePersonaRepository();
    await expect(service().load(project.id)).resolves.toEqual({ status: "persona_missing" });
    await expect(service().load("missing")).resolves.toEqual({ status: "project_not_found" });
  });

  it("exports the selected persona and only its requirements (AC12.4)", async () => {
    const other = { ...buildPersonaDto(), id: "persona-2", name: "Bruno" };
    personas = fakePersonaRepository([buildPersonaDto(), other]);

    const result = await service().load(project.id, "persona-2");

    expect(result).toMatchObject({ status: "ready", data: { persona: { name: "Bruno" } } });
    expect(requirements.findByPersonaId).toHaveBeenCalledWith("persona-2");
  });

  it("exports the first persona when none is selected", async () => {
    const other = { ...buildPersonaDto(), id: "persona-2", name: "Bruno" };
    personas = fakePersonaRepository([buildPersonaDto(), other]);

    await expect(service().load(project.id)).resolves.toMatchObject({
      data: { persona: { name: "Maria" } },
    });
  });

  it("reports a selected persona that is not in the project", async () => {
    await expect(service().load(project.id, "other")).resolves.toEqual({
      status: "persona_not_found",
    });
  });
});
